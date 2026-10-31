import {
  ALLERGENS,
  atMinute,
  clock,
  COUNTRY_NAMES,
  dayShort,
  decimal,
  dishById,
  DISHES,
  euro,
  freshLine,
  guestsAt,
  INGREDIENTS,
  isOpenAt,
  kmOf,
  NINJA,
  nextOpening,
  PARKING,
  relativeDay,
  spitAt,
  STATUS_LABEL,
  startOfDay,
  waitFor,
  waitForecast,
  wallClock,
  type Allergen,
  type Dish,
  type Evening,
  type IngredientId,
  type Meat,
  type NinjaClock,
  type Portion,
} from '@ninja/shared';

/**
 * Sensei, Ninja's host in the app. It answers in Dutch (the screen translates) from the restaurant's own data, worked
 * out on the phone: the card and its prices, halal, what is vegetarian, the allergens, the sauces, what to order for a
 * table within a budget, what to drink with it, where the ingredients come from, the spit and the line right now, the
 * hours, parking and the house rules. No network, no model: every answer can be traced to a fact.
 */

export type Para = { t: string; v?: Record<string, string> };
export type DishLine = { dish: string; meat?: Meat; portion?: Portion; qty: number };
export type Fact = { label: string; value: string; unit?: string };
export type SenseiLink = { label: string; to: string; external?: boolean };
export type Answer = {
  topic: string;
  paras: Para[];
  dishes?: DishLine[];
  /** The order's total, when Sensei put a table together. */
  total?: number;
  people?: number;
  facts?: Fact[];
  links?: SenseiLink[];
  follow?: string[];
  note?: string;
};

export type SenseiContext = {
  ev: Evening;
  minute: number;
  clock: NinjaClock;
  /** Her diet from the settings. */
  veg?: boolean;
  avoid?: Allergen[];
  /** How many they usually are. */
  size?: number;
};

/** What Sensei suggests to ask, as chips. */
export const STARTERS = [
  'Wat nemen we met vier voor € 120?',
  'Is alles halal?',
  'Wat is vegetarisch?',
  'Hoe warm is de spies nu?',
  'Hoe lang is het wachten?',
  'Waar komt de sla vandaan?',
  'Welke sauzen zijn er?',
  'Wat drink ik bij de Iskender?',
  'Wat zit er in het Ninja Menu?',
  'Waar kan ik parkeren?',
  'Kan ik afhalen?',
  'Hebben jullie een cadeaubon?',
];

// ------------------------------------------------------------------------------------------------------- reading

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ı/g, 'i')
    .replace(/[’‘`´]/g, "'")
    .replace(/[^\p{L}\p{N}€'\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** True when one of the words starts a word in the question ("veg" finds "vegetarisch"). */
const has = (q: string, ...words: string[]) => words.some((w) => new RegExp(`(^|\\s)${w}`).test(q));
/** True when one of the words is a whole word in the question ("ui" but not "uit"). */
const word = (q: string, ...words: string[]) => words.some((w) => new RegExp(`(^|\\s)${w}($|\\s)`).test(q));

const NUMBER_WORDS: Record<string, number> = {
  een: 1, twee: 2, tweeen: 2, drie: 3, drieen: 3, vier: 4, vieren: 4, vijf: 5, vijven: 5, zes: 6, zessen: 6, zeven: 7, zevenen: 7, acht: 8, achten: 8, negen: 9, tien: 10, twaalf: 12, veertien: 14,
  two: 2, three: 3, four: 4, five: 5, six: 6, eight: 8, iki: 2, uc: 3, dort: 4, bes: 5, alti: 6,
};

/** "met z'n vieren", "voor 4 personen", "we zijn met 3", "for four people", "4 kişi". */
function people(q: string): number | null {
  const n = /(\d{1,2})\s*(personen|persoon|pers|mensen|man|people|persons|guests|kisi|gasten|vrienden)/.exec(q) ?? /(met|voor|for|zijn)\s+(\d{1,2})(\s|$)/.exec(q);
  if (n) {
    const v = Number(n[1].match(/\d+/) ? n[1] : n[2]);
    if (v > 0 && v < 40) return v;
  }
  const w = /(met|voor|for|zijn)\s+(z'n|zijn|ons|onze|jullie|the)?\s*([a-z]+)/.exec(q);
  if (w && NUMBER_WORDS[w[3]]) return NUMBER_WORDS[w[3]];
  const w2 = /([a-z]+)\s+(personen|mensen|people|kisi)/.exec(q);
  if (w2 && NUMBER_WORDS[w2[1]]) return NUMBER_WORDS[w2[1]];
  if (has(q, 'koppel', 'date', 'met ons twee', 'met z n tweeen')) return 2;
  return null;
}

/** "€ 120", "120 euro", "budget van 100", "max 80". */
function budget(q: string): number | null {
  const m = /€\s*(\d{2,4})/.exec(q) ?? /(\d{2,4})\s*(€|euro|eur)/.exec(q) ?? /(budget|max|maximum|hoogstens)\s*(van)?\s*(\d{2,4})/.exec(q);
  if (!m) return null;
  const v = Number(m[3] ?? m[1]);
  return v >= 10 && v <= 5000 ? v : null;
}

/** Dishes named in the question, the longest names first ("platter rice" before "platter"). */
const DISH_WORDS: [RegExp, string][] = [
  [/ninja menu|menu van het huis/, 'ninja-menu'],
  [/platter rice|rijst platter|vlees op rijst/, 'platter-rice'],
  [/ninja rolls|rolls|opgerold/, 'ninja-rolls'],
  [/iskender|skender/, 'iskender'],
  [/durum|wrap|rollo/, 'durum'],
  [/ninja kebab|kebab|platter|doner/, 'ninja-kebab'],
  [/rijstpudding|rice pudding|pudding|sutlac|dessert/, 'rice-pudding'],
  [/turkse rijst|turkish rice|pilav/, 'turkish-rice'],
  [/soep|soup|corba|linzensoep/, 'soup'],
  [/\brijst\b|\brice\b/, 'turkish-rice'],
  [/yoghurt ?dip|cacik|tzatziki/, 'yoghurt-dip'],
  [/wortel ?dip|carrot/, 'carrot-dip'],
  [/falafel/, 'falafel-hummus'],
  [/hummus|houmous/, 'hummus'],
  [/ezme/, 'ezme'],
  [/herderssalade|shepherd|coban|salade/, 'shepherd-salad'],
  [/lavash|lavas/, 'lavash'],
  [/friet|frieten|fries|patat/, 'fries'],
  [/ayran/, 'ayran'],
  [/raki/, 'raki'],
  [/cay\b|turkse thee/, 'cay'],
  [/aperol|spritz/, 'aperol'],
  [/cava|bubbels/, 'cava'],
];

function dishesIn(q: string): Dish[] {
  const found: string[] = [];
  let rest = q;
  for (const [re, id] of DISH_WORDS) {
    if (re.test(rest)) {
      found.push(id);
      rest = rest.replace(re, ' ');
    }
  }
  return found.map(dishById);
}

const INGREDIENT_WORDS: [RegExp, IngredientId][] = [
  [/\bsla\b|lettuce|romaine|salad/, 'lettuce'],
  [/tomaat|tomaten|tomato/, 'tomato'],
  [/\bui\b|uien|onion/, 'onion'],
  [/peterselie|parsley/, 'parsley'],
  [/kalf|veal/, 'veal'],
  [/\blam\b|lamsvlees|lamb/, 'lamb'],
  [/\bkip\b|chicken|tavuk/, 'chicken'],
  [/rund|beef|vlees|meat|et\b/, 'beef'],
  [/zout|salt/, 'himalayan_salt'],
  [/\beik|eikenhout|hout|wood|vuur/, 'oak'],
  [/desem|sourdough/, 'sourdough'],
  [/lavash|brood|bread/, 'lavash'],
  [/bloem|meel|flour/, 'flour'],
  [/sumak|sumac/, 'sumac'],
  [/rundvet|tallow|vet\b/, 'tallow'],
  [/aardappel|friet|frieten|potato|fries/, 'potato'],
  [/yoghurt|yogurt/, 'yoghurt'],
  [/kikkererwt|chickpea|nohut/, 'chickpeas'],
  [/tahin|sesam/, 'tahini'],
  [/rijst|rice|pirinc/, 'rice'],
  [/melk|milk/, 'milk'],
  [/pistache|pistachio|antep/, 'pistachio'],
  [/knoflook|\blook\b|garlic/, 'garlic'],
  [/schapenboter|boter|butter/, 'sheep_butter'],
  [/pul biber|pulbiber|maras/, 'pulbiber'],
  [/peper|pepper|biber/, 'pepper'],
  [/linzen|lentil/, 'lentils'],
  [/wortel|carrot/, 'carrot'],
  [/citroen|lemon/, 'lemon'],
  [/komkommer|cucumber/, 'cucumber'],
  [/\bmunt\b|mint/, 'mint'],
  [/dille|dill/, 'dill'],
  [/za'?atar|zaatar/, 'zaatar'],
  [/\bthee\b|\btea\b|\bcay\b/, 'tea'],
  [/raki/, 'raki'],
];

const ingredientIn = (q: string): IngredientId | null => INGREDIENT_WORDS.find(([re]) => re.test(q))?.[1] ?? null;

// ------------------------------------------------------------------------------------------------------- helpers

const P = (t: string, v?: Record<string, string | number>): Para => ({ t, v: v ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x)])) : undefined });
const c1 = (v: number) => decimal(v, 1);
const DRINK_CATEGORIES = new Set(['cold', 'iced', 'hot', 'alcohol']);
const MAINS = DISHES.filter((d) => ['menu', 'kebab'].includes(d.cat));
const FOOD = DISHES.filter((d) => !DRINK_CATEGORIES.has(d.cat));
const allergenList = (d: Dish) => d.allergens.map((a) => ALLERGENS[a]).join(', ');

/** "€ 22,50 · 1,5×: € 26,50" */
const priceLine = (d: Dish) => (d.price15 ? `${euro(d.price)} · 1,5× ${euro(d.price15)}` : euro(d.price));

// ------------------------------------------------------------------------------------------------------- the table

type Plan = { lines: DishLine[]; total: number };

const sum = (lines: DishLine[]) => lines.reduce((s, l) => s + dishById(l.dish).price * l.qty + (l.portion === '1,5x' ? ((dishById(l.dish).price15 ?? dishById(l.dish).price) - dishById(l.dish).price) * l.qty : 0), 0);

function merge(lines: DishLine[]): DishLine[] {
  const out: DishLine[] = [];
  for (const l of lines) {
    const same = out.find((o) => o.dish === l.dish && o.meat === l.meat && o.portion === l.portion);
    if (same) same.qty += l.qty;
    else out.push({ ...l });
  }
  return out.filter((l) => l.qty > 0);
}

/** A table for `n`: a plate each, dips and lavash to share, something to drink; within the budget when there is one. */
function planTable(n: number, max: number | null, veg: boolean): Plan & { tight: boolean; menu: boolean } {
  const DIPS = veg ? ['hummus', 'ezme', 'yoghurt-dip', 'carrot-dip'] : ['hummus', 'ezme', 'yoghurt-dip', 'carrot-dip'];
  const shareDips = Math.max(1, Math.ceil(n / 2));
  // Everything of the house when the budget allows it.
  if (!veg && max !== null && max / n >= 46) {
    const lines = merge([{ dish: 'ninja-menu', meat: 'mix', qty: n }, { dish: 'ayran', qty: n }]);
    return { lines, total: sum(lines), tight: false, menu: true };
  }
  const mainsOf = (level: number[]) =>
    level.map((lv, i) =>
      veg
        ? i % 2 === 0
          ? { dish: 'durum', meat: 'falafel' as Meat, portion: '1x' as Portion, qty: 1 }
          : { dish: 'falafel-hummus', qty: 1 }
        : lv >= 2
          ? { dish: 'iskender', meat: 'mix' as Meat, portion: '1x' as Portion, qty: 1 }
          : lv === 1
            ? { dish: 'ninja-kebab', meat: 'beef' as Meat, portion: '1x' as Portion, qty: 1 }
            : { dish: 'durum', meat: 'beef' as Meat, portion: '1x' as Portion, qty: 1 },
    );
  // Start lean, then add what makes the evening better, as long as it fits.
  const state = { levels: Array.from({ length: n }, () => 0), dips: shareDips, lavash: 0, fries: 0, pudding: 0, ayran: 0, raki: 0 };
  const build = () =>
    merge([
      ...mainsOf(state.levels),
      ...Array.from({ length: state.dips }, (_, i) => ({ dish: DIPS[i % DIPS.length], qty: 1 })),
      { dish: 'lavash', qty: state.lavash },
      { dish: 'fries', qty: veg ? 0 : state.fries },
      { dish: 'rice-pudding', qty: state.pudding },
      { dish: 'ayran', qty: state.ayran },
      { dish: 'cay', qty: n - state.ayran - state.raki },
      { dish: 'raki', qty: state.raki },
    ]);
  if (max === null) {
    state.levels = state.levels.map((_, i) => (i % 2 === 0 ? 2 : 1));
    state.lavash = Math.ceil(n / 2);
    state.fries = Math.max(1, Math.floor(n / 2));
    state.ayran = n;
    const lines = build();
    return { lines, total: sum(lines), tight: false, menu: false };
  }
  const steps: (() => boolean)[] = [
    () => (state.ayran < n - state.raki ? ((state.ayran += 1), true) : false),
    () => (state.lavash < Math.ceil(n / 2) ? ((state.lavash += 1), true) : false),
    () => {
      const i = state.levels.indexOf(0);
      return i >= 0 ? ((state.levels[i] = 1), true) : false;
    },
    () => (!veg && state.fries < Math.floor(n / 2) ? ((state.fries += 1), true) : false),
    () => {
      const i = state.levels.indexOf(1);
      return i >= 0 && !veg ? ((state.levels[i] = 2), true) : false;
    },
    () => (state.pudding < Math.ceil(n / 2) ? ((state.pudding += 1), true) : false),
    () => (state.raki < Math.floor(n / 2) && state.ayran > 0 ? ((state.raki += 1), (state.ayran -= 1), true) : false),
  ];
  const tight = sum(build()) > max;
  let progress = true;
  while (progress && !tight) {
    progress = false;
    for (const step of steps) {
      const before = JSON.stringify(state);
      if (!step()) continue;
      if (sum(build()) <= max) {
        progress = true;
        break;
      }
      Object.assign(state, JSON.parse(before));
    }
  }
  const lines = build();
  return { lines, total: sum(lines), tight, menu: false };
}

// ------------------------------------------------------------------------------------------------------- answers

const PAIRINGS: Record<string, Para[]> = {
  iskender: [P('Bij de Iskender: een ayran. De yoghurt en het zout snijden door de schapenboter.'), P('Liever wijn? Een glas rood ({price}) houdt het vet in toom.', { price: euro(dishById('wine-red').price) })],
  'ninja-kebab': [P('Bij de Ninja Kebab: rakı met ijs en water ({price}), zoals in Istanbul. Of een frisse ayran.', { price: euro(dishById('raki').price) })],
  durum: [P('Bij een durum: een ayran of een Fuze Tea Sparkling Lemon. Licht en fris.')],
  'ninja-rolls': [P('Bij de Ninja Rolls: een glas cava ({price}). De bubbels houden de knoflookyoghurt licht.', { price: euro(dishById('cava').price) })],
  'platter-rice': [P('Bij de Platter Rice: een glas rode wijn, of rakı als je de avond lang wil maken.')],
  'ninja-menu': [P('Bij het Ninja Menu: begin met ayran, eindig met een çay in het tulpglas bij de rijstpudding.')],
  'rice-pudding': [P('Bij de rijstpudding: Turkse thee, çay, in het tulpglas ({price}).', { price: euro(dishById('cay').price) })],
  'falafel-hummus': [P('Bij de falafel: een San Pellegrino Limonata of een glas witte wijn.')],
};

function answerProvenance(id: IngredientId, minute: number): Answer {
  const g = INGREDIENTS[id];
  const paras = [
    P('{name} komt van {producer} in {place} ({country}), {km} km van de Vlaamsekaai.', { name: g.name, producer: g.producer, place: g.place, country: COUNTRY_NAMES[g.country], km: kmOf(id) }),
    P('{story}', { story: g.story }),
    g.fresh.kind === 'aged' ? P('{fresh}.', { fresh: freshLine(id, minute) }) : P('Vandaag: {fresh}.', { fresh: freshLine(id, minute) }),
  ];
  if (g.real) paras.push(P('Echt bij Ninja: {real}.', { real: g.real }));
  return {
    topic: 'herkomst',
    paras,
    facts: [
      { label: 'Afstand', value: String(kmOf(id)), unit: 'km' },
      { label: 'Land', value: COUNTRY_NAMES[g.country] },
    ],
    note: 'De leveranciers en loten zijn voorbeelden: Ninja vult in het panel zijn eigen leveranciers in.',
    links: [{ label: 'Bekijk je paspoorten', to: '/paspoorten' }],
    follow: ['Waar komt het lamsvlees vandaan?', 'Welk zout gebruiken jullie?', 'Waar komt de pistache vandaan?'],
  };
}

function answerSpit(ctx: SenseiContext): Answer {
  const r = spitAt(ctx.ev, 'rund', ctx.minute);
  const k = spitAt(ctx.ev, 'kip', ctx.minute);
  return {
    topic: 'spies',
    paras: [
      P('Spies 1, rund, kalf en lam: {core} °C in de snijlaag, de korst op {crust} °C, het eikenvuur op {fire} °C.', { core: c1(r.core), crust: c1(r.crust), fire: r.fire }),
      r.lastCut < 90
        ? P('De laatste snede was {s} seconden geleden. Er hangt nog {kg} kg aan de spies: {status}.', { s: r.lastCut, kg: c1(r.kg), status: STATUS_LABEL[r.status].toLowerCase() })
        : P('De laatste snede was {m} minuten geleden. Er hangt nog {kg} kg aan de spies: {status}.', { m: Math.round(r.lastCut / 60), kg: c1(r.kg), status: STATUS_LABEL[r.status].toLowerCase() }),
      k.status === 'opwarmen' || k.status === 'koud'
        ? P('De kip, spies 2, warmt nog op: {core} °C. Er wordt pas gesneden als ze klaar is.', { core: c1(k.core) })
        : P('De kip, spies 2, staat op {core} °C.', { core: c1(k.core) }),
    ],
    facts: [
      { label: 'Kern', value: c1(r.core), unit: '°C' },
      { label: 'Korst', value: c1(r.crust), unit: '°C' },
      { label: 'Vuur', value: String(r.fire), unit: '°C' },
      { label: 'Over', value: c1(r.kg), unit: 'kg' },
    ],
    links: [{ label: 'Volg de spies live', to: '/spies' }],
    follow: ['Wanneer is de korst op z’n best?', 'Hoe lang is het wachten?', 'Waar komt het rundvlees vandaan?'],
  };
}

function answerWait(ctx: SenseiContext, n: number): Answer {
  const w = waitFor(ctx.ev, ctx.minute, n);
  const g = guestsAt(ctx.ev, ctx.minute);
  const calm = waitForecast(ctx.ev, ctx.minute).calm;
  const paras = [
    w === 0
      ? P('Nu is er geen rij: voor {n} is er meteen plaats.', { n })
      : P('Nu wacht je met {n} ongeveer {w} minuten. Er staan {line} groepen voor je.', { n, w, line: g.line }),
    P('Binnen zitten nu {seated} gasten aan {tables} tafels.', { seated: g.seated, tables: g.tables }),
  ];
  if (calm && calm.minute > ctx.minute + 10) paras.push(P('Het rustigst wordt het rond {time}: dan ongeveer {w} minuten.', { time: clock(atMinute(startOfDay(ctx.clock.now), calm.minute)), w: calm.wait }));
  paras.push(P('Reserveren kan niet, maar met de app schuif je digitaal in de rij en wacht je waar je wil.'));
  return {
    topic: 'rij',
    paras,
    facts: [
      { label: 'Wachten', value: String(w), unit: 'min' },
      { label: 'In de rij', value: String(g.line) },
      { label: 'Binnen', value: String(g.seated) },
    ],
    links: [{ label: 'Schuif in de rij', to: '/rij' }],
    follow: ['Hoe warm is de spies nu?', 'Wat nemen we met vier voor € 120?'],
  };
}

function answerHours(ctx: SenseiContext): Answer {
  const wall = wallClock();
  const open = ctx.clock.reason === 'closed' ? false : isOpenAt(ctx.clock.now);
  const next = nextOpening(wall);
  return {
    topic: 'uren',
    paras: [
      P('Ninja is open van dinsdag tot zondag, van 15:00 tot 22:00. Op maandag is het gesloten.'),
      open
        ? P('Nu open, tot 22:00. De keuken neemt tot dan bestellingen aan.')
        : ['vandaag', 'morgen'].includes(relativeDay(next, wall))
          ? P('Nu gesloten. We gaan {day} om {time} weer open.', { day: relativeDay(next, wall), time: clock(next) })
          : P('Nu gesloten. We gaan weer open op {day} om {time}.', { day: dayShort(next), time: clock(next) }),
    ],
    links: [{ label: 'Route naar Ninja', to: '/route' }],
    follow: ['Hoe lang is het wachten?', 'Waar kan ik parkeren?'],
  };
}

function answerPlan(n: number, max: number | null, ctx: SenseiContext, q: string): Answer {
  const veg = !!ctx.veg || has(q, 'veg', 'vegetar', 'zonder vlees', 'falafel');
  const plan = planTable(n, max, veg);
  const paras: Para[] = [];
  if (max !== null) paras.push(P('Voor {n} personen binnen {budget}: zo zou ik het doen.', { n, budget: euro(max) }));
  else paras.push(P('Voor {n} personen: zo zou ik het doen.', { n }));
  if (plan.menu) paras.push(P('Jullie budget laat het Ninja Menu toe: soep, dips, een platter per persoon, frieten of rijst en rijstpudding. Alles van het huis.'));
  else if (veg) paras.push(P('Vegetarisch: falafel in een durum en op hummus, dips om te delen. Geen frieten: die worden in rundvet gebakken.'));
  else paras.push(P('Een bord van de spies per persoon, dips en lavash om te delen, en iets om te drinken.'));
  if (plan.tight) paras.push(P('Eerlijk: voor {budget} wordt het krap. Zo kom je op {total}.', { budget: euro(max ?? 0), total: euro(plan.total) }));
  if (n >= 8) paras.push(P('Met {n} of meer kan je ook een Eigen Spies boeken: een spies met jullie naam in messing.', { n: 8 }));
  return {
    topic: 'tafel',
    paras,
    dishes: plan.lines,
    total: plan.total,
    people: n,
    facts: [
      { label: 'Totaal', value: euro(plan.total) },
      { label: 'Per persoon', value: euro(plan.total / n) },
    ],
    links: n >= 8 ? [{ label: 'Eigen Spies', to: '/eigen-spies' }] : undefined,
    follow: ['Wat drink ik bij de Iskender?', 'Is alles halal?', 'Wat is vegetarisch?'],
  };
}

function answerDish(d: Dish): Answer {
  const paras = [P('{name}: {desc}', { name: d.name, desc: d.desc ?? '' })];
  paras.push(d.price15 ? P('{price}, of {price15} voor anderhalve portie.', { price: euro(d.price), price15: euro(d.price15) }) : P('{price}.', { price: euro(d.price) }));
  if (d.allergens.length) paras.push(P('Allergenen: {list}.', { list: allergenList(d) }));
  if (d.note) paras.push(P('{note}', { note: d.note }));
  return {
    topic: 'gerecht',
    paras,
    dishes: [{ dish: d.id, meat: d.meats?.[0], portion: '1x', qty: 1 }],
    follow: PAIRINGS[d.id] ? [`Wat drink ik bij de ${d.name}?`, 'Wat is vegetarisch?'] : ['Wat is vegetarisch?', 'Welke sauzen zijn er?'],
  };
}

/** Sensei's answer to one question. */
export function ask(question: string, ctx: SenseiContext): Answer {
  const q = norm(question);
  const dishes = dishesIn(q);
  const n = people(q);
  const max = budget(q);
  const ingredient = ingredientIn(q);

  if (!q) return { topic: 'leeg', paras: [P('Vraag me iets over de kaart, de spies of de rij.')], follow: STARTERS.slice(0, 4) };

  // Who Sensei is.
  if (has(q, 'wie ben', 'wat ben', 'sensei', 'who are', 'what are you')) {
    return {
      topic: 'sensei',
      paras: [P('Ik ben Sensei, de gastheer van Ninja in je zak. Ik ken de kaart, de spies, de rij en waar alles vandaan komt.'), P('Ik reken alles uit op je toestel, met Ninja’s eigen gegevens. Wat ik niet zeker weet, zeg ik ook.')],
      follow: STARTERS.slice(0, 4),
    };
  }

  // A table for a group, or a budget.
  if (n !== null || max !== null || has(q, 'wat neem', 'wat moet ik', 'wat bestel', 'aanrad', 'advies', 'suggest', 'recommend', 'kies jij', 'stel samen')) {
    if (!(dishes.length && has(q, 'drink', 'wijn', 'wine', 'past bij'))) return answerPlan(n ?? ctx.size ?? 2, max, ctx, q);
  }

  // What to drink with it.
  if (has(q, 'drink', 'drank', 'wijn', 'wine', 'past bij', 'pairing', 'combin')) {
    const d = dishes.find((x) => PAIRINGS[x.id]);
    return {
      topic: 'drinken',
      paras: d ? PAIRINGS[d.id] : [P('Ayran bij alles van de spies, rakı met ijs en water voor wie de avond lang wil maken, en çay om af te sluiten.'), P('Wijn per glas kost {glass}, een fles {bottle}.', { glass: euro(dishById('wine-red').price), bottle: euro(dishById('wine-bottle').price) })],
      dishes: d?.id === 'iskender' ? [{ dish: 'ayran', qty: 1 }] : d?.id === 'ninja-kebab' ? [{ dish: 'raki', qty: 1 }] : d ? undefined : [{ dish: 'ayran', qty: 1 }, { dish: 'raki', qty: 1 }],
      follow: ['Wat zit er in het Ninja Menu?', 'Hoe warm is de spies nu?'],
    };
  }

  if (has(q, 'halal', 'helal')) {
    return {
      topic: 'halal',
      paras: [P('Ja, Ninja serveert halal.'), P('Het vlees aan de spies is rund met kalf en lam, of kip. Wie geen vlees eet, neemt falafel.')],
      follow: ['Wat is vegetarisch?', 'Waar komt het rundvlees vandaan?'],
    };
  }

  if (has(q, 'vegan', 'plantaardig')) {
    return {
      topic: 'vegan',
      paras: [P('Veganistisch zijn de hummus, de ezme, de herderssalade, de falafel op hummus en de lavash.'), P('Yoghurt, schapenboter of melk zit in de andere dips, de Turkse rijst en de rijstpudding. Vraag voor de soep van vandaag even na.'), P('De frieten worden in rundvet gebakken.')],
      dishes: [{ dish: 'falafel-hummus', qty: 1 }, { dish: 'hummus', qty: 1 }, { dish: 'ezme', qty: 1 }],
      note: 'Een indicatie op basis van de kaart; de keuken bevestigt het graag.',
    };
  }

  if (has(q, 'veg', 'vleesloos', 'zonder vlees', 'geen vlees', 'vejetaryen')) {
    return {
      topic: 'vegetarisch',
      paras: [P('Vegetarisch: falafel in een durum of op hummus, alle dips, de soep van vandaag, de lavash, de Turkse rijst en de rijstpudding.'), P('Let op: de Beef Tallow Fries worden in rundvet gebakken. Die zijn dus niet vegetarisch.')],
      dishes: [{ dish: 'durum', meat: 'falafel', portion: '1x', qty: 1 }, { dish: 'falafel-hummus', qty: 1 }, { dish: 'hummus', qty: 1 }],
      follow: ['Wat is veganistisch?', 'Welke sauzen zijn er?'],
    };
  }

  const ALLERGY_WORDS: [RegExp, Allergen][] = [
    [/gluten|tarwe|coeliak/, 'gluten'],
    [/noot|noten|nuts|pistache|pinda/, 'noten'],
    [/sesam|sesame/, 'sesam'],
    [/lactose|melk|zuivel|dairy|milk/, 'melk'],
    [/selder|celery/, 'selder'],
    [/sulfiet|sulfite/, 'sulfiet'],
    [/mosterd|mustard/, 'mosterd'],
    [/\bei\b|eieren|egg/, 'ei'],
  ];
  const allergy = ALLERGY_WORDS.find(([re]) => re.test(q))?.[1];
  if (allergy || has(q, 'allerg')) {
    if (dishes.length && !allergy) {
      const d = dishes[0];
      return { topic: 'allergenen', paras: [d.allergens.length ? P('{name} bevat: {list}.', { name: d.name, list: allergenList(d) }) : P('{name} bevat geen van de veertien allergenen.', { name: d.name })], note: 'Een indicatie op basis van de kaart; de keuken bevestigt het graag.' };
    }
    if (allergy) {
      const free = FOOD.filter((d) => !d.allergens.includes(allergy) && d.cat !== 'menu');
      const contains = FOOD.filter((d) => d.allergens.includes(allergy));
      return {
        topic: 'allergenen',
        paras: [P('Zonder {allergen}: {list}.', { allergen: ALLERGENS[allergy].toLowerCase(), list: free.map((d) => d.name).join(', ') }), P('Met {allergen}: {list}.', { allergen: ALLERGENS[allergy].toLowerCase(), list: contains.map((d) => d.name).join(', ') || '—' })],
        dishes: free.filter((d) => d.cat === 'kebab' || d.cat === 'dips').slice(0, 3).map((d) => ({ dish: d.id, meat: d.meats?.[0], portion: '1x' as Portion, qty: 1 })),
        note: 'Een indicatie op basis van de kaart; de keuken bevestigt het graag.',
      };
    }
    return { topic: 'allergenen', paras: [P('Zeg me welke allergie, of welk gerecht, en ik zoek het op. Bijvoorbeeld: zonder gluten, zonder noten.')], follow: ['Wat is zonder gluten?', 'Wat is zonder noten?'] };
  }

  // Where it comes from, before the sauces (garlic is both).
  if (ingredient && has(q, 'vandaan', 'herkomst', 'afkomst', 'boer', 'lever', 'komt', 'waar haal', 'oorsprong', 'where', 'from', 'nereden', 'origin', 'geoogst', 'vers', 'welk', 'gebruik', 'belg')) return answerProvenance(ingredient, ctx.minute);
  if (has(q, 'vandaan', 'herkomst', 'leverancier', 'boer', 'lokaal', 'local', 'belg')) {
    const local = Object.values(INGREDIENTS).filter((i) => i.country === 'BE').length;
    return {
      topic: 'herkomst',
      paras: [P('{local} van de {total} ingrediënten komen uit België: het vlees, de groenten, de zuivel, het eikenhout. Uit Turkije komen de specerijen, de rijst, de pistache en de thee; het zout uit Pakistan.', { local, total: Object.keys(INGREDIENTS).length }), P('Op elk paspoort staat per ingrediënt waar het vandaan komt en wanneer het geoogst of gebakken is.')],
      note: 'De leveranciers en loten zijn voorbeelden: Ninja vult in het panel zijn eigen leveranciers in.',
      follow: ['Waar komt de sla vandaan?', 'Waar komt het lamsvlees vandaan?'],
    };
  }

  if (has(q, 'saus', 'sauzen', 'sauce', 'sos')) {
    return { topic: 'sauzen', paras: [P('Twee sauzen bij je kebab: yoghurt-knoflooksaus en ui-tomatensaus.'), P('Op de Iskender gaan pikante tomatensaus, schapenboter en yoghurt.')], follow: ['Wat is vegetarisch?', 'Wat zit er in het Ninja Menu?'] };
  }

  if (has(q, 'spies', 'temperatuur', 'graden', 'korst', 'kern', 'hoe warm', 'hoe heet', 'vuur', 'spit', 'temp')) return answerSpit(ctx);
  if (word(q, 'rij') || has(q, 'wacht', 'druk', 'queue', 'wait', 'plaats vrij', 'tafel vrij', 'hoe lang', 'sira')) return answerWait(ctx, n ?? ctx.size ?? 2);
  if (has(q, 'reserv', 'boek', 'groep')) {
    return {
      topic: 'reservatie',
      paras: [P('Reserveren kan helaas niet: je kan gewoon langskomen.'), P('Met de app schuif je wel digitaal in de rij. Voor acht of meer is er de Eigen Spies, met jullie naam in messing.')],
      links: [{ label: 'Schuif in de rij', to: '/rij' }, { label: 'Eigen Spies', to: '/eigen-spies' }],
    };
  }
  if (has(q, 'open', 'uren', 'openingsu', 'sluit', 'gesloten', 'maandag', 'wanneer', 'hours', 'saat')) return answerHours(ctx);
  if (has(q, 'parke', 'parking', 'auto', 'wagen', 'otopark')) {
    return {
      topic: 'parkeren',
      paras: [P('Parkeren kan in {a} ({aa}) en {b} ({bb}), allebei onder de Zuiderdokken.', { a: PARKING[0].name, aa: PARKING[0].address, b: PARKING[1].name, bb: PARKING[1].address }), P('Van Parking Steendok wandel je in drie minuten naar de Vlaamsekaai.')],
      links: [{ label: 'Route en parkings', to: '/route' }],
    };
  }
  if (has(q, 'adres', 'waar zijn', 'waar is', 'route', 'hoe geraak', 'hoe kom', 'address', 'tram', 'bereikba')) {
    return { topic: 'route', paras: [P('{street}, {postcode} {city}, in het Zuid. Aan de kaai, vlak bij het museum.', { street: NINJA.street, postcode: NINJA.postcode, city: NINJA.city })], links: [{ label: 'Route en parkings', to: '/route' }] };
  }
  if (has(q, 'afhal', 'take', 'meenem', 'lever', 'deliver', 'paket', 'gel al')) {
    return { topic: 'afhalen', paras: [P('Afhalen kan helaas niet. Ninja is gemaakt om hier te eten, vers van de spies.'), P('Thuis toch iets van Ninja? Trakteer iemand met Ninja Gift, en kom samen.')], links: [{ label: 'Ninja Gift', to: '/gift' }] };
  }
  if (has(q, 'cadeau', 'bon', 'gift', 'geschenk', 'voucher', 'hediye')) {
    return {
      topic: 'cadeau',
      paras: [P('Een cadeaubon heeft Ninja vandaag niet.'), P('In deze app kan het wel: met Ninja Gift trakteer je iemand op een çay, een durum of Iskender voor twee. Je deelt het als een link.')],
      links: [{ label: 'Ninja Gift', to: '/gift' }],
      note: 'Ninja Gift is een voorstel voor Ninja.',
    };
  }
  if (has(q, 'suiker', 'zout', 'toevoeg', 'bewaar', 'gezond', 'additie', 'sugar')) {
    return { topic: 'huisregels', paras: [P('Geen suikers, bewaarmiddelen of toevoegingen, en alleen Himalayazout. Alles is huisgemaakt, van het desembrood tot de dips.'), P('Het vlees draait aan een verticale spies boven een open vuur van eikenhout.')], follow: ['Waarom desembrood?', 'Welk zout gebruiken jullie?'] };
  }
  if (has(q, 'desem', 'zuurdesem', 'brood')) {
    return { topic: 'desem', paras: [P('Ninja bakt bewust desembrood: het bevat meer B-vitamines, helpt mineralen beter op te nemen, houdt de bloedsuiker in toom en is goed voor de spijsvertering.'), P('De lavash komt uit de Turkse steenoven, elke paar minuten vers.')], dishes: [{ dish: 'lavash', qty: 1 }] };
  }
  if (has(q, 'rundvet', 'frituur', 'vet')) return answerDish(dishById('fries'));
  if (has(q, 'telefoon', 'bellen', 'nummer', 'mail', 'contact', 'phone')) {
    return { topic: 'contact', paras: [P('Bel {phone} of mail {email}.', { phone: NINJA.phone, email: NINJA.email })], links: [{ label: 'Bel Ninja', to: NINJA.phoneHref, external: true }] };
  }
  if (has(q, 'prijs', 'kost', 'hoeveel', 'duur', 'price', 'fiyat')) {
    if (dishes.length) return answerDish(dishes[0]);
    return {
      topic: 'prijzen',
      paras: [P('Van de spies: {list}.', { list: MAINS.map((d) => `${d.name} ${priceLine(d)}`).join(' · ') }), P('Dips {dips}, lavash {lavash}, frieten {fries}.', { dips: euro(11.5), lavash: euro(dishById('lavash').price), fries: euro(dishById('fries').price) })],
      follow: ['Wat nemen we met vier voor € 120?'],
    };
  }
  if (dishes.length) return answerDish(dishes[0]);
  if (has(q, 'menu', 'kaart')) {
    return { topic: 'kaart', paras: [P('Een klein menu, met opzet: Ninja Kebab, Iskender, Durum, Platter Rice, Ninja Rolls en de soep van de dag. Daarnaast dips, lavash, frieten in rundvet en rijstpudding.'), P('Alles van het huis: het Ninja Menu, {price} per persoon.', { price: euro(dishById('ninja-menu').price) })], dishes: [{ dish: 'ninja-menu', meat: 'mix', qty: 1 }] };
  }
  if (has(q, 'hallo', 'hey', 'hoi', 'dag', 'goeiedag', 'goedenavond', 'merhaba', 'hello', 'hi')) {
    return { topic: 'groet', paras: [P('Goedenavond. Waarmee kan ik helpen: de kaart, de spies, of een tafel voor je groep?')], follow: STARTERS.slice(0, 4) };
  }
  if (has(q, 'merci', 'dank', 'thanks', 'tesekkur', 'super', 'top')) return { topic: 'dank', paras: [P('Graag gedaan. Smakelijk.')] };
  return {
    topic: 'onbekend',
    paras: [P('Daar heb ik geen goed antwoord op. Vraag het anders, of vraag het aan Noor aan de deur.')],
    follow: STARTERS.slice(0, 6),
  };
}

/** How long Sensei "types": a little longer for a longer answer, never long. */
export const thinkTime = (a: Answer) => Math.min(1500, 520 + a.paras.reduce((s, p) => s + p.t.length, 0) * 3);
