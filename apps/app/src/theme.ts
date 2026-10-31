import { FONT_STACK, PALETTE, type PaletteKey } from '@ninja/shared';
import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/**
 * Ninja's look (DESIGN.md): black lacquer, oxblood leather, chrome and the oak fire. On the web every colour is a CSS
 * variable from the shared palette (src/web/css.ts); natively the same values stand in.
 */

export const isWeb = Platform.OS === 'web';

const v = (name: PaletteKey): string => (isWeb ? `var(--nj-${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)})` : PALETTE[name]);

export const C = {
  bg: v('bg'),
  bg2: v('bg2'),
  panel: v('panel'),
  panel2: v('panel2'),
  panel3: v('panel3'),
  ink: v('ink'),
  soft: v('soft'),
  muted: v('muted'),
  faint: v('faint'),
  line: v('line'),
  line2: v('line2'),
  stitch: v('stitch'),
  oxblood: v('oxblood'),
  oxblood2: v('oxblood2'),
  leather: v('leather'),
  leatherLight: v('leatherLight'),
  cognac: v('cognac'),
  travertine: v('travertine'),
  chrome: v('chrome'),
  ember: v('ember'),
  amber: v('amber'),
  flame: v('flame'),
  ok: v('ok'),
  warn: v('warn'),
  alert: v('alert'),
  glass: v('glass'),
  glassLight: v('glassLight'),
  /** Fixed values for places where a CSS variable cannot go (SVG gradients, canvases). */
  black: '#0B0807',
  bone: '#F4ECE1',
  red: '#9C242A',
};

export const FONT = {
  sans: isWeb ? FONT_STACK.sans : Platform.select({ ios: 'Avenir Next', default: 'sans-serif' }),
  mono: isWeb ? FONT_STACK.mono : Platform.select({ ios: 'Menlo', default: 'monospace' }),
  serif: isWeb ? FONT_STACK.serif : Platform.select({ ios: 'Georgia', default: 'serif' }),
  kanji: isWeb ? FONT_STACK.kanji : Platform.select({ ios: 'Hiragino Mincho ProN', default: 'serif' }),
};

export const R = { xs: 8, sm: 12, md: 18, lg: 22, xl: 30, pill: 999 };
export const PAD = 20;

/** Web-only CSS that React Native's types do not know (gradients, filters, font-stretch). */
export const web = (style: Record<string, string | number>): ViewStyle & TextStyle => (isWeb ? (style as ViewStyle & TextStyle) : {});

/** Hooks an element up to the global web stylesheet through a data attribute: `{...fx('leather')}`. Ignored natively. */
export const fx = (names: string): Record<string, unknown> => (isWeb ? { dataSet: { fx: names } } : {});

export const shadow = (depth = 1): ViewStyle =>
  isWeb
    ? ({ boxShadow: `0 ${6 * depth}px ${22 * depth}px -${6 * depth}px rgba(0,0,0,${0.45 + depth * 0.1}), 0 1px 0 rgba(244,236,225,0.04) inset` } as ViewStyle)
    : { shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 14 * depth, shadowOffset: { width: 0, height: 5 * depth }, elevation: 4 * depth };

/** The width the app is laid out for: a phone, also on a wide screen. */
export const MAX_WIDTH = 520;
