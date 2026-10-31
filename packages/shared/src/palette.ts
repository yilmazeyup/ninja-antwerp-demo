// Ninja's look in the demo: black lacquer, oxblood leather (the colour of the logo and of the site's buttons), chrome,
// travertine and the oak fire. One look only, as Ninja itself is black: the luxury is in the materials, not in a
// second theme. Shared by the app, the panel, the website and the start page as CSS variables (--nj-*).

export const PALETTE = {
  /** Lacquer: a warm black, never blue. */
  bg: '#0B0807',
  bg2: '#110C0A',
  /** Leather panels, from deep to lit. */
  panel: '#18100D',
  panel2: '#22150F',
  panel3: '#2D1B14',
  /** Bone: the ink on black. */
  ink: '#F4ECE1',
  soft: '#CDBFAF',
  muted: '#8F8174',
  faint: '#5C5047',
  line: 'rgba(244,236,225,0.09)',
  line2: 'rgba(244,236,225,0.17)',
  stitch: 'rgba(244,236,225,0.26)',
  /** Ninja's own accents, from its site. */
  oxblood: '#7B151A',
  oxblood2: '#9C242A',
  /** The puffy leather of the logo. */
  leather: '#5E1D14',
  leatherLight: '#8A3424',
  cognac: '#A4572F',
  travertine: '#E7DCCB',
  travertineDark: '#B9A68C',
  chrome: '#C9CDD3',
  /** Fire: ember to amber, and the white heat at its heart. */
  ember: '#FF6A2A',
  amber: '#FFB547',
  flame: '#FFE6A8',
  ok: '#9AD8A8',
  warn: '#F2B84B',
  alert: '#FF5B4D',
  glass: 'rgba(16,11,9,0.74)',
  glassLight: 'rgba(244,236,225,0.06)',
} as const;

export type PaletteKey = keyof typeof PALETTE;

const cssName = (key: string) => `--nj-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

/** The palette as CSS custom properties on :root. */
export function paletteCss(): string {
  return `:root{${Object.entries(PALETTE)
    .map(([k, v]) => `${cssName(k)}:${v};`)
    .join('')}}`;
}

/** `var(--nj-…)` for a palette key. */
export const cssVar = (key: PaletteKey) => `var(${cssName(key)})`;

/**
 * The type: Archivo with its width axis (wide caps for the fashion-house labels, normal width for reading), Martian
 * Mono for every number the sensors send, Cormorant Garamond italic for the few words that carry feeling, and one kanji
 * (忍, "shinobi") from Shippori Mincho for the seal on the passport.
 */
export const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,62..125,100..900;1,62..125,100..900&family=Martian+Mono:wdth,wght@75..112.5,100..800&family=Cormorant+Garamond:ital,wght@1,400;1,500;1,600&display=swap';

/** Only the kanji the demo shows, so the Japanese font stays a few kilobytes. */
export const KANJI = '忍影上中下';
export const KANJI_FONT_URL = `https://fonts.googleapis.com/css2?family=Shippori+Mincho+B1:wght@800&text=${encodeURIComponent(KANJI)}&display=swap`;

export const ARABIC_FONTS = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap';

export const FONT_STACK = {
  sans: "'Archivo', 'IBM Plex Sans Arabic', system-ui, -apple-system, 'Segoe UI', sans-serif",
  mono: "'Martian Mono', ui-monospace, 'SF Mono', Menlo, monospace",
  serif: "'Cormorant Garamond', 'Times New Roman', serif",
  kanji: "'Shippori Mincho B1', 'Hiragino Mincho ProN', serif",
} as const;
