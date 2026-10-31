// The guest's own plates: carvings from the bridge (cut in the panel, or by the demo's kitchen when nobody is at the
// panel) turned into passports like the evening's own. Their numbers sit in a block after the evening's plates, so
// the website's lookup finds them too.

import { eventsOf, type BridgeEvent, type BridgeState } from './bridge';
import { evening, type Plate } from './evening';
import { dishById } from './menu';
import { findPassport, passportOf, type Passport } from './passport';

export const APP_BLOCK = 900;

type Carve = Extract<BridgeEvent, { kind: 'carve' }>;

const dayOf = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export function appPassport(e: Carve, index: number): Passport {
  const ev = evening(dayOf(e.day));
  const d = dishById(e.dish);
  const plate: Plate = {
    seq: APP_BLOCK + index,
    group: 'app',
    table: e.table,
    dish: e.dish,
    meat: e.meat,
    portion: e.portion,
    ordered: e.minute - 2,
    carved: e.minute,
    served: e.minute + e.seconds / 60,
    spits: e.meat === 'chicken' ? ['kip'] : e.meat === 'mix' ? ['rund', 'kip'] : ['rund'],
    kg: e.portion === '1,5x' ? 0.28 : 0.19,
    carver: 'baran',
    core: e.core,
    crustIndex: Math.min(1, Math.max(0, (e.core - 72.1) / 6.1)),
  };
  void d;
  return passportOf(ev, plate);
}

/** Every passport of the guest's own plates, oldest first, numbered per evening. */
export function myPassports(state: BridgeState): Passport[] {
  const perDay = new Map<string, number>();
  return eventsOf(state, 'carve').map((e) => {
    const i = perDay.get(e.day) ?? 0;
    perDay.set(e.day, i + 1);
    return appPassport(e, i);
  });
}

/** A passport by number: the guest's own first, then the evenings'. */
export function findAnyPassport(no: number, around: Date, state: BridgeState): Passport | null {
  return myPassports(state).find((p) => p.no === no) ?? findPassport(no, around);
}
