// The live spit: what the sensors at Ninja's spits would read at any moment. In a real installation a probe in the
// carving layer (core), an infrared camera on the meat (crust), a thermocouple in the oak fire (fire) and the scale
// under the spit (kg) send their readings through a small gateway in the kitchen. In the demo they are worked out from
// the evening (when the oak went on, when the last slice was cut), so every screen reads the same numbers.

import { kgLeft, type Evening, type Plate, type SpitId } from './evening';
import { hash } from './random';

/** Smooth noise in [-1, 1]: the same seed and x always give the same value. */
export function vnoise(seed: number, x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const a = ((hash(`${seed}:${i}`) % 10000) / 10000) * 2 - 1;
  const b = ((hash(`${seed}:${i + 1}`) % 10000) / 10000) * 2 - 1;
  const t = f * f * (3 - 2 * f);
  return a + (b - a) * t;
}

/** The oak fire in °C at minute `m` (with seconds as a fraction): a log goes on, the fire dips, then flares. */
export function fireAt(ev: Evening, m: number): number {
  let t = 640;
  for (const r of ev.refuels) {
    if (r > m) break;
    const age = m - r;
    if (age > 40) continue;
    t += 150 * (1 - Math.exp(-age / 1.6)) * Math.exp(-age / 11) - 25 * Math.exp(-age / 0.6);
  }
  return t + 28 * Math.sin(m / 3.1) + 14 * vnoise(11, m * 2.3) + 6 * vnoise(12, m * 19);
}

export type SpitStatus = 'koud' | 'opwarmen' | 'klaar' | 'piek' | 'bijna-op';

export const STATUS_LABEL: Record<SpitStatus, string> = {
  koud: 'Nog niet aangestoken',
  opwarmen: 'Warmt op',
  klaar: 'Klaar om te snijden',
  piek: 'Korst op z’n best',
  'bijna-op': 'Bijna op',
};

export type SpitReading = {
  spit: SpitId;
  label: string;
  /** °C in the slice if it were cut now. */
  core: number;
  /** °C of the crust facing the fire. */
  crust: number;
  fire: number;
  kg: number;
  kgStart: number;
  /** Slices cut tonight so far. */
  cuts: number;
  /** Seconds since the last slice. */
  lastCut: number;
  /** Minutes the spit has turned before the fire. */
  onFire: number;
  rpm: number;
  /** Centimetres between the meat and the fire; the spit master moves it in and out. */
  distance: number;
  /** 0–1: how far the crust has come back since the last slice. */
  crustIndex: number;
  status: SpitStatus;
  /** The last slice's passport. */
  last: Plate | null;
};

/** Every sensor of one spit at minute `m`. */
export function spitAt(ev: Evening, spit: SpitId, m: number): SpitReading {
  const plan = ev.spits.find((s) => s.id === spit)!;
  let last: Plate | null = null;
  let cuts = 0;
  for (const p of ev.plates) {
    if (p.carved > m) break;
    if (!p.spits.includes(spit)) continue;
    cuts++;
    last = p;
  }
  const fire = fireAt(ev, m);
  const onFire = Math.max(0, m - plan.onFire);
  const since = last ? m - last.carved : Math.max(0, m - (plan.onFire + 40));
  const crustIndex = onFire < 40 ? onFire / 40 : 1 - Math.exp(-since / 3.5);
  const warm = Math.min(1, onFire / 40);
  const seed = spit === 'rund' ? 21 : 37;
  const crust = 18 + warm * (66 + 38 * crustIndex) + (fire - 700) * 0.05 + 1.4 * vnoise(seed, m * 6);
  const core = onFire < 40 ? 18 + warm * 52 : (spit === 'kip' ? 74.2 : 72.1) + 6.1 * crustIndex + 0.35 * vnoise(seed + 1, m * 9);
  const kg = kgLeft(ev, spit, m);
  const status: SpitStatus = onFire <= 0 ? 'koud' : onFire < 40 ? 'opwarmen' : kg < 5 ? 'bijna-op' : crustIndex > 0.82 ? 'piek' : 'klaar';
  return {
    spit,
    label: plan.label,
    core: Math.round(core * 10) / 10,
    crust: Math.round(crust * 10) / 10,
    fire: Math.round(fire),
    kg: Math.round(kg * 10) / 10,
    kgStart: plan.kgStart,
    cuts,
    lastCut: Math.max(0, Math.round(since * 60)),
    onFire: Math.round(onFire),
    rpm: Math.round((2.2 + 0.15 * Math.sin(m / 7)) * 10) / 10,
    distance: Math.round(30 + 3 * Math.sin(m / 17) + vnoise(seed + 2, m / 3)),
    crustIndex,
    status,
    last,
  };
}

/** Readings over a stretch, for charts: one point every `step` minutes. */
export function spitSeries(ev: Evening, spit: SpitId, from: number, to: number, step = 1) {
  const out: { m: number; core: number; crust: number; fire: number; kg: number }[] = [];
  for (let m = from; m <= to; m += step) {
    const r = spitAt(ev, spit, m);
    out.push({ m, core: r.core, crust: r.crust, fire: r.fire, kg: r.kg });
  }
  return out;
}

/** The temperature a slice still has when it reaches the table, `seconds` after the cut. */
export const atTable = (core: number, seconds: number) => Math.round((core - 1.8 - seconds * 0.038) * 10) / 10;

/** Ninja's own target in the demo: every slice at least this warm at the cut (logged for the food-safety file). */
export const CORE_TARGET = 72;

/**
 * Colours for a temperature on the thermal camera: night blue through violet, red and orange to white heat, the
 * "inferno" ramp most thermal cameras use. `t` runs from 0 (cold) to 1 (hottest).
 */
export const THERMAL = ['#05030F', '#2A0B4F', '#6B1166', '#A92160', '#DD4A3A', '#F7862A', '#FBC748', '#FCFFA4'];

export function thermalColor(t: number): string {
  const x = Math.min(0.9999, Math.max(0, t)) * (THERMAL.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  const a = parseInt(THERMAL[i].slice(1), 16);
  const b = parseInt(THERMAL[i + 1].slice(1), 16);
  const mix = (sh: number) => Math.round(((a >> sh) & 255) * (1 - f) + ((b >> sh) & 255) * f);
  return `#${[mix(16), mix(8), mix(0)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
