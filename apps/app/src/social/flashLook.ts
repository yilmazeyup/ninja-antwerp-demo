import { FONT_STACK } from '@ninja/shared';

import { rtl } from '../i18n';

/**
 * The Flash camera's darkroom, in the browser: Ninja's own look on any picture (the flash falling off into the dark,
 * warm tungsten, film contrast, fine grain, a vignette and the orange date of a disposable camera), then one of three
 * layers on top, at the sizes Instagram wants: a story (1080 × 1920) or a post (1080 × 1350).
 */

export type Overlay = 'live' | 'ninja' | 'puur';
export type Format = 'story' | 'post';

export const SIZES: Record<Format, [number, number]> = { story: [1080, 1920], post: [1080, 1350] };

export type FlashData = {
  /** Small caps under the logo: "VLAAMSEKAAI 52 · ANTWERPEN". */
  place: string;
  /** "Live" layer. */
  dish: string;
  sub: string;
  stats: { label: string; value: string; unit?: string }[];
  line: string;
  /** "'26 10 31" */
  stamp: string;
};

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`image ${src.slice(0, 60)}`));
    img.src = src;
  });
}

/** Any picture as a canvas no larger than `max` on its long side. */
export function toCanvas(src: CanvasImageSource, w: number, h: number, max = 1600): HTMLCanvasElement {
  const s = Math.min(1, max / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * s));
  c.height = Math.max(1, Math.round(h * s));
  const g = c.getContext('2d')!;
  g.imageSmoothingQuality = 'high';
  g.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** The tone of Ninja's film: a gentle S-curve, blacks lifted a hair, warm in every channel but the blue. */
function curves(): [Uint8ClampedArray, Uint8ClampedArray, Uint8ClampedArray] {
  const r = new Uint8ClampedArray(256);
  const g = new Uint8ClampedArray(256);
  const b = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) {
    const x = v / 255;
    let y = x < 0.5 ? 0.5 * Math.pow(2 * x, 1.22) : 1 - 0.5 * Math.pow(2 * (1 - x), 1.22);
    y = 0.028 + y * 0.962;
    r[v] = Math.round(Math.min(1, y * 1.055 + 0.012) * 255);
    g[v] = Math.round(Math.min(1, y * 0.99 + 0.004) * 255);
    b[v] = Math.round(Math.max(0, y * 0.86 - 0.004) * 255);
  }
  return [r, g, b];
}

/** The flash, the tungsten and the film, worked into the pixels once; the layers go on top later. */
export function gradeFlash(src: HTMLCanvasElement): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const g = out.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(src, 0, 0);
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const [cr, cg, cb] = curves();
  // The flash hits the middle, a little above centre, and dies away towards the edges.
  const cx = w * 0.5;
  const cy = h * 0.44;
  const rx = w * 0.62;
  const ry = h * 0.66;
  const dx2 = new Float32Array(w);
  for (let x = 0; x < w; x++) dx2[x] = ((x - cx) / rx) ** 2;
  for (let y = 0; y < h; y++) {
    const dy2 = ((y - cy) / ry) ** 2;
    let i = y * w * 4;
    for (let x = 0; x < w; x++, i += 4) {
      const dist = Math.sqrt(dx2[x] + dy2);
      const f = 1.09 - 0.5 * smooth(0.32, 1.25, dist);
      let r = d[i] * f;
      let gg = d[i + 1] * f;
      let b = d[i + 2] * f;
      const l = 0.299 * r + 0.587 * gg + 0.114 * b;
      r = l + (r - l) * 1.08;
      gg = l + (gg - l) * 1.04;
      b = l + (b - l) * 0.98;
      d[i] = cr[r < 0 ? 0 : r > 255 ? 255 : r | 0];
      d[i + 1] = cg[gg < 0 ? 0 : gg > 255 ? 255 : gg | 0];
      d[i + 2] = cb[b < 0 ? 0 : b > 255 ? 255 : b | 0];
    }
  }
  g.putImageData(img, 0, 0);
  return out;
}

let grainTile: HTMLCanvasElement | null = null;

/** Fine film grain: a tile of grey noise laid over the picture in overlay mode (grey 128 changes nothing). */
function grain(): HTMLCanvasElement {
  if (grainTile) return grainTile;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const img = g.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = 128 + ((Math.random() + Math.random() + Math.random() - 1.5) / 1.5) * 70;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = n;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  grainTile = c;
  return c;
}

type Ctx = CanvasRenderingContext2D & { fontStretch?: string; letterSpacing?: string };

function setFont(g: Ctx, css: string, opts: { stretch?: 'expanded' | 'normal'; spacing?: number } = {}) {
  g.font = css;
  if ('fontStretch' in g) g.fontStretch = opts.stretch ?? 'normal';
  if ('letterSpacing' in g) g.letterSpacing = `${rtl() ? 0 : (opts.spacing ?? 0)}px`;
}

const SANS = FONT_STACK.sans;
const MONO = FONT_STACK.mono;
const SERIF = FONT_STACK.serif;
const KANJI = FONT_STACK.kanji;

/** Wide caps, as the house sets its labels (Arabic has no capitals and is never spaced out). */
const caps = (text: string) => (rtl() ? text : text.toLocaleUpperCase());

/** Fits a line into `max` pixels by making the type smaller. */
function fitSize(g: Ctx, text: string, size: number, max: number, make: (s: number) => string, opts: { stretch?: 'expanded'; spacing?: number } = {}) {
  let s = size;
  for (let i = 0; i < 12; i++) {
    setFont(g, make(s), { ...opts, spacing: (opts.spacing ?? 0) * (s / size) });
    if (g.measureText(text).width <= max) break;
    s *= 0.92;
  }
  return s;
}

/** The 忍 seal, pressed into oxblood, a little crooked. */
function seal(g: Ctx, x: number, y: number, size: number) {
  g.save();
  g.translate(x + size / 2, y + size / 2);
  g.rotate((-6 * Math.PI) / 180);
  const r = size * 0.22;
  const grad = g.createRadialGradient(-size * 0.2, -size * 0.25, size * 0.05, 0, 0, size * 0.75);
  grad.addColorStop(0, '#B3313A');
  grad.addColorStop(0.68, '#7B151A');
  grad.addColorStop(1, '#5A0D11');
  g.fillStyle = grad;
  g.shadowColor = 'rgba(0,0,0,0.45)';
  g.shadowBlur = size * 0.25;
  g.beginPath();
  g.roundRect(-size / 2, -size / 2, size, size, r);
  g.fill();
  g.shadowBlur = 0;
  g.strokeStyle = 'rgba(244,236,225,0.18)';
  g.lineWidth = size * 0.035;
  g.stroke();
  g.fillStyle = '#F4ECE1';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  setFont(g, `800 ${size * 0.58}px ${KANJI}`);
  g.fillText('忍', 0, size * 0.03);
  g.restore();
}

function shade(g: Ctx, W: number, H: number, from: number, alpha: number) {
  const grad = g.createLinearGradient(0, from, 0, H);
  grad.addColorStop(0, 'rgba(10,7,6,0)');
  grad.addColorStop(0.45, `rgba(10,7,6,${alpha * 0.62})`);
  grad.addColorStop(1, `rgba(10,7,6,${alpha})`);
  g.fillStyle = grad;
  g.fillRect(0, from, W, H - from);
}

/** Strava for a kebab: the plate's own numbers over the photo. */
function drawLive(g: Ctx, W: number, H: number, data: FlashData, logo: HTMLImageElement | null, k: number) {
  const m = 66 * k;
  const right = rtl();
  const X = (x: number) => (right ? W - x : x);
  g.direction = right ? 'rtl' : 'ltr';
  g.textAlign = 'start';
  g.textBaseline = 'alphabetic';

  // Top: the puffy logo, and where.
  const top = g.createLinearGradient(0, 0, 0, 360 * k);
  top.addColorStop(0, 'rgba(10,7,6,0.55)');
  top.addColorStop(1, 'rgba(10,7,6,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, W, 360 * k);
  if (logo) {
    const lw = 236 * k;
    const lh = (lw * logo.height) / logo.width;
    g.drawImage(logo, right ? W - m - lw : m, 74 * k, lw, lh);
    g.fillStyle = 'rgba(244,236,225,0.86)';
    setFont(g, `800 ${21 * k}px ${SANS}`, { stretch: 'expanded', spacing: 5 * k });
    g.fillText(caps(data.place), X(m + 4 * k), 74 * k + lh + 44 * k);
  }

  shade(g, W, H, H * 0.46, 0.9);
  let y = H - 82 * k;
  // Where the greens come from.
  g.fillStyle = 'rgba(244,236,225,0.84)';
  fitSize(g, data.line, 27 * k, W - 2 * m, (s) => `500 ${s}px ${SANS}`);
  g.fillText(data.line, X(m), y);
  y -= 50 * k;
  g.fillStyle = 'rgba(244,236,225,0.26)';
  g.fillRect(m, y, W - 2 * m, Math.max(1, 2 * k));
  y -= 46 * k;
  // Three readings, like splits on a run.
  const col = (W - 2 * m) / data.stats.length;
  data.stats.forEach((s, i) => {
    const x = right ? W - m - i * col : m + i * col;
    g.fillStyle = 'rgba(244,236,225,0.6)';
    setFont(g, `800 ${19 * k}px ${SANS}`, { stretch: 'expanded', spacing: 4 * k });
    g.fillText(caps(s.label), x, y - 104 * k);
    g.fillStyle = '#F4ECE1';
    const vs = fitSize(g, s.value, 84 * k, col - (s.unit ? 70 * k : 16 * k), (z) => `300 ${z}px ${MONO}`, { spacing: -2 * k });
    const vw = g.measureText(s.value).width;
    // Numbers and their units always read left to right ("78,4 °C"), also in a right-to-left layout.
    const unitSize = Math.max(20, vs * 0.38);
    let uw = 0;
    if (s.unit) {
      setFont(g, `400 ${unitSize}px ${MONO}`);
      uw = g.measureText(s.unit).width + 10 * k;
    }
    const left = right ? x - vw - uw : x;
    g.save();
    g.direction = 'ltr';
    g.textAlign = 'left';
    setFont(g, `300 ${vs}px ${MONO}`, { spacing: -2 * k * (vs / (84 * k)) });
    g.fillText(s.value, left, y);
    if (s.unit) {
      g.fillStyle = 'rgba(244,236,225,0.62)';
      setFont(g, `400 ${unitSize}px ${MONO}`);
      g.fillText(s.unit, left + vw + 10 * k, y - vs * 0.42);
    }
    g.restore();
  });
  y -= 150 * k;
  g.fillStyle = 'rgba(244,236,225,0.9)';
  setFont(g, `italic 500 ${46 * k}px ${SERIF}`);
  g.fillText(data.sub, X(m), y);
  y -= 72 * k;
  g.fillStyle = '#F4ECE1';
  const sealSize = 92 * k;
  fitSize(g, caps(data.dish), 108 * k, W - 2 * m - sealSize - 24 * k, (s) => `800 ${s}px ${SANS}`, { stretch: 'expanded', spacing: -1 * k });
  g.fillText(caps(data.dish), X(m), y);
  seal(g, right ? m : W - m - sealSize, y - sealSize + 6 * k, sealSize);
}

/** The house's own frame: the puffy leather wordmark and the address. */
function drawNinja(g: Ctx, W: number, H: number, data: FlashData, logo: HTMLImageElement | null, k: number) {
  shade(g, W, H, H * 0.58, 0.78);
  if (logo) {
    const lw = W * 0.58;
    const lh = (lw * logo.height) / logo.width;
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.55)';
    g.shadowBlur = 40 * k;
    g.shadowOffsetY = 12 * k;
    g.drawImage(logo, (W - lw) / 2, H - 168 * k - lh, lw, lh);
    g.restore();
  }
  g.direction = rtl() ? 'rtl' : 'ltr';
  g.textAlign = 'center';
  g.fillStyle = 'rgba(244,236,225,0.88)';
  setFont(g, `800 ${22 * k}px ${SANS}`, { stretch: 'expanded', spacing: 7 * k });
  g.fillText(caps(data.place), W / 2, H - 104 * k);
}

/** The orange date of a disposable camera, glowing a little into the picture. */
function drawStamp(g: Ctx, W: number, H: number, stamp: string, overlay: Overlay, k: number) {
  g.save();
  g.direction = 'ltr';
  g.textAlign = 'right';
  g.textBaseline = 'alphabetic';
  setFont(g, `500 ${44 * k}px ${MONO}`, { spacing: 3 * k });
  const y = overlay === 'live' ? 128 * k : overlay === 'ninja' ? H - 40 * k : H - 72 * k;
  // In a right-to-left layout the logo sits top right, so the date moves to the other corner.
  const atLeft = overlay === 'live' && rtl();
  g.textAlign = atLeft ? 'left' : 'right';
  const x = atLeft ? 58 * k : W - 58 * k;
  g.shadowColor = 'rgba(255,90,26,0.85)';
  g.shadowBlur = 18 * k;
  g.fillStyle = 'rgba(255,154,60,0.94)';
  g.fillText(stamp, x, y);
  g.shadowBlur = 4 * k;
  g.fillStyle = 'rgba(255,196,120,0.55)';
  g.fillText(stamp, x, y);
  g.restore();
}

/** One finished picture: the graded photo, cropped to the format, with grain, a vignette, a layer and the date. */
export function compose(base: HTMLCanvasElement, format: Format, overlay: Overlay, data: FlashData, logo: HTMLImageElement | null): HTMLCanvasElement {
  const [W, H] = SIZES[format];
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d') as Ctx;
  g.fillStyle = '#0B0807';
  g.fillRect(0, 0, W, H);
  const s = Math.max(W / base.width, H / base.height);
  const dw = base.width * s;
  const dh = base.height * s;
  g.imageSmoothingQuality = 'high';
  g.drawImage(base, (W - dw) / 2, (H - dh) * 0.42, dw, dh);
  // Grain, then the vignette.
  g.save();
  g.globalCompositeOperation = 'overlay';
  g.globalAlpha = 0.22;
  g.fillStyle = g.createPattern(grain(), 'repeat')!;
  g.fillRect(0, 0, W, H);
  g.restore();
  const v = g.createRadialGradient(W / 2, H * 0.44, H * 0.28, W / 2, H * 0.48, H * 0.86);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.5)');
  g.fillStyle = v;
  g.fillRect(0, 0, W, H);
  const k = format === 'story' ? 1 : 0.84;
  if (overlay === 'live') drawLive(g, W, H, data, logo, k);
  if (overlay === 'ninja') drawNinja(g, W, H, data, logo, k);
  drawStamp(g, W, H, data.stamp, overlay, k);
  return c;
}

/** A small JPEG of the picture for the Wall (about 260 pixels wide). */
export function thumbOf(c: HTMLCanvasElement, width = 260, quality = 0.72): string {
  const t = document.createElement('canvas');
  t.width = width;
  t.height = Math.round((c.height * width) / c.width);
  const g = t.getContext('2d')!;
  g.imageSmoothingQuality = 'high';
  g.drawImage(c, 0, 0, t.width, t.height);
  return t.toDataURL('image/jpeg', quality);
}

export const toBlob = (c: HTMLCanvasElement, quality = 0.92) =>
  new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('blob'))), 'image/jpeg', quality));

/** Waits for the faces the layers use, so the first picture is not set in a fallback font. */
export async function fontsReady() {
  const f = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (!f?.load) return;
  await Promise.race([
    Promise.all([
      f.load(`800 40px ${SANS}`),
      f.load(`500 40px ${SANS}`),
      f.load(`300 40px ${MONO}`),
      f.load(`500 40px ${MONO}`),
      f.load(`italic 500 40px ${SERIF}`),
      f.load(`800 40px ${KANJI}`, '忍'),
    ]),
    new Promise((r) => setTimeout(r, 2500)),
  ]).catch(() => {});
}

/** "'26 10 31": the date as a disposable camera prints it. */
export const stampOf = (d: Date) => `'${String(d.getFullYear()).slice(2)} ${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getDate()).padStart(2, '0')}`;
