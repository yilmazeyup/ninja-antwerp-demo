import { ARABIC_FONTS, isRTL, missing, pickLocale, rememberLocale, setLocale, trackMissing, type Locale } from '@ninja/shared';

// Imported first by each page's entry: the language is set before any module or screen shows text.

const locale = pickLocale();
setLocale(locale);
document.documentElement.lang = locale;
document.documentElement.dir = isRTL(locale) ? 'rtl' : 'ltr';

if (isRTL(locale)) {
  const fonts = document.createElement('link');
  fonts.rel = 'stylesheet';
  fonts.href = ARABIC_FONTS;
  document.head.appendChild(fonts);
}

// ?i18n-check collects the Dutch that is shown without a translation (window.__ninjaMissing), to find gaps.
if (new URLSearchParams(window.location.search).has('i18n-check')) {
  trackMissing();
  (window as unknown as { __ninjaMissing: Set<string> }).__ninjaMissing = missing;
}

/** Another language: remembered on this device, and the page opens again in it. */
export function chooseLocale(next: Locale) {
  rememberLocale(next);
  const url = new URL(window.location.href);
  url.searchParams.set('lang', next);
  window.location.replace(url.toString());
}
