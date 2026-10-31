import { DEFAULT_LOCALE, type Locale } from '../locales';
import AR from './ar.json';
import DE from './de.json';
import EN from './en.json';
import FR from './fr.json';
import IT from './it.json';
import TR from './tr.json';

/*
 * Text in seven languages. The code writes Dutch, exactly as it is shown; the other languages look the finished
 * Dutch up when it is shown. Entries with {placeholders} match text that has names, numbers or times in it, and the
 * parts they match are looked up again, so "Nu: Elif V. · Inwerken" finds "Nu: {who} · {step}" and "Inwerken".
 * Anything without a translation stays Dutch.
 */

type Dict = Record<string, string>;

const DICTS: Record<Exclude<Locale, 'nl'>, Dict> = { en: EN, tr: TR, ar: AR, fr: FR, de: DE, it: IT };

// The language lives on the page, not in this module: a bundler may load the module twice (Vite pre-bundles the
// panel's JSX wrapper in development), and both copies must show the same language.
const page = globalThis as unknown as { __ninjaLocale?: Locale; __ninjaMissing?: Set<string>; __ninjaTracking?: boolean };

export const getLocale = (): Locale => page.__ninjaLocale ?? DEFAULT_LOCALE;

/** Sets the language for everything shown from now on; pages set it once, before they first draw. */
export function setLocale(locale: Locale) {
  page.__ninjaLocale = locale;
}

/** Dutch that was shown without a translation, collected while `trackMissing()` is on, to check coverage. */
export const missing = (page.__ninjaMissing ??= new Set<string>());

export function trackMissing(on = true) {
  page.__ninjaTracking = on;
}

const LETTER = /\p{L}/u;
const PLACEHOLDER = /\{(\w+)\}/g;
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

type Pattern = { key: string; re: RegExp; names: string[]; hint: string; weight: number };

const patterns = new Map<Locale, Pattern[]>();
const folded = new Map<Locale, Map<string, string>>();
const memo = new Map<Locale, Map<string, string>>();

function patternsFor(locale: Exclude<Locale, 'nl'>): Pattern[] {
  let list = patterns.get(locale);
  if (list) return list;
  list = [];
  for (const key of Object.keys(DICTS[locale])) {
    if (!key.includes('{')) continue;
    const parts = key.split(/\{(\w+)\}/);
    const literals = parts.filter((_, i) => i % 2 === 0);
    // A pattern needs words of its own; "{a} · {b}" would match anything and is covered by the separators below, and
    // a lone letter glued to a value ("{x}u") would match the end of any word.
    if (literals.join('').replace(/[^\p{L}]/gu, '').length < 2) continue;
    list.push({
      key,
      re: new RegExp(`^${parts.map((part, i) => (i % 2 ? '(.+?)' : escape(part))).join('')}$`, 's'),
      names: parts.filter((_, i) => i % 2 === 1),
      hint: [...literals].sort((a, b) => b.length - a.length)[0],
      weight: literals.join('').length,
    });
  }
  // The most specific first: "Nog {n} punten tot {tier}" before "{n} punten".
  list.sort((a, b) => b.weight - a.weight);
  patterns.set(locale, list);
  return list;
}

const upperFirst = (text: string, locale: Locale) => text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);
const lowerFirst = (text: string, locale: Locale) => text.charAt(0).toLocaleLowerCase(locale) + text.slice(1);

/** The same words in another case: "vandaag" finds "Vandaag", "LIVE" finds "Live". */
function exact(core: string, locale: Exclude<Locale, 'nl'>): string | undefined {
  const dict = DICTS[locale];
  if (Object.prototype.hasOwnProperty.call(dict, core)) return dict[core];
  let index = folded.get(locale);
  if (!index) {
    index = new Map();
    for (const key of Object.keys(dict)) if (!key.includes('{')) index.set(key.toLocaleLowerCase('nl'), key);
    folded.set(locale, index);
  }
  const key = index.get(core.toLocaleLowerCase('nl'));
  if (key === undefined) return undefined;
  const value = dict[key];
  if (core === core.toLocaleUpperCase('nl')) return value.toLocaleUpperCase(locale);
  // Mid-sentence words start small, except in German, where nouns keep their capital ("Ansatzfarbe").
  if (core.charAt(0) === core.charAt(0).toLocaleLowerCase('nl')) return locale === 'de' ? value : lowerFirst(value, locale);
  return upperFirst(value, locale);
}

function fill(template: string, values: Record<string, string>): string {
  return template.replace(PLACEHOLDER, (match, name: string) => values[name] ?? match);
}

const SEPARATORS = [' · ', ' — ', ' – ', '\n', ': ', ', '];

function lookup(text: string, locale: Exclude<Locale, 'nl'>, depth: number, leaf: boolean): string | undefined {
  const core = text.trim();
  if (!core || !LETTER.test(core)) return undefined;
  const start = text.indexOf(core);
  const wrap = (found: string) => text.slice(0, start) + found + text.slice(start + core.length);

  const direct = exact(core, locale);
  if (direct !== undefined) return wrap(direct);
  // "Goedemiddag," and "één kleur ·": the words without the punctuation that follows them.
  const punct = /^(.*?\p{L}.*?)(\s*[,.:;!?…·]+)$/u.exec(core);
  if (punct) {
    const inner = exact(punct[1], locale);
    if (inner !== undefined) return wrap(inner + punct[2]);
  }
  if (depth > 3) return undefined;
  // A piece that starts with a separator, as it comes after a heading: "· dag afspelen".
  const lead = /^([·•—–,:]\s*)(.*\p{L}[\s\S]*)$/u.exec(core);
  if (lead) {
    const rest = lookup(lead[2], locale, depth + 1, leaf);
    if (rest !== undefined) return wrap(lead[1] + rest);
  }
  // A quote: the words inside the quotation marks.
  const quoted = /^([“"'«„‘])([\s\S]+)([”"'»“’])$/u.exec(core);
  if (quoted) {
    const inner = lookup(quoted[2], locale, depth + 1, leaf);
    if (inner !== undefined) return wrap(quoted[1] + inner + quoted[3]);
  }
  // Words with a time, price or number after them: "vandaag 16:00", "v.a. € 70".
  const tail = /^(.*?\p{L}.*?)\s+([\d€±+][\d\s:.,–\-€%+]*)$/u.exec(core);
  if (tail) {
    const head = lookup(tail[1], locale, depth + 1, false);
    if (head !== undefined) return wrap(`${head} ${tail[2]}`);
  }

  for (const p of patternsFor(locale)) {
    if (p.hint && !core.includes(p.hint)) continue;
    const m = p.re.exec(core);
    if (!m) continue;
    const values: Record<string, string> = {};
    p.names.forEach((name, i) => {
      values[name] = lookup(m[i + 1], locale, depth + 1, false) ?? m[i + 1];
    });
    return wrap(fill(DICTS[locale][p.key], values));
  }

  // Text joined with a separator: each part on its own ("Natuurlijk · halflang", "Tip: …").
  for (const sep of SEPARATORS) {
    if (!core.includes(sep)) continue;
    const parts = core.split(sep);
    if (sep === ': ' && parts[0].length > 24) continue;
    let changed = false;
    const out = parts.map((part) => {
      const found = lookup(part, locale, depth + 1, true);
      if (found !== undefined) changed = true;
      return found ?? part;
    });
    if (changed) return wrap(out.join(sep));
  }

  if (page.__ninjaTracking && leaf) missing.add(core);
  return undefined;
}

/** Finished Dutch text in the current language (or the one given); unknown text stays as it is. */
export function tr(text: string, locale: Locale = getLocale()): string {
  if (locale === 'nl' || !text || !LETTER.test(text)) return text;
  let cache = memo.get(locale);
  if (!cache) memo.set(locale, (cache = new Map()));
  const hit = cache.get(text);
  if (hit !== undefined) return hit;
  const out = lookup(text, locale, 0, true) ?? text;
  if (cache.size > 20000) cache.clear();
  cache.set(text, out);
  return out;
}

/** HTML built as a string (the 3D labels): the text between the tags in the current language, the tags as they are. */
export function trHtml(html: string, locale: Locale = getLocale()): string {
  if (locale === 'nl') return html;
  return html.replace(/(^|>)([^<>]+)(?=<|$)/g, (_m, open: string, text: string) => open + tr(text, locale));
}

/** Every Dutch text with its translation, for pages that translate themselves (the start page). */
export const dictionary = (locale: Exclude<Locale, 'nl'>): Dict => DICTS[locale];
