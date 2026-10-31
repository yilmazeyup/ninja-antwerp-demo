import { FONTS_URL, KANJI_FONT_URL, paletteCss } from '@ninja/shared';

/** The look both web pages share: the palette as CSS variables and the fonts, before anything draws. */
export function installBase() {
  const style = document.createElement('style');
  style.textContent = paletteCss();
  document.head.prepend(style);
  for (const href of [FONTS_URL, KANJI_FONT_URL]) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }
}

/** A file in public/ (photos, brand), under whatever base path the site is served from. */
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
