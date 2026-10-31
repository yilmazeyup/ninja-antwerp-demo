import { CLOSES, NINJA, OPEN_DAYS, OPENS } from './brand';
import { addDays, atMinute, minuteOf, startOfDay } from './format';

export type NinjaClock = {
  now: Date;
  /** False while Ninja is really open and the demo follows the real clock. */
  demo: boolean;
  reason: 'live' | 'closed' | 'set';
};

const ZONE = 'Europe/Brussels';

/** Minutes Antwerp is ahead of UTC at `date`. */
function zoneOffset(date: Date): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: ZONE,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(date);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
    const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
    return Math.round((asUtc - date.getTime()) / 60000);
  } catch {
    return -date.getTimezoneOffset();
  }
}

/**
 * The time on the wall in Antwerp, as a Date whose local hours and minutes read as Ninja's: the demo can be opened
 * anywhere (Istanbul, New York) and still shows the restaurant's own clock.
 */
export function wallClock(real: Date = new Date()): Date {
  return new Date(real.getTime() + (zoneOffset(real) + real.getTimezoneOffset()) * 60000);
}

/** "2026-10-31T19:30" (seconds optional), in Antwerp time, as an offset from the wall clock; 0 when absent. */
export function offsetFrom(at: string | null | undefined, real: Date = new Date()): number {
  if (!at || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(at)) return 0;
  const moment = new Date(at).getTime();
  return Number.isNaN(moment) ? 0 : moment - wallClock(real).getTime();
}

export const isOpenDay = (date: Date) => (OPEN_DAYS as readonly number[]).includes(date.getDay());

export function isOpenAt(date: Date): boolean {
  const m = minuteOf(date);
  return isOpenDay(date) && m >= OPENS && m < CLOSES;
}

/** The evening that is on now, or the last one that was. */
export function lastOpenDay(date: Date): Date {
  let day = startOfDay(date);
  if (!isOpenDay(day) || minuteOf(date) < OPENS) day = addDays(day, -1);
  while (!isOpenDay(day)) day = addDays(day, -1);
  return day;
}

/** The next moment the doors open. */
export function nextOpening(date: Date): Date {
  let day = startOfDay(date);
  if (isOpenDay(day) && minuteOf(date) < OPENS) return atMinute(day, OPENS);
  day = addDays(day, 1);
  while (!isOpenDay(day)) day = addDays(day, 1);
  return atMinute(day, OPENS);
}

/** The demo replays this stretch of the last evening when Ninja is closed: from the first rush to the last tables. */
export const REPLAY_FROM = 17 * 60 + 30;
export const REPLAY_TO = 21 * 60 + 30;

/**
 * Ninja's clock, the same in the app, the panel and the website. While Ninja is open (Tuesday to Sunday, 15:00 to
 * 22:00) it is the real time in Antwerp. Otherwise the demo replays the evening rush of the last open day at real
 * speed, so the spit turns, the line moves and every screen shows the same moment.
 */
export function ninjaNow(real: Date = new Date(), offset = 0): NinjaClock {
  const wall = wallClock(real);
  if (offset) return { now: new Date(wall.getTime() + offset), demo: true, reason: 'set' };
  if (isOpenAt(wall)) return { now: wall, demo: false, reason: 'live' };
  const day = lastOpenDay(wall);
  const length = REPLAY_TO - REPLAY_FROM;
  const minute = REPLAY_FROM + (minuteOf(wall) % length);
  return { now: atMinute(day, minute), demo: true, reason: 'closed' };
}

// ---------------------------------------------------------------------------------------------------------- the sun

const rad = Math.PI / 180;

function sunEvent(day: Date, lat: number, lon: number, rise: boolean): number {
  const start = new Date(day.getFullYear(), 0, 0);
  const n = Math.floor((new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime() - start.getTime()) / 86400000);
  const gamma = ((2 * Math.PI) / 365) * (n - 1);
  const eqTime = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
  const decl = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma) - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma) - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
  const cosH = Math.cos(90.833 * rad) / (Math.cos(lat * rad) * Math.cos(decl)) - Math.tan(lat * rad) * Math.tan(decl);
  const ha = Math.acos(Math.max(-1, Math.min(1, cosH))) / rad;
  const utc = 720 - 4 * (lon + (rise ? ha : -ha)) - eqTime;
  const offset = zoneOffset(new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), 12)));
  return (utc + offset + 1440) % 1440;
}

/** Sunset and sunrise at the Vlaamsekaai, minutes after midnight (NOAA's approximation). */
export const sunsetMinute = (day: Date) => sunEvent(day, NINJA.lat, NINJA.lon, false);
export const sunriseMinute = (day: Date) => sunEvent(day, NINJA.lat, NINJA.lon, true);

/** 0 at night, 1 in full daylight, easing through dusk: for the light through the windows in 3D. */
export function daylight(now: Date): number {
  const m = minuteOf(now);
  const rise = sunriseMinute(now);
  const set = sunsetMinute(now);
  const ease = (x: number) => Math.min(1, Math.max(0, x));
  return Math.min(ease((m - rise + 30) / 60), ease((set + 30 - m) / 60));
}
