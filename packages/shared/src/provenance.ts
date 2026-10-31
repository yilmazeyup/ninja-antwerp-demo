// Where every ingredient comes from, for the plate passport and the provenance map. Ninja's real facts are marked
// `real`: Himalayan salt only, an oak-wood fire, lavash from the stone oven, sourdough, fries in beef fat, sheep's-milk
// butter on the Iskender. The producers, places, lots and times are EXAMPLES for the demo: Ninja fills in its own
// suppliers in the panel, and every passport then shows them.

import { NINJA } from './brand';
import { rng, type Rng } from './random';

export type IngredientId =
  | 'beef' | 'veal' | 'lamb' | 'chicken' | 'himalayan_salt' | 'oak' | 'lavash' | 'flour' | 'sourdough' | 'onion' | 'sumac'
  | 'parsley' | 'lettuce' | 'tomato' | 'potato' | 'tallow' | 'yoghurt' | 'chickpeas' | 'tahini' | 'rice' | 'milk'
  | 'pistachio' | 'garlic' | 'sheep_butter' | 'pepper' | 'pulbiber' | 'lentils' | 'carrot' | 'lemon' | 'cucumber'
  | 'mint' | 'dill' | 'zaatar' | 'tea' | 'raki';

export type Freshness =
  /** Picked or harvested: hours before it reaches the plate. */
  | { kind: 'harvest'; hour: number; minute: number; daysAgo: number }
  /** Baked or made in the house today. */
  | { kind: 'baked'; everyMinutes: number }
  /** Delivered: days ago. */
  | { kind: 'delivered'; daysAgo: number }
  /** Aged, dried or matured: a span. */
  | { kind: 'aged'; text: string };

export type Ingredient = {
  id: IngredientId;
  name: string;
  group: 'vlees' | 'groente' | 'kruid' | 'brood' | 'zuivel' | 'specerij' | 'vuur' | 'graan' | 'noot' | 'peulvrucht' | 'drank';
  producer: string;
  place: string;
  country: 'BE' | 'NL' | 'TR' | 'PK' | 'IE' | 'ES';
  lat: number;
  lon: number;
  /** One line about how it is grown, made or chosen. */
  story: string;
  fresh: Freshness;
  /** A fact from Ninja itself (menu, site); the rest of the line is an example. */
  real?: string;
};

export const COUNTRY_NAMES: Record<Ingredient['country'], string> = {
  BE: 'België',
  NL: 'Nederland',
  TR: 'Turkije',
  PK: 'Pakistan',
  IE: 'Ierland',
  ES: 'Spanje',
};

export const INGREDIENTS: Record<IngredientId, Ingredient> = {
  beef: { id: 'beef', name: 'Rundvlees', group: 'vlees', producer: 'Halal Vleeshuis Kempen', place: 'Geel', country: 'BE', lat: 51.162, lon: 4.99, story: 'Belgisch rund, halal geslacht, 24 uur gemarineerd en met de hand op de spies gelegd.', fresh: { kind: 'delivered', daysAgo: 1 }, real: 'Gemarineerd rundvlees met kalf en lam' },
  veal: { id: 'veal', name: 'Kalfsvlees', group: 'vlees', producer: 'Kalverhoeve Limburg', place: 'Bree', country: 'BE', lat: 51.14, lon: 5.6, story: 'Kalf voor de zachtheid, in lagen tussen het rund.', fresh: { kind: 'delivered', daysAgo: 1 }, real: 'Rund met kalf en lam' },
  lamb: { id: 'lamb', name: 'Lamsvlees', group: 'vlees', producer: 'Schapenhoeve De Hei', place: 'Bastogne', country: 'BE', lat: 50.0, lon: 5.716, story: 'Lam uit de Ardennen, voor het vet dat de spies sappig houdt.', fresh: { kind: 'delivered', daysAgo: 2 }, real: 'Rund met kalf en lam' },
  chicken: { id: 'chicken', name: 'Kip', group: 'vlees', producer: 'Hoeve Vandenberghe', place: 'Torhout', country: 'BE', lat: 51.065, lon: 3.104, story: 'Scharrelkip, halal, de dij met vel voor de korst.', fresh: { kind: 'delivered', daysAgo: 1 } },
  himalayan_salt: { id: 'himalayan_salt', name: 'Himalayazout', group: 'specerij', producer: 'Zoutmijn van Khewra', place: 'Khewra, Punjab', country: 'PK', lat: 32.648, lon: 73.008, story: 'Roze steenzout uit de oudste zoutmijn van de Himalaya. Het enige zout in de keuken.', fresh: { kind: 'aged', text: '±600 miljoen jaar oud' }, real: 'Alleen Himalayazout' },
  oak: { id: 'oak', name: 'Eikenhout', group: 'vuur', producer: 'Houthandel Ardennes', place: 'La Roche-en-Ardenne', country: 'BE', lat: 50.183, lon: 5.576, story: 'Gekloofd eikenhout, achttien maanden gedroogd: een heet, rustig vuur zonder bittere rook.', fresh: { kind: 'aged', text: '18 maanden gedroogd' }, real: 'Open vuur van eikenhout' },
  lavash: { id: 'lavash', name: 'Lavash', group: 'brood', producer: 'Ninja, de steenoven', place: 'Vlaamsekaai 52', country: 'BE', lat: NINJA.lat, lon: NINJA.lon, story: 'Elke paar minuten tegen de wand van de steenoven geslagen, zoals in Istanbul.', fresh: { kind: 'baked', everyMinutes: 6 }, real: 'Lavash uit een traditionele Turkse steenoven' },
  flour: { id: 'flour', name: 'Bloem', group: 'graan', producer: 'Stenen molen Ter Hoeve', place: 'Brecht', country: 'BE', lat: 51.35, lon: 4.638, story: 'Op steen gemalen tarwe, voor de lavash en het desembrood.', fresh: { kind: 'delivered', daysAgo: 3 } },
  sourdough: { id: 'sourdough', name: 'Desembrood', group: 'brood', producer: 'Ninja, desem “Hanzo”', place: 'Vlaamsekaai 52', country: 'BE', lat: NINJA.lat, lon: NINJA.lon, story: 'Onze desem wordt elke ochtend gevoed en rijst 18 uur.', fresh: { kind: 'baked', everyMinutes: 180 }, real: 'Bewust desembrood' },
  onion: { id: 'onion', name: 'Rode ui', group: 'groente', producer: 'Akkerbouw De Kempen', place: 'Hoogstraten', country: 'BE', lat: 51.4, lon: 4.76, story: 'Gesneden voor de uiensalade, met sumak en peterselie.', fresh: { kind: 'harvest', hour: 7, minute: 10, daysAgo: 4 } },
  sumac: { id: 'sumac', name: 'Sumak', group: 'specerij', producer: 'Baharatçı Usta', place: 'Gaziantep', country: 'TR', lat: 37.066, lon: 37.383, story: 'Zuur, dieprood, met de hand gemalen.', fresh: { kind: 'delivered', daysAgo: 12 } },
  parsley: { id: 'parsley', name: 'Bladpeterselie', group: 'kruid', producer: 'Kruidenkwekerij Mertens', place: 'Mechelen', country: 'BE', lat: 51.028, lon: 4.48, story: 'Elke ochtend gesneden, nooit uit een zak.', fresh: { kind: 'harvest', hour: 6, minute: 20, daysAgo: 0 } },
  lettuce: { id: 'lettuce', name: 'Sla', group: 'groente', producer: 'Tuinbouw Van Hoof', place: 'Sint-Katelijne-Waver', country: 'BE', lat: 51.067, lon: 4.533, story: 'Romaine, vanochtend vroeg gesneden in de groentestreek rond Mechelen.', fresh: { kind: 'harvest', hour: 5, minute: 50, daysAgo: 0 }, real: 'Verse sla' },
  tomato: { id: 'tomato', name: 'Tomaat', group: 'groente', producer: 'Serre Peeters', place: 'Duffel', country: 'BE', lat: 51.095, lon: 4.494, story: 'Trostomaten die rijp geplukt worden.', fresh: { kind: 'harvest', hour: 6, minute: 5, daysAgo: 1 } },
  potato: { id: 'potato', name: 'Aardappel', group: 'groente', producer: 'Hoeve Coppens', place: 'Hoogstraten', country: 'BE', lat: 51.41, lon: 4.77, story: 'Bintje, het Belgische frietras, met de hand gesneden.', fresh: { kind: 'delivered', daysAgo: 2 } },
  tallow: { id: 'tallow', name: 'Rundvet', group: 'vlees', producer: 'Halal Vleeshuis Kempen', place: 'Geel', country: 'BE', lat: 51.162, lon: 4.99, story: 'Zuiver rundvet voor de frieten: zoals frieten vroeger smaakten.', fresh: { kind: 'delivered', daysAgo: 3 }, real: 'Frieten gebakken in rundvet' },
  yoghurt: { id: 'yoghurt', name: 'Yoghurt', group: 'zuivel', producer: 'Zuivelhoeve De Veldekens', place: 'Herentals', country: 'BE', lat: 51.177, lon: 4.836, story: 'Volle yoghurt, voor de dips, de saus en de ayran.', fresh: { kind: 'delivered', daysAgo: 1 }, real: 'Alle dips zijn huisgemaakt' },
  chickpeas: { id: 'chickpeas', name: 'Kikkererwten', group: 'peulvrucht', producer: 'Ova Bakliyat', place: 'Konya', country: 'TR', lat: 37.874, lon: 32.493, story: 'Een nacht geweekt, voor de hummus en de falafel.', fresh: { kind: 'delivered', daysAgo: 10 } },
  tahini: { id: 'tahini', name: 'Tahin', group: 'noot', producer: 'Tahinci Hasan', place: 'Gaziantep', country: 'TR', lat: 37.07, lon: 37.38, story: 'Geroosterde sesam, op steen gemalen.', fresh: { kind: 'delivered', daysAgo: 14 } },
  rice: { id: 'rice', name: 'Rijst', group: 'graan', producer: 'Osmancık Çeltik', place: 'Osmancık, Çorum', country: 'TR', lat: 40.978, lon: 34.803, story: 'Osmancık-rijst: de korrel die Turkse pilav korrelig houdt.', fresh: { kind: 'delivered', daysAgo: 9 } },
  milk: { id: 'milk', name: 'Melk', group: 'zuivel', producer: 'Zuivelhoeve De Veldekens', place: 'Herentals', country: 'BE', lat: 51.177, lon: 4.836, story: 'Volle melk voor de rijstpudding en de koffie.', fresh: { kind: 'delivered', daysAgo: 1 } },
  pistachio: { id: 'pistachio', name: 'Pistache', group: 'noot', producer: 'Fıstıkçı Şahin', place: 'Gaziantep', country: 'TR', lat: 37.06, lon: 37.37, story: 'Antep-pistache, het groenste van de oogst.', fresh: { kind: 'delivered', daysAgo: 20 }, real: 'Rijstpudding met pistache' },
  garlic: { id: 'garlic', name: 'Look', group: 'groente', producer: 'Taşköprü Kooperatifi', place: 'Taşköprü, Kastamonu', country: 'TR', lat: 41.51, lon: 34.215, story: 'Taşköprü-look, aan strengen gedroogd: dezelfde die boven de toog hangen.', fresh: { kind: 'aged', text: '6 weken aan de streng' } },
  sheep_butter: { id: 'sheep_butter', name: 'Schapenboter', group: 'zuivel', producer: 'Urfa Sade Yağ', place: 'Şanlıurfa', country: 'TR', lat: 37.159, lon: 38.796, story: 'Geklaarde schapenboter, gesmolten over de Iskender aan tafel.', fresh: { kind: 'delivered', daysAgo: 8 }, real: 'Iskender met schapenboter' },
  pepper: { id: 'pepper', name: 'Groene peper', group: 'groente', producer: 'Serre Antalya', place: 'Antalya', country: 'TR', lat: 36.897, lon: 30.713, story: 'Sivri biber, kort gegrild op het vuur.', fresh: { kind: 'delivered', daysAgo: 3 } },
  pulbiber: { id: 'pulbiber', name: 'Pul biber', group: 'specerij', producer: 'Maraş Biberi', place: 'Kahramanmaraş', country: 'TR', lat: 37.585, lon: 36.937, story: 'Gedroogde Maraş-peper in vlokken, fruitig eerder dan heet.', fresh: { kind: 'delivered', daysAgo: 12 } },
  lentils: { id: 'lentils', name: 'Rode linzen', group: 'peulvrucht', producer: 'Ova Bakliyat', place: 'Konya', country: 'TR', lat: 37.874, lon: 32.493, story: 'Voor de soep van vandaag.', fresh: { kind: 'delivered', daysAgo: 10 } },
  carrot: { id: 'carrot', name: 'Wortel', group: 'groente', producer: 'Tuinbouw Van Hoof', place: 'Sint-Katelijne-Waver', country: 'BE', lat: 51.067, lon: 4.533, story: 'Geroosterd en fijngewreven voor de wortel­dip.', fresh: { kind: 'harvest', hour: 6, minute: 30, daysAgo: 2 } },
  lemon: { id: 'lemon', name: 'Citroen', group: 'groente', producer: 'Huerta de Murcia', place: 'Murcia', country: 'ES', lat: 37.992, lon: -1.131, story: 'Onbespoten, de schil gaat mee in de dips.', fresh: { kind: 'delivered', daysAgo: 4 } },
  cucumber: { id: 'cucumber', name: 'Komkommer', group: 'groente', producer: 'Serre Peeters', place: 'Duffel', country: 'BE', lat: 51.095, lon: 4.494, story: 'Kleine komkommers met dunne schil.', fresh: { kind: 'harvest', hour: 6, minute: 0, daysAgo: 1 } },
  mint: { id: 'mint', name: 'Munt', group: 'kruid', producer: 'Kruidenkwekerij Mertens', place: 'Mechelen', country: 'BE', lat: 51.028, lon: 4.48, story: 'Verse munt voor de yoghurt­dip.', fresh: { kind: 'harvest', hour: 6, minute: 20, daysAgo: 0 } },
  dill: { id: 'dill', name: 'Dille', group: 'kruid', producer: 'Kruidenkwekerij Mertens', place: 'Mechelen', country: 'BE', lat: 51.028, lon: 4.48, story: 'Fijn gesneden, vlak voor de service.', fresh: { kind: 'harvest', hour: 6, minute: 20, daysAgo: 0 } },
  zaatar: { id: 'zaatar', name: 'Za’atar', group: 'specerij', producer: 'Baharatçı Usta', place: 'Gaziantep', country: 'TR', lat: 37.066, lon: 37.383, story: 'Tijm, sesam en sumak.', fresh: { kind: 'delivered', daysAgo: 12 } },
  tea: { id: 'tea', name: 'Thee', group: 'drank', producer: 'Rize Çay Bahçeleri', place: 'Rize', country: 'TR', lat: 41.025, lon: 40.517, story: 'Zwarte thee van de Zwarte Zeekust, in de dubbele ketel gezet.', fresh: { kind: 'delivered', daysAgo: 15 } },
  raki: { id: 'raki', name: 'Rakı', group: 'drank', producer: 'Ege Damıtımevi', place: 'İzmir', country: 'TR', lat: 38.423, lon: 27.143, story: 'Anijs, twee keer gestookt.', fresh: { kind: 'aged', text: '30 dagen in eiken' } },
};

export const ingredient = (id: IngredientId) => INGREDIENTS[id];

/** Kilometres from Ninja, as the crow flies. */
export function distanceKm(lat: number, lon: number, from: { lat: number; lon: number } = NINJA): number {
  const r = Math.PI / 180;
  const dLat = (lat - from.lat) * r;
  const dLon = (lon - from.lon) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(from.lat * r) * Math.cos(lat * r) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const kmOf = (id: IngredientId) => Math.round(distanceKm(INGREDIENTS[id].lat, INGREDIENTS[id].lon));

/** The meat on the plate for each choice. */
export function meatIngredients(meat: 'beef' | 'chicken' | 'mix' | 'falafel' | undefined): IngredientId[] {
  if (meat === 'chicken') return ['chicken'];
  if (meat === 'mix') return ['beef', 'veal', 'lamb', 'chicken'];
  if (meat === 'falafel') return ['chickpeas', 'tahini'];
  return ['beef', 'veal', 'lamb'];
}

/** A lot number for an ingredient on a given day: stable, so the passport and the panel agree. */
export function lotOf(id: IngredientId, dayKey: string): string {
  const r: Rng = rng(`${id}-${dayKey}`);
  const letters = 'ABCDEFGHJKLMNPRSTUVWXYZ';
  return `${letters[Math.floor(r() * letters.length)]}${letters[Math.floor(r() * letters.length)]}-${String(1000 + Math.floor(r() * 9000))}`;
}

/** "vanochtend 05:50", "gisteren 06:05", "3 dagen geleden": when this ingredient last changed hands. */
export function freshLine(id: IngredientId, minuteOfService: number): string {
  const f = INGREDIENTS[id].fresh;
  const hm = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  switch (f.kind) {
    case 'harvest':
      return f.daysAgo === 0 ? `geoogst vanochtend ${hm(f.hour, f.minute)}` : f.daysAgo === 1 ? `geoogst gisteren ${hm(f.hour, f.minute)}` : `geoogst ${f.daysAgo} dagen geleden`;
    case 'baked': {
      // The last batch before this moment of the service.
      const at = Math.max(14 * 60, Math.floor(minuteOfService / f.everyMinutes) * f.everyMinutes);
      return `gebakken om ${hm(Math.floor(at / 60), at % 60)}`;
    }
    case 'delivered':
      return f.daysAgo === 0 ? 'vandaag geleverd' : f.daysAgo === 1 ? 'gisteren geleverd' : `${f.daysAgo} dagen geleden geleverd`;
    case 'aged':
      return f.text;
  }
}
