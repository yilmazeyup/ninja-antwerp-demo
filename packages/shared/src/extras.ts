// The rest of the demo's world, all proposals for Ninja: drops, Ninja Nights, the private spit, gifts and the music.
// Times are worked out from "now", so the demo never shows a drop that already passed by a year.

import { addDays, atMinute, startOfDay } from './format';

// --------------------------------------------------------------------------------------------------------- drops

export type Drop = {
  id: string;
  kind: 'gerecht' | 'merch';
  name: string;
  line: string;
  price: number;
  stock: number;
  /** When it opens for everyone; Jōnin and Kage an hour earlier, Chūnin a quarter. */
  opens: Date;
  /** Left at `now` (demo: sold at a steady pace once open). */
  left: number;
  photo: string;
  real?: string;
};

/** The next `weekday` at `minute`, or the last one if it began less than `grace` hours ago. */
function upcoming(now: Date, weekday: number, minute: number, grace = 6): Date {
  let d = addDays(startOfDay(now), -1);
  for (let i = 0; i < 9; i++, d = addDays(d, 1)) {
    const at = atMinute(d, minute);
    if (d.getDay() === weekday && at.getTime() > now.getTime() - grace * 3600000) return at;
  }
  return atMinute(addDays(startOfDay(now), 7), minute);
}

const leftAt = (now: Date, opens: Date, stock: number, perMinute: number, sold = 0) => {
  const minutes = (now.getTime() - opens.getTime()) / 60000;
  return minutes < 0 ? stock : Math.max(0, Math.round(stock - sold - minutes * perMinute));
};

export function dropsAt(now: Date): Drop[] {
  const wagyu = upcoming(now, 5, 18 * 60, 2);
  const weekend = now.getDay() === 0 ? atMinute(addDays(startOfDay(now), -1), 15 * 60) : upcoming(now, 6, 15 * 60, 30);
  const tee = atMinute(addDays(startOfDay(now), -2), 12 * 60);
  const keychain = atMinute(addDays(startOfDay(now), 3), 18 * 60);
  return [
    {
      id: 'wagyu',
      kind: 'gerecht',
      name: 'Wagyu-spies',
      line: 'Eén spies, veertig porties. Japans rund op het Turkse vuur: de enige keer dat Ninja de ninja letterlijk neemt.',
      price: 39,
      stock: 40,
      opens: wagyu,
      left: leftAt(now, wagyu, 40, 1.6),
      photo: 'kebab-platter',
    },
    {
      id: 'baklava',
      kind: 'gerecht',
      name: 'Baklava-ijs',
      line: 'Het ijs van het iftarmenu is terug, één weekend lang.',
      price: 9.5,
      stock: 60,
      opens: weekend,
      left: leftAt(now, weekend, 60, 0.06, 14),
      photo: 'rice-pudding',
      real: 'Stond op Ninja’s iftarmenu',
    },
    {
      id: 'tee',
      kind: 'merch',
      name: 'Love: Kebabs · Hate: Racism',
      line: 'Het T-shirt uit de zaal, opnieuw gedrukt. Wit, zwarte letters, 120 stuks.',
      price: 45,
      stock: 120,
      opens: tee,
      left: Math.max(9, leftAt(now, tee, 120, 0.022)),
      photo: 'gal-tee',
    },
    {
      id: 'keychain',
      kind: 'merch',
      name: 'Puffy N',
      line: 'De N uit het logo als sleutelhanger, in echt bolgestikt leder. 99 genummerde stuks.',
      price: 29,
      stock: 99,
      opens: keychain,
      left: 99,
      photo: 'logo-n',
    },
  ];
}

export type DropState = 'binnenkort' | 'vroeg' | 'live' | 'uitverkocht';

/** Where a drop stands for a member of `rank` at `now`. */
export function dropState(drop: Drop, now: Date, early = 0): DropState {
  const t = now.getTime();
  const opens = drop.opens.getTime();
  if (t >= opens) return drop.left > 0 ? 'live' : 'uitverkocht';
  if (t >= opens - early * 60000) return 'vroeg';
  return 'binnenkort';
}

/** Minutes earlier a rank sees a drop. */
export const EARLY: Record<string, number> = { genin: 0, chunin: 15, jonin: 60, kage: 60 };

// ---------------------------------------------------------------------------------------------------- Ninja Nights

export type Night = { id: string; title: string; line: string; at: Date; until: Date; seats: number; going: number; photo: string; real?: string };

export function nightsAt(now: Date): Night[] {
  const sat = upcoming(now, 6, 19 * 60, 3);
  const thu = upcoming(now, 4, 20 * 60, 2);
  const chef = atMinute(addDays(startOfDay(upcoming(now, 0, 16 * 60, 0)), 7), 16 * 60);
  return [
    { id: 'vinyl', title: 'Vinyl & Vuur', line: 'Turkse psychedelica en house op plaat, de spies draait mee. Met DJ Wout.', at: sat, until: new Date(sat.getTime() + 3 * 3600000), seats: 56, going: 41, photo: 'gal-gold' },
    { id: 'raki', title: 'Rakı-donderdag', line: 'Dips voor de tafel, rakı met ijs en water, en niemand die haast heeft.', at: thu, until: new Date(thu.getTime() + 2 * 3600000), seats: 40, going: 18, photo: 'gal-raki' },
    { id: 'antep', title: 'Gastchef uit Gaziantep', line: 'Eén zondag, één chef uit de stad van de pistache en de sumak.', at: chef, until: new Date(chef.getTime() + 5 * 3600000), seats: 56, going: 52, photo: 'gal-dips' },
    { id: 'iftar', title: 'Iftar bij Ninja', line: 'In de ramadan: het iftarmenu met soep van het huis, zoals Ninja het eerder deed.', at: new Date(2027, 1, 9, 17, 45), until: new Date(2027, 1, 9, 21, 30), seats: 56, going: 12, photo: 'soup', real: 'Ninja had eerder een iftarmenu met soep van het huis' },
  ];
}

// ---------------------------------------------------------------------------------------------------- Eigen Spies

export type SpitPackage = { id: 'spies-8' | 'spies-14'; name: string; guests: [number, number]; kg: number; perPerson: number; line: string };

export const SPIT_PACKAGES: SpitPackage[] = [
  { id: 'spies-8', name: 'Spies voor 8', guests: [8, 10], kg: 6, perPerson: 65, line: 'Een spies van zes kilo, met de hand gelegd, met jouw naam in messing.' },
  { id: 'spies-14', name: 'Spies voor 14', guests: [12, 14], kg: 10, perPerson: 62, line: 'Tien kilo, voor wie groot viert. De hele travertijnen tafel.' },
];

/** What every private spit includes. */
export const SPIT_INCLUDES = ['Soep van de dag', 'Alle dips en lavash uit de steenoven', 'Je eigen spies, aan tafel gesneden', 'Frieten in rundvet en Turkse rijst', 'Rijstpudding met pistache', 'Een paspoort met jullie naam'];

/** The day of a private spit, as the guests follow it live. Minutes relative to the first cut. */
export const SPIT_STEPS = [
  { id: 'marinade', at: -24 * 60, title: 'De marinade', line: 'Rund, kalf en lam gaan 24 uur in de marinade.' },
  { id: 'layers', at: -180, title: 'Met de hand gelegd', line: 'Laag op laag op de spies, je naamplaatje in messing erop.' },
  { id: 'fire', at: -105, title: 'Aan het vuur', line: 'De spies begint te draaien voor het eikenvuur. Volg de temperatuur live.' },
  { id: 'cut', at: 0, title: 'Eerste snede aan tafel', line: 'Baran snijdt de eerste plakken aan jullie tafel.' },
] as const;

/** Before the doors open (12:00, Tuesday to Sunday) or on Monday, when Ninja is closed: the room is yours. */
export const SPIT_SLOTS = [
  { id: 'lunch', label: 'Lunch vóór opening', line: '12:00 tot 14:30, dinsdag tot zondag' },
  { id: 'maandag', label: 'Maandag, heel Ninja', line: 'De zaal voor jullie alleen, 12:00 tot 22:00' },
] as const;

// ----------------------------------------------------------------------------------------------------------- gifts

export const GIFTS = [
  { id: 'cay', label: 'Een çay', line: 'Voor wie je eraan denkt.', amount: 2.5 },
  { id: 'durum', label: 'Een durum', line: 'Lunch op jou.', amount: 16.5 },
  { id: 'iskender', label: 'Iskender voor twee', line: 'Het signatuurgerecht, twee keer.', amount: 59 },
  { id: 'menu', label: 'Ninja Menu voor twee', line: 'Alles van het huis.', amount: 85 },
] as const;

// ----------------------------------------------------------------------------------------------------------- music

export const PLAYLIST = [
  { artist: 'Altın Gün', title: 'Goca Dünya', seconds: 253 },
  { artist: 'Barış Manço', title: 'Gülpembe', seconds: 275 },
  { artist: 'Peggy Gou', title: '(It Goes Like) Nanana', seconds: 199 },
  { artist: 'Selda Bağcan', title: 'Yaz Gazeteci Yaz', seconds: 188 },
  { artist: 'Stromae', title: 'Alors on danse', seconds: 207 },
  { artist: 'Khruangbin', title: 'Maria También', seconds: 191 },
  { artist: 'Erkin Koray', title: 'Cemalim', seconds: 255 },
  { artist: 'Bicep', title: 'Glue', seconds: 269 },
  { artist: 'Tarkan', title: 'Şımarık', seconds: 237 },
  { artist: 'Fred again..', title: 'Delilah (pull me out of this)', seconds: 271 },
  { artist: 'Sezen Aksu', title: 'Firuze', seconds: 251 },
  { artist: 'Jungle', title: 'Back On 74', seconds: 213 },
] as const;

/** The track playing at `now`, and how far in. */
export function nowPlaying(now: Date) {
  const total = PLAYLIST.reduce((s, t) => s + t.seconds, 0);
  let s = Math.floor(now.getTime() / 1000) % total;
  for (let i = 0; i < PLAYLIST.length; i++) {
    const t = PLAYLIST[i];
    if (s < t.seconds) return { track: t, at: s, next: PLAYLIST[(i + 1) % PLAYLIST.length] };
    s -= t.seconds;
  }
  return { track: PLAYLIST[0], at: 0, next: PLAYLIST[1] };
}

export const spotifySearch = (artist: string, title: string) => `https://open.spotify.com/search/${encodeURIComponent(`${artist} ${title}`)}`;
