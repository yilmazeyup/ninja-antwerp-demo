// The demo's languages. Flemish (Vlaams), the language of Antwerp and of Belgium's largest community, is the default and
// the language the code is written in; French, Belgium's other main language, comes next. Dutch as spoken in the
// Netherlands is one option among the others, like Turkish: it differs from the Flemish in a handful of words.

export const LOCALES = ['nl', 'fr', 'en', 'tr', 'ar', 'de', 'it', 'nl-NL'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'nl';

/** Each language in its own script, so people can find theirs. */
export const LOCALE_NAMES: Record<Locale, string> = {
  nl: 'Vlaams',
  fr: 'Français',
  en: 'English',
  tr: 'Türkçe',
  ar: 'العربية',
  de: 'Deutsch',
  it: 'Italiano',
  'nl-NL': 'Nederlands (Nederland)',
};

/** A short tag per language for compact lists: the Flemish carries BE, the Netherlands variant NL. */
export const LOCALE_TAGS: Record<Locale, string> = { nl: 'BE', fr: 'FR', en: 'EN', tr: 'TR', ar: 'AR', de: 'DE', it: 'IT', 'nl-NL': 'NL' };

export const isRTL = (locale: Locale) => locale === 'ar';

/** The page language for screen readers, spelling and hyphenation: Flemish and Belgian French are Belgian. */
export const htmlLang = (locale: Locale) => (locale === 'nl' ? 'nl-BE' : locale === 'fr' ? 'fr-BE' : locale);

/** Maps a code such as "tr", "ar-MA", "vls" or "nl-NL" to a supported language, or null. Plain "nl" is the Flemish. */
export function matchLocale(code?: string | null): Locale | null {
  if (!code) return null;
  const lower = code.toLowerCase().replace('_', '-');
  if (lower === 'nl-nl') return 'nl-NL';
  if (lower === 'vls' || lower === 'vl' || lower === 'nl-be') return 'nl';
  const base = lower.split('-')[0];
  return (LOCALES as readonly string[]).includes(base) ? (base as Locale) : null;
}

const KEY = 'ninja-lang';

/** The language for this page: ?lang= in the address first (and remembered), then the last choice here, else Dutch. */
export function pickLocale(): Locale {
  try {
    const fromAddress = matchLocale(new URLSearchParams(globalThis.location?.search ?? '').get('lang'));
    if (fromAddress) {
      globalThis.localStorage?.setItem(KEY, fromAddress);
      return fromAddress;
    }
    return matchLocale(globalThis.localStorage?.getItem(KEY)) ?? DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function rememberLocale(locale: Locale) {
  try {
    globalThis.localStorage?.setItem(KEY, locale);
  } catch {
    // Private windows may refuse; the choice then lasts for this page only.
  }
}
