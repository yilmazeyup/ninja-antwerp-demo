import { getLocale, isRTL, missing, pickLocale, rememberLocale, setLocale, tr, trackMissing, type Locale } from '@ninja/shared';
import { Platform } from 'react-native';
import type { ReactNode } from 'react';

export { tr };

/** Picks the language before the first screen draws; on the web also the page's language and reading direction. */
export function installLocale() {
  const locale = pickLocale();
  setLocale(locale);
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.documentElement.lang = locale;
    document.documentElement.dir = isRTL(locale) ? 'rtl' : 'ltr';
    // ?i18n-check collects the Dutch that is shown without a translation (window.__ninjaMissing), to find gaps.
    if (new URLSearchParams(window.location.search).has('i18n-check')) {
      trackMissing();
      (window as unknown as { __ninjaMissing: Set<string> }).__ninjaMissing = missing;
    }
  }
}

export const rtl = () => isRTL(getLocale());

/** Another language: remembered on this device; the web app opens again in it, on the same screen. */
export function chooseLocale(locale: Locale) {
  rememberLocale(locale);
  if (Platform.OS !== 'web') {
    setLocale(locale);
    return;
  }
  const url = new URL(window.location.href);
  url.searchParams.set('lang', locale);
  url.searchParams.set('intro', '0');
  window.location.replace(url.toString());
}

const plain = (node: ReactNode) => node === null || node === undefined || typeof node === 'boolean' || typeof node === 'string' || typeof node === 'number';

/**
 * A text's children in the chosen language. Text written as `Nog {n} punten` arrives as several pieces; they are
 * joined first, so the whole sentence is looked up and its word order can change.
 */
export function localize(children: ReactNode): ReactNode {
  if (getLocale() === 'nl') return children;
  if (typeof children === 'string') return tr(children);
  if (Array.isArray(children)) {
    if (children.every(plain)) return tr(children.filter((c) => typeof c === 'string' || typeof c === 'number').join(''));
    return children.map((c) => (typeof c === 'string' ? tr(c) : c));
  }
  return children;
}
