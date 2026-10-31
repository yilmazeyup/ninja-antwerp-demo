// The demo's team. Ninja's real crew is not named anywhere in the demo; these people are invented, with the white
// headband Ninja's chefs wear in the restaurant's own photos.

import type { Station } from './menu';

export type TeamId = 'baran' | 'deniz' | 'ilyas' | 'noor' | 'seppe' | 'fien' | 'robbe' | 'yasmine';

export type Member = {
  id: TeamId;
  name: string;
  role: string;
  station: Station | 'host' | 'floor';
  /** Wears the white headband of the kitchen. */
  headband: boolean;
  /** Skin, hair and outfit colours for the 3D figures. */
  skin: string;
  hair: string;
  outfit: string;
  line: string;
};

export const TEAM: Member[] = [
  { id: 'baran', name: 'Baran', role: 'Spiesmeester', station: 'spit', headband: true, skin: '#C98E66', hair: '#1D1612', outfit: '#F2EEE8', line: 'Snijdt elke portie met de hand, op het moment dat de korst klopt.' },
  { id: 'deniz', name: 'Deniz', role: 'Steenoven', station: 'oven', headband: true, skin: '#B67A55', hair: '#2A1C14', outfit: '#F2EEE8', line: 'Slaat de lavash tegen de ovenwand, elke zes minuten een nieuwe lading.' },
  { id: 'ilyas', name: 'Ilyas', role: 'Koude keuken', station: 'cold', headband: true, skin: '#A86F4C', hair: '#14100D', outfit: '#F2EEE8', line: 'Dips, salades, de uiensalade met sumak.' },
  { id: 'noor', name: 'Noor', role: 'Gastvrouw', station: 'host', headband: false, skin: '#8E5B3D', hair: '#100C0A', outfit: '#141011', line: 'Houdt de rij, de tafels en de vaste gasten bij.' },
  { id: 'seppe', name: 'Seppe', role: 'Bar', station: 'bar', headband: false, skin: '#EAC2A2', hair: '#9A6B3E', outfit: '#141011', line: 'Rakı, çay, Aperol, en de drankjes die gasten elkaar sturen.' },
  { id: 'fien', name: 'Fien', role: 'Zaal', station: 'floor', headband: false, skin: '#F0CDB2', hair: '#C9A26A', outfit: '#141011', line: 'Brengt de borden van de pas naar de tafel, met het paspoort erbij.' },
  { id: 'robbe', name: 'Robbe', role: 'Zaal', station: 'floor', headband: false, skin: '#E6BC9C', hair: '#3B2A1E', outfit: '#141011', line: 'Terras en ramen.' },
  { id: 'yasmine', name: 'Yasmine', role: 'Runner', station: 'floor', headband: false, skin: '#9C6644', hair: '#120E0C', outfit: '#141011', line: 'Van de pas naar de tafel in minder dan een minuut.' },
];

const BY_ID = new Map(TEAM.map((m) => [m.id, m]));
export const memberById = (id: TeamId): Member => BY_ID.get(id) ?? TEAM[0];
