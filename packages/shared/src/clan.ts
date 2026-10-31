// Ninja Clan: membership with the ninja ranks, earned by visits; Kage, the shadow, is by invitation only. Perks are
// what a regular in a walk-in restaurant wants most: a shorter line, first access to drops, the fire row. All of it is
// a proposal for Ninja; the member below is the demo's guest.

import type { Rank } from './evening';

export type RankInfo = {
  id: Rank;
  name: string;
  kanji: string;
  /** Visits to get there; Kage has none, it is an invitation. */
  visits: number | null;
  line: string;
  perks: string[];
};

export const RANKS: RankInfo[] = [
  {
    id: 'genin',
    name: 'Genin',
    kanji: '下忍',
    visits: 1,
    line: 'Je eerste bezoek. Je paspoorten worden een verzameling.',
    perks: ['Je paspoorten, bewaard', 'Rijstpudding op je verjaardag', 'Ki bij elk bezoek'],
  },
  {
    id: 'chunin',
    name: 'Chūnin',
    kanji: '中忍',
    visits: 5,
    line: 'Vijf bezoeken. Je schuift sneller op in de rij.',
    perks: ['Voorrang in de digitale rij', 'Drops 15 minuten eerder', 'Melding bij de eerste snede'],
  },
  {
    id: 'jonin',
    name: 'Jōnin',
    kanji: '上忍',
    visits: 15,
    line: 'Vijftien bezoeken. Je hebt een plek aan het vuur.',
    perks: ['Vooraan in de rij', 'Drops een uur eerder', 'De vuurrij op vrijdag en zaterdag', 'Eigen Spies − 10 %'],
  },
  {
    id: 'kage',
    name: 'Kage',
    kanji: '影',
    visits: null,
    line: 'Alleen op uitnodiging. De schaduw wacht nooit.',
    perks: ['Geen rij, nooit', 'Een gast mee zonder wachten', 'De Kage-tafel', 'Zwarte kaart in metaal'],
  },
];

export const rankInfo = (id: Rank) => RANKS.find((r) => r.id === id) ?? RANKS[0];

/** Ki: points per visit and per euro, spent on dishes and drops. */
export const KI_PER_EURO = 10;

export type MemberCard = {
  name: string;
  first: string;
  rank: Rank;
  since: string;
  visits: number;
  ki: number;
  /** The usual: one tap orders it again. */
  usual: { dish: string; meat: 'beef' | 'chicken' | 'mix'; portion: '1x' | '1,5x'; extras: string[] };
  /** Where she likes to sit. */
  seat: 'fire' | 'banquette' | 'bar' | 'window' | 'center';
  birthday: string;
  number: string;
};

/** The demo's guest: a regular from the Zuid. */
export const ME: MemberCard = {
  name: 'Margaux De Smet',
  first: 'Margaux',
  rank: 'jonin',
  since: '2024-03-09',
  visits: 17,
  ki: 2340,
  usual: { dish: 'iskender', meat: 'mix', portion: '1,5x', extras: ['ezme', 'ayran'] },
  seat: 'fire',
  birthday: '11-14',
  number: '0417',
};

/** Who comes along tonight. */
export const ME_GUESTS = ['Lien', 'Jef', 'Nora'] as const;
