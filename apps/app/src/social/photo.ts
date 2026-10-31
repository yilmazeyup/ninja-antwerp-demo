import { loadImage } from './flashLook';

/**
 * Her Match photo, made small before it leaves the camera: cropped to the card's 3:4 around the upper middle (where a
 * face is), as a JPEG of a few dozen kilobytes. Web only.
 */
export async function portraitFrom(src: HTMLCanvasElement | string, w = 480, h = 640, quality = 0.82): Promise<string> {
  const img: CanvasImageSource & { width: number; height: number } = typeof src === 'string' ? await loadImage(src) : src;
  const sw = img.width;
  const sh = img.height;
  const scale = Math.max(w / sw, h / sh);
  const cw = w / scale;
  const ch = h / scale;
  const sx = (sw - cw) / 2;
  const sy = Math.max(0, Math.min(sh - ch, (sh - ch) * 0.35));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, sx, sy, cw, ch, 0, 0, w, h);
  return c.toDataURL('image/jpeg', quality);
}
