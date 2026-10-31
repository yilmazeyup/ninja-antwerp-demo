import {
  celsius,
  clockSeconds,
  dishById,
  euro,
  eventsOf,
  formatNo,
  fromSpit,
  hash,
  matchTonight,
  MEATS,
  myLine,
  myPassports,
  passportNo,
  passportOf,
  personaById,
  seatedAt,
  spitAt,
  tableById,
  TABLES,
  type BridgeEvent,
  type BridgeState,
  type CallKind,
  type Evening,
  type Group,
  type Meat,
  type Passport,
  type Plate,
  type Portion,
  type Station,
} from '@ninja/shared';
import type { PlateTrip } from '@ninja/shared/three/room';

import type { Live } from './live';

// What the panel reads off the evening and the bridge: the phase of every table, the service calls, the drinks sent
// across the room, the plates on their way, the tickets at the pass and the feed of what just happened.

const memo = <K extends object, V>() => new WeakMap<K, V>();

export const tableLabel = (id: string | null | undefined) => (id ? (tableById(id)?.label ?? id) : '');

/** Ninja's minute of a bridge event (`at` is the real clock). */
export const minuteOfEvent = (live: Live, at: number) => live.m - (Date.now() - at) / 60000;

/** The bridge events of tonight's evening (those with a day of their own must match it). */
export function tonight<K extends BridgeEvent['kind']>(live: Live, kind: K): Extract<BridgeEvent, { kind: K }>[] {
  return eventsOf(live.bridge, kind).filter((e) => {
    const day = (e as { day?: string }).day;
    if (day) return day === live.key;
    return Date.now() - e.at < 8 * 3600000;
  });
}

// ------------------------------------------------------------------------------------------------------- phases

export type Phase = 'binnen' | 'besteld' | 'eet' | 'rekening';

export const PHASES: Record<Phase, { label: string; color: string }> = {
  binnen: { label: 'Net binnen', color: '#E9DFD2' },
  besteld: { label: 'Wacht op eten', color: '#FFB547' },
  eet: { label: 'Aan het eten', color: '#9AD8A8' },
  rekening: { label: 'Rekening', color: '#FF6A2A' },
};

const platesByGroupMemo = memo<Evening, Map<string, Plate[]>>();
export function platesByGroup(ev: Evening): Map<string, Plate[]> {
  let map = platesByGroupMemo.get(ev);
  if (!map) {
    map = new Map();
    for (const p of ev.plates) {
      const list = map.get(p.group) ?? [];
      list.push(p);
      map.set(p.group, list);
    }
    platesByGroupMemo.set(ev, map);
  }
  return map;
}

export function phaseOf(ev: Evening, g: Group, m: number): Phase {
  if (g.leave !== null && g.leave - m < 7) return 'rekening';
  if (g.orderAt === null || m < g.orderAt) return 'binnen';
  const plates = platesByGroup(ev).get(g.id) ?? [];
  const served = plates.length ? Math.max(...plates.map((p) => p.served)) : g.orderAt + 9;
  return m < served ? 'besteld' : 'eet';
}

// -------------------------------------------------------------------------------------------------------- calls

export const CALLS: Record<CallKind, string> = { ober: 'Ober', lavash: 'Extra lavash', water: 'Water', saus: 'Saus', rekening: 'Rekening' };

export type Call = { id: string; table: string; call: CallKind; at: number; until: number; app: boolean };

const simCallsMemo = memo<Evening, Call[]>();
/** The evening's own calls: a table asks for water, lavash or the bill now and then; the floor answers in minutes. */
export function simCalls(ev: Evening): Call[] {
  let list = simCallsMemo.get(ev);
  if (list) return list;
  list = [];
  const kinds: CallKind[] = ['water', 'lavash', 'saus', 'ober'];
  for (const g of ev.groups) {
    if (g.seated === null || g.leave === null || !g.table) continue;
    const stay = g.leave - g.seated;
    const n = hash(`${g.id}-calls`) % 3;
    for (let k = 0; k < n; k++) {
      const h = hash(`${g.id}-call-${k}`);
      const at = g.seated + 6 + (h % Math.max(1, Math.floor(stay - 14))) + (h % 60) / 60;
      list.push({ id: `sim-${g.id}-${k}`, table: g.table, call: kinds[h % kinds.length], at, until: at + 0.9 + ((h >> 6) % 25) / 10, app: false });
    }
    if (hash(`${g.id}-bill`) % 2 === 0) list.push({ id: `sim-${g.id}-bill`, table: g.table, call: 'rekening', at: g.leave - 5.5, until: g.leave - 3.2, app: false });
  }
  list.sort((a, b) => a.at - b.at);
  simCallsMemo.set(ev, list);
  return list;
}

/** Calls waiting for an answer now: the evening's, and the app's that nobody has answered yet. */
export function openCalls(live: Live): Call[] {
  const sim = simCalls(live.ev).filter((c) => c.at <= live.m && live.m < c.until);
  const oks = tonight(live, 'call-ok');
  const app = tonight(live, 'call')
    .filter((c) => !oks.some((o) => o.table === c.table && o.call === c.call && o.at > c.at))
    .map((c) => ({ id: c.id, table: c.table, call: c.call, at: minuteOfEvent(live, c.at), until: Infinity, app: true }));
  return [...app, ...sim];
}

// -------------------------------------------------------------------------------------------- drinks and Match

export type Cay = { id: string; from: string; to: string; dish: string; persona: string; note: string; at: number; done: number | null; app: boolean };

/** Drinks sent across the room: the app's (waiting for the bar) and the evening's own, from Match. */
export function cays(live: Live): Cay[] {
  const done = tonight(live, 'cay-done');
  const app = tonight(live, 'cay').map((c) => {
    const d = done.find((x) => x.ref === c.id);
    return { id: c.id, from: c.fromTable, to: c.table, dish: c.dish, persona: personaById(c.persona)?.name ?? c.persona, note: c.note, at: minuteOfEvent(live, c.at), done: d ? minuteOfEvent(live, d.at) : null, app: true };
  });
  const sim: Cay[] = [];
  const list = matchTonight(live.ev, live.m).sort((a, b) => a.persona.id.localeCompare(b.persona.id));
  const drinks = ['cay', 'raki', 'cava', 'aperol', 'ayran'];
  for (let i = 0; i + 1 < list.length; i += 2) {
    const a = list[i];
    const b = list[i + 1];
    const h = hash(`${a.group.id}-${b.group.id}`);
    if (h % 3 === 0) continue;
    const at = Math.max(a.group.seated ?? 0, b.group.seated ?? 0) + 7 + (h % 9);
    if (at > live.m) continue;
    sim.push({ id: `sim-${a.persona.id}-${b.persona.id}`, from: a.table, to: b.table, dish: drinks[h % drinks.length], persona: b.persona.name, note: '', at, done: at + 3.5 <= live.m ? at + 3.5 : null, app: false });
  }
  return [...app, ...sim];
}

/** Arcs for the 3D room: a heart between two tables that matched, a drink on its way. */
export function arcs(live: Live) {
  const out: { from: string; to: string; color: string; kind: 'match' | 'cay'; label: string }[] = [];
  for (const c of cays(live)) {
    if (c.done !== null || c.from === c.to || !tableById(c.from) || !tableById(c.to)) continue;
    out.push({ from: c.from, to: c.to, color: '#FFB547', kind: 'cay', label: `${dishById(c.dish).name} · ${tableLabel(c.from)} → ${tableLabel(c.to)}` });
  }
  const list = matchTonight(live.ev, live.m).sort((a, b) => a.persona.id.localeCompare(b.persona.id));
  for (let i = 0; i + 1 < list.length; i += 2) {
    const a = list[i];
    const b = list[i + 1];
    if (a.table === b.table || hash(`${a.group.id}-${b.group.id}`) % 3 === 0) continue;
    out.push({ from: a.table, to: b.table, color: '#FF7A8A', kind: 'match', label: `Match · ${a.persona.name} & ${b.persona.name}` });
  }
  return out.slice(0, 6);
}

// ------------------------------------------------------------------------------------------------------- plates

/** Bridge carvings of tonight as passports, with their event. */
export function appPassports(live: Live): Passport[] {
  return myPassports(live.bridge).filter((p) => p.dayKey === live.key);
}

/** Plates for the room: on the pass, on their way and on the tables while the group is still there. */
export function twinPlates(live: Live): PlateTrip[] {
  const { ev, m } = live;
  const out: PlateTrip[] = [];
  const groups = new Map(ev.groups.map((g) => [g.id, g]));
  const count = new Map<string, number>();
  for (let i = ev.plates.length - 1; i >= 0 && out.length < 54; i--) {
    const p = ev.plates[i];
    if (p.carved > m) continue;
    if (m - p.carved > 40) break;
    const g = groups.get(p.group);
    if (!g || (g.leave !== null && m >= g.leave - 1.5)) continue;
    const k = count.get(p.group) ?? 0;
    count.set(p.group, k + 1);
    out.push({ id: `p${p.seq}`, table: p.table, carved: p.carved, served: p.served, seat: k });
  }
  for (const c of tonight(live, 'carve')) {
    if (m - c.minute > 30 || c.minute > m + 0.5) continue;
    out.push({ id: c.ref, table: c.table, carved: c.minute, served: c.minute + c.seconds / 60, seat: 0 });
  }
  return out;
}

/** Plates on their way right now (for the tags that follow them). */
export function platesInFlight(live: Live) {
  const out: { id: string; no: number; core: number; table: string }[] = [];
  const { ev, m } = live;
  for (let i = ev.plates.length - 1; i >= 0; i--) {
    const p = ev.plates[i];
    if (p.carved > m) continue;
    if (m - p.carved > 3) break;
    if (m < p.served + 0.3) out.push({ id: `p${p.seq}`, no: passportNo(ev, p), core: p.core, table: p.table });
  }
  const mine = appPassports(live);
  for (const c of tonight(live, 'carve')) {
    if (m < c.minute + c.seconds / 60 + 0.3 && m >= c.minute - 0.05) {
      const pp = mine.find((x) => Math.abs(x.carved - c.minute) < 1e-6 && x.table === c.table);
      out.push({ id: c.ref, no: pp?.no ?? 0, core: c.core, table: c.table });
    }
  }
  return out;
}

// ----------------------------------------------------------------------------------------------------- tickets

export type TicketLine = { dish: string; name: string; meat?: Meat; portion?: Portion; qty: number; station: Station; iskender?: boolean };

export type Ticket = {
  id: string;
  table: string;
  name: string;
  size: number;
  at: number;
  lines: TicketLine[];
  app: boolean;
  /** The app order's ref (for carving). */
  ref?: string;
};

export const STATIONS: { id: Station; label: string; prep: number }[] = [
  { id: 'spit', label: 'Spies', prep: 0 },
  { id: 'oven', label: 'Steenoven', prep: 6 },
  { id: 'cold', label: 'Koude keuken', prep: 4 },
  { id: 'fryer', label: 'Friteuse', prep: 7 },
  { id: 'pot', label: 'Pot', prep: 3 },
  { id: 'bar', label: 'Bar', prep: 2 },
];

const lineOf = (l: { dish: string; meat?: Meat; portion?: Portion; qty: number; iskender?: boolean }): TicketLine => {
  const d = dishById(l.dish);
  return { dish: l.dish, name: d.name, meat: l.meat, portion: l.portion, qty: l.qty, station: d.station, iskender: l.iskender };
};

/** The orders of the last half hour, newest first. */
export function tickets(live: Live): Ticket[] {
  const { ev, m } = live;
  const sim: Ticket[] = ev.groups
    .filter((g) => g.orderAt !== null && g.orderAt <= m && m - g.orderAt < 32 && g.table)
    .map((g) => ({ id: g.id, table: g.table!, name: g.name, size: g.size, at: g.orderAt!, lines: g.orders.map(lineOf), app: false }));
  const app: Ticket[] = tonight(live, 'order')
    .filter((o) => m - o.minute < 60)
    .map((o) => {
      const table = o.table ?? appTable(live) ?? '';
      return { id: o.id, table, name: myLine(live.bridge)?.joined.name ?? 'App', size: myLine(live.bridge)?.joined.size ?? 1, at: o.minute, lines: o.items.map(lineOf), app: true, ref: o.ref };
    });
  return [...app, ...sim].sort((a, b) => b.at - a.at);
}

/** The app guest's table: called in, seated, or the table of the order. */
export function appTable(live: Live): string | null {
  const line = myLine(live.bridge);
  if (line?.seat) return line.seat.table;
  if (line?.call) return line.call.table;
  const seat = tonight(live, 'line-seat').at(-1);
  return seat?.table ?? null;
}

/** The spit plates of an app order, one per portion, with the ref the guest app expects: `${order.ref}-${i}`. */
export function spitPlatesOf(order: { ref: string; items: { dish: string; meat?: Meat; portion?: Portion; qty: number }[] }) {
  const out: { ref: string; dish: string; meat?: Meat; portion: Portion }[] = [];
  let i = 0;
  for (const item of order.items) {
    const d = dishById(item.dish);
    if (!fromSpit(d) || item.meat === 'falafel') continue;
    for (let q = 0; q < item.qty; q++, i++) out.push({ ref: `${order.ref}-${i}`, dish: item.dish, meat: item.meat, portion: item.portion ?? '1x' });
  }
  return out;
}

/** Done at a station: spit plates carved, the rest after their preparation time. */
export function stationDone(live: Live, t: Ticket, station: Station): boolean {
  if (station === 'spit') {
    if (t.app) {
      const carved = new Set(tonight(live, 'carve').map((c) => c.ref));
      const plates = spitPlatesOf({ ref: t.ref!, items: t.lines });
      return plates.every((p) => carved.has(p.ref));
    }
    const plates = platesByGroup(live.ev).get(t.id) ?? [];
    return plates.every((p) => p.carved <= live.m);
  }
  const prep = STATIONS.find((s) => s.id === station)?.prep ?? 4;
  return live.m - t.at >= prep;
}

// ---------------------------------------------------------------------------------------------------------- feed

export type FeedItem = { id: string; m: number; kind: 'arrive' | 'seat' | 'carve' | 'call' | 'cay' | 'flash' | 'leave' | 'app' | 'order'; text: string; table?: string };

/** What just happened, newest first: the evening's own moments and the app's. */
export function feed(live: Live, window = 22): FeedItem[] {
  const { ev, m } = live;
  const from = m - window;
  const out: FeedItem[] = [];
  for (const g of ev.groups) {
    if (g.arrive > from && g.arrive <= m) out.push({ id: `a-${g.id}`, m: g.arrive, kind: 'arrive', text: g.viaApp ? `${g.name} · ${g.size} pers. via de app in de rij` : `${g.name} · ${g.size} pers. in de rij` });
    if (g.seated !== null && g.seated > from && g.seated <= m && g.table) out.push({ id: `s-${g.id}`, m: g.seated, kind: 'seat', text: `${g.name} aan ${tableLabel(g.table)}`, table: g.table });
    if (g.leave !== null && g.leave > from && g.leave <= m && g.table) out.push({ id: `l-${g.id}`, m: g.leave, kind: 'leave', text: `${tableLabel(g.table)} is vrij`, table: g.table });
  }
  for (let i = ev.plates.length - 1; i >= 0; i--) {
    const p = ev.plates[i];
    if (p.carved > m) continue;
    if (p.carved <= from) break;
    out.push({ id: `c-${p.seq}`, m: p.carved, kind: 'carve', text: `No. ${formatNo(passportNo(ev, p))} · ${dishById(p.dish).name} · ${celsius(p.core)}`, table: p.table });
  }
  for (const c of simCalls(ev)) {
    if (c.at > from && c.at <= m) out.push({ id: c.id, m: c.at, kind: 'call', text: `${tableLabel(c.table)} vraagt: ${CALLS[c.call]}`, table: c.table });
  }
  for (const c of cays(live)) {
    if (c.at > from && c.at <= m) out.push({ id: `cay-${c.id}`, m: c.at, kind: 'cay', text: `${dishById(c.dish).name} van ${tableLabel(c.from)} naar ${tableLabel(c.to)}`, table: c.to });
  }
  // The app.
  const mine = appPassports(live);
  for (const e of live.bridge.events) {
    const em = 'minute' in e && typeof e.minute === 'number' && (e as { day?: string }).day === live.key ? e.minute : minuteOfEvent(live, e.at);
    if (em <= from || em > m + 0.1 || Date.now() - e.at > 8 * 3600000) continue;
    const id = `b-${e.id}`;
    switch (e.kind) {
      case 'line-join':
        out.push({ id, m: em, kind: 'app', text: `${e.name} · ${e.size} pers. via de app in de rij` });
        break;
      case 'line-call':
        out.push({ id, m: em, kind: 'app', text: `Binnengeroepen naar ${tableLabel(e.table)}`, table: e.table });
        break;
      case 'line-seat':
        out.push({ id, m: em, kind: 'seat', text: `App-gast aan ${tableLabel(e.table)}`, table: e.table });
        break;
      case 'order':
        out.push({ id, m: em, kind: 'order', text: `Bestelling via de app · ${euro(e.total)}`, table: e.table ?? undefined });
        break;
      case 'carve': {
        const p = mine.find((x) => Math.abs(x.carved - e.minute) < 1e-6);
        out.push({ id, m: em, kind: 'carve', text: `No. ${p ? formatNo(p.no) : '—'} · ${dishById(e.dish).name} · ${celsius(e.core)}`, table: e.table });
        break;
      }
      case 'call':
        out.push({ id, m: em, kind: 'call', text: `${tableLabel(e.table)} vraagt: ${CALLS[e.call]}`, table: e.table });
        break;
      case 'call-ok':
        out.push({ id, m: em, kind: 'app', text: `${e.by} is onderweg naar ${tableLabel(e.table)}`, table: e.table });
        break;
      case 'flash':
        out.push({ id, m: em, kind: 'flash', text: e.caption ? `Flitsfoto: “${e.caption}”` : 'Nieuwe flitsfoto' });
        break;
      case 'spit-booking':
        out.push({ id, m: em, kind: 'app', text: `Eigen Spies geboekt · ${e.name} · ${e.guests} pers.` });
        break;
      case 'rsvp':
        out.push({ id, m: em, kind: 'app', text: `Inschrijving Ninja Night · ${e.guests} pers.` });
        break;
      case 'fresh-spit':
        out.push({ id, m: em, kind: 'app', text: e.spit === 'kip' ? 'Verse spies kip aan het vuur' : 'Verse spies rund aan het vuur' });
        break;
      default:
        break;
    }
  }
  return out.sort((a, b) => b.m - a.m).slice(0, 60);
}

// ------------------------------------------------------------------------------------------------------- spits

/** The spit after a fresh one went on (bridge `fresh-spit`): what was cut before no longer counts. */
export function freshAt(bridge: BridgeState, key: string, spit: 'rund' | 'kip', m: number): number | null {
  const list = eventsOf(bridge, 'fresh-spit').filter((e) => e.spit === spit && ((e as { day?: string }).day === undefined ? Date.now() - e.at < 8 * 3600000 : (e as { day?: string }).day === key));
  const last = list.filter((e) => e.minute <= m).at(-1);
  return last ? last.minute : null;
}

/** Kilograms left on a spit, with a fresh spit counted. */
export function kgNow(ev: Evening, spit: 'rund' | 'kip', m: number, fresh: number | null): number {
  const plan = ev.spits.find((s) => s.id === spit)!;
  let used = 0;
  for (const p of ev.plates) {
    if (p.carved > m) break;
    if (!p.spits.includes(spit) || (fresh !== null && p.carved < fresh)) continue;
    used += p.kg / p.spits.length;
  }
  return Math.max(0.4, plan.kgStart - used * 1.12);
}

/** The reading of a spit now (the shared telemetry), with kilograms after a fresh spit. */
export function spitNow(live: Live, spit: 'rund' | 'kip') {
  const r = spitAt(live.ev, spit, live.m);
  const fresh = freshAt(live.bridge, live.key, spit, live.m);
  const kg = fresh === null ? r.kg : Math.round(kgNow(live.ev, spit, live.m, fresh) * 10) / 10;
  return { ...r, kg };
}

/** Kilograms an hour over the last 45 minutes, and when the spit will be down to its last two kilograms. */
export function spitForecast(live: Live, spit: 'rund' | 'kip') {
  const fresh = freshAt(live.bridge, live.key, spit, live.m);
  const now = kgNow(live.ev, spit, live.m, fresh);
  const before = kgNow(live.ev, spit, Math.max(live.m - 45, fresh ?? 0), fresh);
  const rate = Math.max(0.01, (before - now) / 45);
  const minutes = Math.max(0, (now - 2) / rate);
  return { perHour: rate * 60, emptyAt: live.m + minutes, kg: now };
}

// ----------------------------------------------------------------------------------------------------- seating

/** A free table that fits `size`, preferring an area; none taken by the evening or by the app. */
export function freeTableFor(live: Live, size: number, area?: string): string | null {
  const taken = new Set(seatedAt(live.ev, live.m).map((g) => g.table));
  const app = appTable(live);
  if (app) taken.add(app);
  const fits = TABLES.filter((t) => !taken.has(t.id) && t.seats >= Math.min(size, 4) && (t.area !== 'fire' || size <= 1) && (t.area !== 'bar' || size <= 2) && (t.area !== 'terrace' || live.m < 21 * 60));
  const pref = area ? fits.filter((t) => t.area === area) : [];
  return (pref[0] ?? [...fits].sort((a, b) => a.seats - b.seats)[0])?.id ?? null;
}

/** When no table fits now: the one that comes free first (its group leaves soonest). */
export function nextTableFor(live: Live, size: number): { table: string; at: number } | null {
  const app = appTable(live);
  const leaving = seatedAt(live.ev, live.m)
    .filter((g) => g.table && g.table !== app && g.leave !== null && (tableById(g.table)?.seats ?? 0) >= Math.min(size, 4))
    .sort((a, b) => (a.leave ?? 0) - (b.leave ?? 0))[0];
  return leaving ? { table: leaving.table!, at: leaving.leave! } : null;
}

/** The passports of tonight so far, newest first (the evening's and the app's). */
export function passportsTonight(live: Live): Passport[] {
  const { ev, m } = live;
  const out: Passport[] = [];
  for (let i = ev.plates.length - 1; i >= 0; i--) {
    const p = ev.plates[i];
    if (p.carved > m) continue;
    out.push(passportOf(ev, p));
  }
  return [...appPassports(live).filter((p) => p.carved <= m + 0.5), ...out].sort((a, b) => b.carved - a.carved);
}

export const meatLabel = (meat?: Meat) => (meat ? MEATS[meat].short : '');

export const hms = (m: number) => clockSeconds(m);
