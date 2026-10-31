// Seeded randomness: the same evening, guest or id always produces the same demo numbers, in the app, the panel and
// on the website.

/** FNV-1a. */
export function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type Rng = () => number;

/** mulberry32: a small, fast generator of numbers in [0, 1). */
export function rng(seed: string | number): Rng {
  let a = typeof seed === 'number' ? seed >>> 0 : hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = <T>(r: Rng, items: readonly T[]): T => items[Math.floor(r() * items.length) % items.length];

/** A whole number from `min` to `max`, both included. */
export const between = (r: Rng, min: number, max: number) => min + Math.floor(r() * (max - min + 1));

export function shuffle<T>(r: Rng, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Picks by weight: `weighted(r, [['a', 3], ['b', 1]])` is "a" three times as often. */
export function weighted<T>(r: Rng, items: readonly (readonly [T, number])[]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let roll = r() * total;
  for (const [item, w] of items) {
    roll -= w;
    if (roll < 0) return item;
  }
  return items[items.length - 1][0];
}

const FIRST = [
  'Lotte', 'Fien', 'Marie', 'Elise', 'Noor', 'Lou', 'Mila', 'Ella', 'Hanne', 'Lien', 'Jade', 'Nina', 'Lena', 'Febe', 'Margot',
  'Chloé', 'Camille', 'Louise', 'Manon', 'Inès', 'Elif', 'Zeynep', 'Defne', 'Melis', 'Aylin', 'Selin', 'Yasmine', 'Salma',
  'Imane', 'Lina', 'Sara', 'Amira', 'Olivia', 'Zoë', 'Anouk', 'Roos', 'Tess', 'Sofia', 'Ana', 'Hana',
];
const FIRST_MEN = [
  'Arno', 'Wout', 'Seppe', 'Lander', 'Robbe', 'Jef', 'Mathis', 'Senne', 'Vic', 'Rune', 'Warre', 'Bas', 'Lowie', 'Stan',
  'Louis', 'Hugo', 'Victor', 'Emre', 'Kaan', 'Mert', 'Can', 'Ilyas', 'Ayoub', 'Bilal', 'Hamza', 'Omar', 'Milan', 'Daan',
];
const LAST = [
  'Peeters', 'Janssens', 'Maes', 'Jacobs', 'Mertens', 'Willems', 'Claes', 'Goossens', 'Wouters', 'De Smet', 'Dubois',
  'Lambert', 'Vermeulen', 'Van den Bossche', 'Hermans', 'Aerts', 'Pauwels', 'Van Damme', 'De Wilde', 'Verhoeven',
  'Van Dyck', 'Michiels', 'Smets', 'Leroy', 'Martens', 'Coppens', 'Van Hoof', 'De Backer', 'Vos', 'Segers',
  'Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Aydın', 'Öztürk', 'El Amrani', 'Bouzid', 'Benali', 'Haddou', 'Rossi',
];

/** A fictional guest: first name and surname. */
export const personName = (r: Rng, man = false) => `${pick(r, man ? FIRST_MEN : FIRST)} ${pick(r, LAST)}`;
