// The demo evening: who walks in, who waits in the line, who sits where, what they order, and every plate that is
// carved from the spit with its passport. It is worked out from the date alone (seeded), so the app, the panel and
// the website show the same evening without a server. The guests are invented; the menu and prices are Ninja's.

import { CLOSES, OPENS } from './brand';
import { TABLES, tableById, type AreaId, type Table } from './floor';
import { dateKey, minuteOf } from './format';
import { DISHES, dishById, fromSpit, priceOf, type Meat, type Portion } from './menu';
import { between, hash, personName, pick, rng, weighted, type Rng } from './random';
import type { TeamId } from './team';

export type Rank = 'genin' | 'chunin' | 'jonin' | 'kage';

export type OrderLine = { dish: string; meat?: Meat; portion?: Portion; qty: number; iskender?: boolean };

export type Group = {
  id: string;
  /** The guest who leads the group, "Lotte P." */
  name: string;
  size: number;
  /** Minutes after midnight, with seconds as a fraction. */
  arrive: number;
  rank: Rank | null;
  area: AreaId | 'any';
  /** Joined the line with the app instead of at the door. */
  viaApp: boolean;
  seated: number | null;
  table: string | null;
  leave: number | null;
  /** Gave up waiting (minute), or the kitchen closed before a table came free. */
  gaveUp: number | null;
  orderAt: number | null;
  orders: OrderLine[];
  spend: number;
};

export type SpitId = 'rund' | 'kip';

export type Plate = {
  /** The passport number; see `passportNo`. */
  seq: number;
  group: string;
  table: string;
  dish: string;
  meat?: Meat;
  portion: Portion;
  ordered: number;
  carved: number;
  served: number;
  spits: SpitId[];
  /** Kilograms taken off each spit. */
  kg: number;
  carver: TeamId;
  /** Temperature in the slice at the cut, and the crust's state then (0–1). */
  core: number;
  crustIndex: number;
};

export type SpitPlan = { id: SpitId; label: string; kgStart: number; onFire: number };

export type Evening = {
  day: Date;
  key: string;
  groups: Group[];
  plates: Plate[];
  /** When oak went on the fire, minutes after midnight. */
  refuels: number[];
  spits: SpitPlan[];
  /** Number of the first passport of this evening. */
  firstNo: number;
};

/** Groups per minute at the busiest moment, by weekday (0 is Sunday). Saturday is the big night. */
const BUSY: Record<number, number> = { 0: 0.27, 1: 0, 2: 0.17, 3: 0.19, 4: 0.23, 5: 0.29, 6: 0.33 };

/** How busy the door is through the evening, 0–1. */
export function doorCurve(minute: number): number {
  const h = minute / 60;
  if (h < 15 || h > 21.7) return 0;
  if (h < 16.5) return 0.32;
  if (h < 18) return 0.32 + ((h - 16.5) / 1.5) * 0.48;
  if (h < 19) return 0.8 + (h - 18) * 0.2;
  if (h < 20.25) return 1;
  if (h < 21) return 1 - ((h - 20.25) / 0.75) * 0.55;
  return 0.45 - ((h - 21) / 0.7) * 0.4;
}

const SIZE: [number, number][] = [
  [1, 8],
  [2, 42],
  [3, 18],
  [4, 22],
  [5, 6],
  [6, 4],
];

const MAINS: [string, number][] = [
  ['ninja-kebab', 26],
  ['iskender', 24],
  ['durum', 16],
  ['ninja-menu', 10],
  ['platter-rice', 9],
  ['ninja-rolls', 7],
  ['falafel-hummus', 5],
  ['soup', 3],
];
const DIPS = ['yoghurt-dip', 'carrot-dip', 'hummus', 'ezme', 'shepherd-salad'];
const DRINKS: [string, number][] = [
  ['ayran', 18],
  ['cola', 12],
  ['cola-zero', 6],
  ['cay', 14],
  ['stella', 10],
  ['raki', 7],
  ['aperol', 8],
  ['wine-red', 5],
  ['wine-white', 4],
  ['cava', 4],
  ['water-sparkling', 5],
  ['fuze-lemon', 3],
  ['iced-latte', 3],
  ['limonata', 3],
];

const RANKS: [Rank | null, number][] = [
  [null, 54],
  ['genin', 24],
  ['chunin', 14],
  ['jonin', 6],
  ['kage', 2],
];

export const RANK_PRIORITY: Record<Rank, number> = { genin: 0, chunin: 1, jonin: 2, kage: 3 };

/** Kilograms of meat per portion, cooked. */
const PORTION_KG: Record<Portion, number> = { '1x': 0.19, '1,5x': 0.28 };

function shortName(r: Rng): string {
  const [first, ...last] = personName(r, r() < 0.45).split(' ');
  return `${first} ${last.join(' ').charAt(0)}.`;
}

function pickTable(free: Table[], g: Group): Table | null {
  const fits = free.filter((t) => t.seats >= g.size && t.seats <= g.size + 2 && (t.area !== 'fire' || g.size === 1) && (t.area !== 'bar' || g.size <= 2));
  if (!fits.length) return null;
  const wanted = g.area === 'any' ? fits : fits.filter((t) => t.area === g.area);
  const pool = wanted.length ? wanted : fits;
  return [...pool].sort((a, b) => a.seats - b.seats || hash(a.id + g.id) - hash(b.id + g.id))[0];
}

/** Ninja opened in early 2024; the passport numbers count every plate since, at about 135 a night. */
const OPENED = new Date(2024, 0, 26).getTime();

export function firstPassportNo(day: Date): number {
  const days = Math.max(0, Math.floor((day.getTime() - OPENED) / 86400000));
  return 100000 + Math.floor(days * (6 / 7) * 135);
}

const cache = new Map<string, Evening>();

/** The whole evening of `day`: arrivals, line, tables, orders and plates, from opening to closing. */
export function evening(day: Date): Evening {
  const key = dateKey(day);
  const hit = cache.get(key);
  if (hit) return hit;
  const r = rng(`ninja-evening-${key}`);
  const busy = BUSY[day.getDay()] ?? 0.2;

  // Arrivals: a Poisson stream that follows the door curve.
  const groups: Group[] = [];
  for (let m = OPENS; m < CLOSES - 18; m += 1) {
    const lambda = busy * doorCurve(m);
    let n = 0;
    let p = Math.exp(-lambda);
    let u = r();
    while (u > p && n < 4) {
      u -= p;
      n += 1;
      p = (p * lambda) / n;
    }
    for (let i = 0; i < n; i++) {
      const size = weighted(r, SIZE);
      const area: AreaId | 'any' = size === 1 && r() < 0.5 ? 'fire' : size <= 2 && r() < 0.25 ? 'bar' : r() < 0.12 ? 'terrace' : r() < 0.18 ? 'window' : 'any';
      groups.push({
        id: `g${key.replace(/-/g, '')}-${groups.length + 1}`,
        name: shortName(r),
        size,
        arrive: m + r(),
        rank: weighted(r, RANKS),
        area,
        viaApp: r() < 0.42,
        seated: null,
        table: null,
        leave: null,
        gaveUp: null,
        orderAt: null,
        orders: [],
        spend: 0,
      });
    }
  }
  groups.sort((a, b) => a.arrive - b.arrive);

  // Seating, minute by minute: the line is served by rank, then by arrival.
  const busyUntil = new Map<string, number>();
  const waiting: Group[] = [];
  let next = 0;
  for (let m = OPENS; m <= CLOSES; m += 0.5) {
    while (next < groups.length && groups[next].arrive <= m) waiting.push(groups[next++]);
    const free = TABLES.filter((t) => (busyUntil.get(t.id) ?? 0) <= m && (t.area !== 'terrace' || m < 21 * 60));
    waiting.sort((a, b) => (b.rank ? RANK_PRIORITY[b.rank] + 1 : 0) - (a.rank ? RANK_PRIORITY[a.rank] + 1 : 0) || a.arrive - b.arrive);
    for (let i = 0; i < waiting.length; i++) {
      const g = waiting[i];
      // Some give up after a long wait; nobody is seated in the last quarter.
      if (m - g.arrive > 38 + (hash(g.id) % 20) || m > CLOSES - 15) {
        g.gaveUp = m;
        waiting.splice(i--, 1);
        continue;
      }
      const t = pickTable(free, g);
      if (!t) continue;
      free.splice(free.indexOf(t), 1);
      g.seated = Math.max(m, g.arrive);
      g.table = t.id;
      const stay = Math.min(95, 34 + 6 * g.size + between(r, 0, 26));
      g.leave = Math.min(CLOSES + 10, g.seated + stay);
      busyUntil.set(t.id, g.leave + 3);
      waiting.splice(i--, 1);
    }
  }

  // Orders: one main each, dips and lavash to share, drinks.
  for (const g of groups) {
    if (g.seated === null) continue;
    const gr = rng(`order-${g.id}`);
    // Who joined the line with the app often ordered while waiting: the food is there when they sit.
    g.orderAt = g.viaApp && g.seated - g.arrive > 6 && gr() < 0.6 ? g.seated - 3 : g.seated + 2 + gr() * 4;
    const lines: OrderLine[] = [];
    const add = (line: OrderLine) => {
      const same = lines.find((l) => l.dish === line.dish && l.meat === line.meat && l.portion === line.portion);
      if (same) same.qty += line.qty;
      else lines.push(line);
    };
    for (let p = 0; p < g.size; p++) {
      const dish = weighted(gr, MAINS);
      const d = dishById(dish);
      const meat: Meat | undefined = d.meats ? (d.meats.includes('falafel') && gr() < 0.12 ? 'falafel' : weighted(gr, [['beef', 55], ['mix', 26], ['chicken', 19]] as [Meat, number][])) : undefined;
      add({ dish, meat: meat && d.meats?.includes(meat) ? meat : d.meats?.[0], portion: d.price15 && gr() < 0.3 ? '1,5x' : '1x', qty: 1, iskender: dish === 'ninja-menu' && gr() < 0.3 });
      add({ dish: weighted(gr, DRINKS), qty: 1 });
      if (gr() < 0.35) add({ dish: weighted(gr, DRINKS), qty: 1 });
    }
    for (let i = 0; i < Math.ceil(g.size / 2); i++) add({ dish: pick(gr, DIPS), qty: 1 });
    if (gr() < 0.55) add({ dish: 'lavash', qty: 1 });
    if (gr() < 0.45) add({ dish: 'fries', qty: Math.max(1, Math.floor(g.size / 2)) });
    if (gr() < 0.3) add({ dish: 'rice-pudding', qty: Math.max(1, Math.round(g.size * 0.5)) });
    g.orders = lines;
    g.spend = lines.reduce((s, l) => s + priceOf(dishById(l.dish), l.portion, l.iskender) * l.qty, 0);
  }

  // Plates from the spit, in the order they are carved.
  const raw: Omit<Plate, 'seq' | 'core' | 'crustIndex'>[] = [];
  for (const g of groups) {
    if (g.orderAt === null || !g.table) continue;
    const pr = rng(`plates-${g.id}`);
    let k = 0;
    for (const line of g.orders) {
      const d = dishById(line.dish);
      if (!fromSpit(d) || line.meat === 'falafel') continue;
      for (let q = 0; q < line.qty; q++) {
        const carved = g.orderAt + 2.2 + k * 0.55 + pr() * 2.5;
        const portion = line.portion ?? '1x';
        raw.push({
          group: g.id,
          table: g.table,
          dish: line.dish,
          meat: line.meat,
          portion,
          ordered: g.orderAt,
          carved,
          served: carved + (35 + pr() * 55) / 60,
          spits: line.meat === 'chicken' ? ['kip'] : line.meat === 'mix' ? ['rund', 'kip'] : ['rund'],
          kg: PORTION_KG[portion] * (line.dish === 'ninja-rolls' ? 1.3 : 1),
          carver: pr() < 0.82 ? 'baran' : 'deniz',
        });
        k++;
      }
    }
  }
  raw.sort((a, b) => a.carved - b.carved);
  const lastCut: Record<SpitId, number> = { rund: OPENS - 20, kip: OPENS - 20 };
  const plates: Plate[] = raw.map((p, i) => {
    const since = Math.min(...p.spits.map((s) => p.carved - lastCut[s]));
    for (const s of p.spits) lastCut[s] = p.carved;
    const crustIndex = 1 - Math.exp(-Math.max(0, since) / 3.5);
    const jitter = ((hash(`${key}-${i}`) % 1000) / 1000 - 0.5) * 0.8;
    const core = (p.spits.includes('kip') && !p.spits.includes('rund') ? 74.2 : 72.1) + 6.1 * crustIndex + jitter;
    return { ...p, seq: i, core: Math.round(core * 10) / 10, crustIndex };
  });

  // Oak goes on the fire every 20 to 28 minutes from before opening.
  const refuels: number[] = [];
  for (let m = 13 * 60 + 50; m < CLOSES; m += 20 + r() * 8) refuels.push(m);

  const saturday = day.getDay() === 6 || day.getDay() === 5;
  const spits: SpitPlan[] = [
    { id: 'rund', label: 'Rund · kalf · lam', kgStart: saturday ? 42 : 32, onFire: 14 * 60 + 5 },
    { id: 'kip', label: 'Kip', kgStart: saturday ? 24 : 18, onFire: 14 * 60 + 25 },
  ];

  const ev: Evening = { day, key, groups, plates, refuels, spits, firstNo: firstPassportNo(day) };
  if (cache.size > 8) cache.clear();
  cache.set(key, ev);
  return ev;
}

// ------------------------------------------------------------------------------------------------- reading a moment

/** Groups in the line at minute `m`. */
export const lineAt = (ev: Evening, m: number) => ev.groups.filter((g) => g.arrive <= m && (g.seated !== null ? g.seated > m : g.gaveUp === null || g.gaveUp > m));

/** Groups at a table at minute `m`. */
export const seatedAt = (ev: Evening, m: number) => ev.groups.filter((g) => g.seated !== null && g.seated <= m && (g.leave ?? 0) > m);

export function guestsAt(ev: Evening, m: number) {
  const seated = seatedAt(ev, m);
  const line = lineAt(ev, m);
  return {
    seated: seated.reduce((s, g) => s + g.size, 0),
    tables: seated.length,
    line: line.length,
    linePeople: line.reduce((s, g) => s + g.size, 0),
  };
}

/** Minutes a new group of `size` would wait if it joined the line at `m`: the groups ahead, over the pace at which
 * tables free up in the next three quarters of an hour. */
export function waitFor(ev: Evening, m: number, size = 2): number {
  const ahead = lineAt(ev, m).filter((g) => g.size <= size + 2).length;
  const full = seatedAt(ev, m).length >= TABLES.length - 3;
  if (ahead === 0 && !full) return 0;
  const leaving = ev.groups.filter((g) => g.leave !== null && g.leave > m && g.leave <= m + 45).length;
  const rate = Math.max(0.14, leaving / 45);
  return Math.min(60, Math.max(5, Math.round((((ahead + 1) / rate) * 0.8) / 5) * 5));
}

/** The line's expected wait through the rest of the evening, in steps of 15 minutes, and the calmest moment. */
export function waitForecast(ev: Evening, m: number) {
  const steps: { minute: number; wait: number; occupancy: number }[] = [];
  const seats = TABLES.reduce((s, t) => s + t.seats, 0);
  for (let t = Math.max(OPENS, Math.ceil(m / 15) * 15); t <= CLOSES - 30; t += 15) {
    steps.push({ minute: t, wait: waitFor(ev, t), occupancy: guestsAt(ev, t).seated / seats });
  }
  const calm = steps.length ? steps.reduce((best, s) => (s.wait < best.wait || (s.wait === best.wait && s.occupancy < best.occupancy) ? s : best)) : null;
  return { steps, calm };
}

/** Plates carved by minute `m`. */
export const platesBy = (ev: Evening, m: number) => ev.plates.filter((p) => p.carved <= m);

/** Kilograms left on a spit at minute `m`. */
export function kgLeft(ev: Evening, spit: SpitId, m: number): number {
  const plan = ev.spits.find((s) => s.id === spit)!;
  const used = ev.plates.reduce((s, p) => (p.carved <= m && p.spits.includes(spit) ? s + p.kg / p.spits.length : s), 0);
  return Math.max(0.4, plan.kgStart - used * 1.12);
}

/** Takings so far tonight (orders placed by `m`), covers and the average per guest. */
export function takingsAt(ev: Evening, m: number) {
  const ordered = ev.groups.filter((g) => g.orderAt !== null && g.orderAt <= m);
  const total = ordered.reduce((s, g) => s + g.spend, 0);
  const covers = ordered.reduce((s, g) => s + g.size, 0);
  return { total, covers, perGuest: covers ? total / covers : 0, groups: ordered.length };
}

/** Which dishes went out most tonight, by minute `m`. */
export function dishMix(ev: Evening, m: number) {
  const count = new Map<string, number>();
  for (const g of ev.groups) {
    if (g.orderAt === null || g.orderAt > m) continue;
    for (const l of g.orders) count.set(l.dish, (count.get(l.dish) ?? 0) + l.qty);
  }
  return [...count.entries()].map(([dish, n]) => ({ dish, n })).sort((a, b) => b.n - a.n);
}

/** Minute of the day for a Date on the restaurant's wall clock. */
export const minuteNow = (now: Date) => minuteOf(now);

export const groupById = (ev: Evening, id: string) => ev.groups.find((g) => g.id === id);

export const tableGroupAt = (ev: Evening, table: string, m: number) => seatedAt(ev, m).find((g) => g.table === table) ?? null;

export const seatsOf = (table: string) => tableById(table)?.seats ?? 2;

export const ALL_DISHES = DISHES;
