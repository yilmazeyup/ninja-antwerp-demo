// Dates, times and prices, written out per language instead of Intl so they look the same in every JS engine.
import { getLocale } from './i18n';
import type { Locale } from './locales';

type Names = { wdShort: string[]; wdLong: string[]; monShort: string[]; monLong: string[] };

const AR_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

const NAMES: Record<Locale, Names> = {
  nl: {
    wdShort: ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'],
    wdLong: ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'],
    monShort: ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'],
    monLong: ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'],
  },
  en: {
    wdShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    wdLong: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    monShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    monLong: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  },
  tr: {
    wdShort: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'],
    wdLong: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],
    monShort: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
    monLong: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
  },
  ar: { wdShort: AR_DAYS, wdLong: AR_DAYS, monShort: AR_MONTHS, monLong: AR_MONTHS },
  fr: {
    wdShort: ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'],
    wdLong: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
    monShort: ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'],
    monLong: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
  },
  de: {
    wdShort: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
    wdLong: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
    monShort: ['Jan', 'Feb', 'März', 'Apr', 'Mai', 'Juni', 'Juli', 'Aug', 'Sept', 'Okt', 'Nov', 'Dez'],
    monLong: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
  },
  it: {
    wdShort: ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'],
    wdLong: ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'],
    monShort: ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'],
    monLong: ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'],
  },
};

const names = () => NAMES[getLocale()];

/** A weekday, a day and a month in the order each language writes them. */
function writeDay(weekday: string, day: number, month: string): string {
  const locale = getLocale();
  if (locale === 'tr') return `${day} ${month} ${weekday}`;
  if (locale === 'de') return `${weekday}, ${day}. ${month}`;
  return `${weekday} ${day} ${month}`;
}

const dayMonth = (day: number, month: string) => (getLocale() === 'de' ? `${day}. ${month}` : `${day} ${month}`);

export const weekdayShort = (date: Date) => names().wdShort[date.getDay()];
export const weekdayLong = (date: Date) => names().wdLong[date.getDay()];
export const monthLong = (date: Date) => names().monLong[date.getMonth()];
export const monthShort = (date: Date) => names().monShort[date.getMonth()];

/** "wo 28 okt" */
export const dayShort = (date: Date) => writeDay(weekdayShort(date), date.getDate(), monthShort(date));

/** "woensdag 28 oktober" */
export const dayLong = (date: Date) => writeDay(weekdayLong(date), date.getDate(), monthLong(date));

/** "28 okt" */
export const dateShort = (date: Date) => dayMonth(date.getDate(), monthShort(date));

/** "28 oktober 2026" */
export const dateLong = (date: Date) => `${dayMonth(date.getDate(), monthLong(date))} ${date.getFullYear()}`;

/** "14:05" */
export const clock = (date: Date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

/** "1,5" in Dutch, "1.5" in English and Arabic: a number with `digits` decimals, as the language writes it. */
export function decimal(value: number, digits = 1): string {
  const text = value.toFixed(digits);
  return getLocale() === 'en' || getLocale() === 'ar' ? text : text.replace('.', ',');
}

/** "€ 40", "€ 3,50": cents only when there are any. */
export function euro(amount: number): string {
  const whole = Math.abs(amount - Math.round(amount)) < 0.005;
  const value = whole ? String(Math.round(amount)) : amount.toFixed(2).replace('.', ',');
  return `€ ${value.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

/** "45 min", "1 u", "2 u 30 min" */
export function duration(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} u ${rest} min` : `${h} u`;
}

/** "12:04" for a countdown of minutes and seconds. */
export function countdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export const addMinutes = (date: Date, minutes: number) => new Date(date.getTime() + minutes * 60000);

export function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

/** Monday of the week that contains `date`. */
export const startOfWeek = (date: Date) => addDays(startOfDay(date), -((date.getDay() + 6) % 7));

export const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Minutes since midnight. */
export const minuteOf = (date: Date) => date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;

/** A moment on `day`, `minutes` after midnight. */
export const atMinute = (day: Date, minutes: number) => new Date(startOfDay(day).getTime() + Math.round(minutes * 60) * 1000);

/** "vandaag", "morgen", "overmorgen", or "vr 30 okt". */
export function relativeDay(day: Date, now: Date): string {
  const diff = Math.round((startOfDay(day).getTime() - startOfDay(now).getTime()) / 86400000);
  if (diff === 0) return 'vandaag';
  if (diff === 1) return 'morgen';
  if (diff === 2) return 'overmorgen';
  if (diff === -1) return 'gisteren';
  return dayShort(day);
}

/** "3 weken geleden", "2 maanden geleden" */
export function ago(then: Date, now: Date): string {
  const days = Math.floor((startOfDay(now).getTime() - startOfDay(then).getTime()) / 86400000);
  if (days <= 0) return 'vandaag';
  if (days === 1) return 'gisteren';
  if (days < 14) return `${days} dagen geleden`;
  if (days < 61) return `${Math.round(days / 7)} weken geleden`;
  return `${Math.round(days / 30.4)} maanden geleden`;
}

/** "1 stoel", "3 stoelen" */
export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "Goedemorgen", "Goedemiddag", "Goedenavond" */
export function greeting(date: Date): string {
  const h = date.getHours();
  if (h < 12) return 'Goedemorgen';
  if (h < 18) return 'Goedemiddag';
  return 'Goedenavond';
}
