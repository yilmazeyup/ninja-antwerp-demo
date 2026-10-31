// The plate passport: every plate cut from the spit gets a number, the second it was cut, the temperature in the slice
// then and at the table, the spit, the fire, the carver, and where each ingredient on the plate comes from. The
// passport is sealed with a short code so anyone can check it on the website (/website/#paspoort-<number>).

import { dateKey, minuteOf } from './format';
import { evening, type Evening, type Plate } from './evening';
import { dishById, MEATS, type Meat } from './menu';
import { freshLine, INGREDIENTS, kmOf, lotOf, meatIngredients, type IngredientId } from './provenance';
import { hash } from './random';
import { memberById } from './team';
import { atTable, fireAt, spitAt } from './telemetry';

export type PassportLine = {
  id: IngredientId;
  name: string;
  place: string;
  country: string;
  km: number;
  lot: string;
  when: string;
  producer: string;
  real?: string;
};

export type Passport = {
  no: number;
  /** "NJ-1·2B7F": number and seal together, for checking. */
  code: string;
  seal: string;
  dish: string;
  dishName: string;
  meat?: Meat;
  meatLabel?: string;
  portion: string;
  table: string;
  /** Wall-clock moments as minutes after midnight on `day` (with seconds as a fraction). */
  carved: number;
  served: number;
  secondsToTable: number;
  core: number;
  tableTemp: number;
  crust: number;
  fire: number;
  crustIndex: number;
  spits: string[];
  carver: string;
  carverRole: string;
  dayKey: string;
  lines: PassportLine[];
  /** Total distance the ingredients travelled, and how much of it is Belgian (by count). */
  km: number;
  local: number;
};

export const passportNo = (ev: Evening, plate: Plate) => ev.firstNo + plate.seq;

export function sealOf(no: number, dayKey: string): string {
  return (hash(`ninja-seal-${no}-${dayKey}`) % 0xfffff).toString(16).toUpperCase().padStart(5, '0');
}

/** "121 407" */
export const formatNo = (no: number) => String(no).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export function passportOf(ev: Evening, plate: Plate): Passport {
  const no = passportNo(ev, plate);
  const d = dishById(plate.dish);
  const ids: IngredientId[] = [];
  for (const id of [...meatIngredients(plate.meat), ...d.ingredients]) {
    if ((id === 'beef' || id === 'veal' || id === 'lamb' || id === 'chicken') && !meatIngredients(plate.meat).includes(id)) continue;
    if (!ids.includes(id)) ids.push(id);
  }
  const minute = minuteOf(new Date(ev.day.getTime() + plate.carved * 60000));
  const lines: PassportLine[] = ids.map((id) => {
    const g = INGREDIENTS[id];
    return { id, name: g.name, place: g.place, country: g.country, km: kmOf(id), lot: lotOf(id, ev.key), when: freshLine(id, minute), producer: g.producer, real: g.real };
  });
  const reading = spitAt(ev, plate.spits[0], plate.carved);
  const seconds = Math.round((plate.served - plate.carved) * 60);
  const seal = sealOf(no, ev.key);
  const carver = memberById(plate.carver);
  return {
    no,
    code: `NJ-${no}·${seal}`,
    seal,
    dish: plate.dish,
    dishName: d.name,
    meat: plate.meat,
    meatLabel: plate.meat ? MEATS[plate.meat].label : undefined,
    portion: plate.portion,
    table: plate.table,
    carved: plate.carved,
    served: plate.served,
    secondsToTable: seconds,
    core: plate.core,
    tableTemp: atTable(plate.core, seconds),
    crust: reading.crust,
    fire: Math.round(fireAt(ev, plate.carved)),
    crustIndex: plate.crustIndex,
    spits: plate.spits.map((s) => (s === 'rund' ? 'Spies 1 · rund, kalf, lam' : 'Spies 2 · kip')),
    carver: carver.name,
    carverRole: carver.role,
    dayKey: ev.key,
    lines,
    km: lines.reduce((s, l) => s + l.km, 0),
    local: lines.filter((l) => l.country === 'BE').length,
  };
}

/** Finds a passport by its number: the number tells the evening, the evening tells the plate. */
export function findPassport(no: number, around: Date): Passport | null {
  for (let back = 0; back < 120; back++) {
    const day = new Date(around.getFullYear(), around.getMonth(), around.getDate() - back);
    const ev = evening(day);
    if (no < ev.firstNo) continue;
    const plate = ev.plates[no - ev.firstNo];
    return plate ? passportOf(ev, plate) : null;
  }
  return null;
}

/** "19:42:07" for a minute with seconds as a fraction. */
export function clockSeconds(minute: number): string {
  const total = Math.round(minute * 60);
  const h = Math.floor(total / 3600) % 24;
  const m = Math.floor(total / 60) % 60;
  const s = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** "76,4 °C" */
export const celsius = (v: number, digits = 1) => `${v.toFixed(digits).replace('.', ',')} °C`;

export const dayOfPassport = (p: Passport) => {
  const [y, mo, d] = p.dayKey.split('-').map(Number);
  return new Date(y, mo - 1, d);
};

export { dateKey };
