// The demo's seven languages. Belgian Dutch (Flemish, the language of Antwerp) is the default; French, Belgium's other
// main language, and the rest are a choice per device.

export const LOCALES = ['nl', 'en', 'tr', 'ar', 'fr', 'de', 'it'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'nl';

/** Each language in its own script, so people can find theirs. */
export const LOCALE_NAMES: Record<Locale, string> = {
  nl: 'Nederlands (België)',
  en: 'English',
  tr: 'Türkçe',
  ar: 'العربية',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
};

export const isRTL = (locale: Locale) => locale === 'ar';

/** The page language for screen readers, spelling and hyphenation: Belgian Dutch and Belgian French. */
export const htmlLang = (locale: Locale) => (locale === 'nl' ? 'nl-BE' : locale === 'fr' ? 'fr-BE' : locale);

/** Maps a code such as "tr" or "ar-MA" to a supported language, or null. */
export function matchLocale(code?: string | null): Locale | null {
  if (!code) return null;
  const base = code.toLowerCase().split(/[-_]/)[0];
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
