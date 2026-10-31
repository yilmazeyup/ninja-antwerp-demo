// Ninja Match and the Wall. Match is opt-in and only works while you are inside Ninja: guests who switch it on show a
// photo, why they are out tonight and what they ordered; you can send a çay or a drink to their table, and when two
// people like each other a chat opens. Everything disappears at closing time. The people below are invented, with
// stock portraits; they are placed at tables of the demo evening, so the panel sees the same room.

import { seatedAt, type Evening, type Group } from './evening';
import { hash } from './random';

export type Intent = 'date' | 'vriendschap' | 'netwerk';

export const INTENTS: Record<Intent, { label: string; line: string }> = {
  date: { label: 'Date', line: 'Open voor een date' },
  vriendschap: { label: 'Vrienden', line: 'Nieuwe mensen leren kennen' },
  netwerk: { label: 'Netwerk', line: 'Praten over werk en ideeën' },
};

export type Persona = {
  id: string;
  name: string;
  age: number;
  /** Key of the portrait (w01…, m01…), resolved by each screen. */
  photo: string;
  intent: Intent;
  job: string;
  line: string;
  vibe: string[];
};

export const PERSONAS: Persona[] = [
  { id: 'p-ines', name: 'Inès', age: 29, photo: 'w01', intent: 'date', job: 'Modeontwerper', line: 'Hier voor de Iskender, ik blijf voor de rakı.', vibe: ['Mode', 'Vinyl', 'Rakı'] },
  { id: 'p-arno', name: 'Arno', age: 32, photo: 'm01', intent: 'netwerk', job: 'Architect', line: 'Kom voor het gebouw, blijf voor de lavash.', vibe: ['Architectuur', 'Padel', 'Ezme'] },
  { id: 'p-fien', name: 'Fien', age: 27, photo: 'w02', intent: 'vriendschap', job: 'Fotograaf', line: 'Altijd met een wegwerpcamera op zak.', vibe: ['Film', 'Kunst', 'Durum'] },
  { id: 'p-kaan', name: 'Kaan', age: 30, photo: 'm02', intent: 'date', job: 'Chef-pâtissier', line: 'Ik beoordeel elke rijstpudding in Antwerpen.', vibe: ['Dessert', 'Techno', 'Çay'] },
  { id: 'p-margot', name: 'Margot', age: 31, photo: 'w03', intent: 'netwerk', job: 'Galeriehouder', line: 'Op zoek naar kunstenaars die ook van vuur houden.', vibe: ['Kunst', 'Wijn', 'Iskender'] },
  { id: 'p-wout', name: 'Wout', age: 28, photo: 'm03', intent: 'vriendschap', job: 'DJ', line: 'Ik draai vanavond om tien uur een straat verder.', vibe: ['Muziek', 'Nacht', 'Ayran'] },
  { id: 'p-selin', name: 'Selin', age: 26, photo: 'w04', intent: 'date', job: 'Juriste', line: 'Mix, anderhalve portie, geen discussie.', vibe: ['Reizen', 'Boeken', 'Mix'] },
  { id: 'p-lowie', name: 'Lowie', age: 34, photo: 'm04', intent: 'netwerk', job: 'Oprichter van een startup', line: 'Vraag me niets over AI, vraag me naar de korst.', vibe: ['Startups', 'Hardlopen', 'Ninja Kebab'] },
  { id: 'p-amira', name: 'Amira', age: 30, photo: 'w05', intent: 'vriendschap', job: 'Interieurarchitect', line: 'Die spaceship-bar is mijn favoriete plek van de stad.', vibe: ['Design', 'Chroom', 'Hummus'] },
  { id: 'p-victor', name: 'Victor', age: 29, photo: 'm05', intent: 'date', job: 'Diamantslijper', line: 'Ik werk met kleine dingen die schitteren.', vibe: ['Ambacht', 'Jazz', 'Rakı'] },
  { id: 'p-lou', name: 'Lou', age: 25, photo: 'w06', intent: 'date', job: 'Student aan de Academie', line: 'Mijn eindcollectie is in ossenbloedrood. Toeval?', vibe: ['Mode', 'Tekenen', 'Falafel'] },
  { id: 'p-emre', name: 'Emre', age: 33, photo: 'm06', intent: 'vriendschap', job: 'Fysiotherapeut', line: 'Elke zaterdag hier, altijd aan het vuur.', vibe: ['Voetbal', 'Koken', 'Iskender'] },
  { id: 'p-hanne', name: 'Hanne', age: 35, photo: 'w07', intent: 'netwerk', job: 'Creatief directeur', line: 'Ik zoek een fotograaf voor een campagne. Nu.', vibe: ['Merken', 'Film', 'Cava'] },
  { id: 'p-louis', name: 'Louis', age: 27, photo: 'm07', intent: 'date', job: 'Sommelier', line: 'Ja, rode wijn bij kebab. Ik leg het je uit.', vibe: ['Wijn', 'Fietsen', 'Platter Rice'] },
  { id: 'p-yasmine', name: 'Yasmine', age: 28, photo: 'w08', intent: 'vriendschap', job: 'Verpleegkundige', line: 'Na een nachtdienst: durum en çay.', vibe: ['Dansen', 'Koffie', 'Durum'] },
  { id: 'p-stan', name: 'Stan', age: 31, photo: 'm08', intent: 'netwerk', job: 'Fotojournalist', line: 'Ik maak de flitsfoto’s van de stad.', vibe: ['Straat', 'Flits', 'Ezme'] },
];

export const personaById = (id: string) => PERSONAS.find((p) => p.id === id);

export type Tonight = { persona: Persona; group: Group; table: string; likesYou: boolean };

/** Who has Match on right now: about one table in four, each with one person who switched it on. */
export function matchTonight(ev: Evening, m: number): Tonight[] {
  const out: Tonight[] = [];
  const used = new Set<string>();
  for (const g of seatedAt(ev, m)) {
    if (!g.table || hash(`match-${g.id}`) % 4 !== 0) continue;
    let i = hash(`persona-${g.id}`) % PERSONAS.length;
    for (let k = 0; k < PERSONAS.length && used.has(PERSONAS[i].id); k++) i = (i + 1) % PERSONAS.length;
    if (used.has(PERSONAS[i].id)) continue;
    used.add(PERSONAS[i].id);
    out.push({ persona: PERSONAS[i], group: g, table: g.table, likesYou: hash(`likes-${PERSONAS[i].id}-${ev.key}`) % 3 !== 1 });
  }
  return out;
}

/** What you can send to another table: a few things from Ninja's bar, at the menu's prices. */
export const SENDABLE = [
  { dish: 'cay', label: 'Een çay', line: 'Het klassieke gebaar.' },
  { dish: 'ayran', label: 'Een ayran', line: 'Huisgemaakt.' },
  { dish: 'raki', label: 'Een rakı', line: 'Voor wie durft.' },
  { dish: 'cava', label: 'Een glas cava', line: 'Er is iets te vieren.' },
  { dish: 'aperol', label: 'Een Aperol Spritz', line: 'Zonder woorden.' },
  { dish: 'rice-pudding', label: 'Een rijstpudding', line: 'Om het zoet te houden.' },
] as const;

/**
 * The Wall: the night's flash photos on the screen inside Ninja and on the website. These are Ninja's own photos from
 * its gallery; guests' photos from the Flash camera join them once the floor approves.
 */
export const WALL_SEED = [
  { photo: 'gal-spit', caption: 'De spies, net na zes uur', likes: 41 },
  { photo: 'gal-chef', caption: 'Witte hoofdband, scherp mes', likes: 58 },
  { photo: 'gal-oven', caption: 'De steenoven uit Istanbul', likes: 37 },
  { photo: 'gal-table', caption: 'Alles van het huis', likes: 64 },
  { photo: 'gal-crew', caption: 'Het team van vanavond', likes: 49 },
  { photo: 'gal-tee', caption: 'Love: kebabs. Hate: racism.', likes: 88 },
  { photo: 'gal-dips', caption: 'Dips voor de hele tafel', likes: 33 },
  { photo: 'gal-hoodie', caption: 'Ninja aan de toog', likes: 52 },
  { photo: 'gal-raki', caption: 'Rakı-uur', likes: 29 },
  { photo: 'gal-falafel', caption: 'Falafel, vers gedraaid', likes: 26 },
  { photo: 'gal-gold', caption: 'Zaterdagavond', likes: 71 },
  { photo: 'gal-door', caption: 'De deur aan de Vlaamsekaai', likes: 35 },
] as const;
