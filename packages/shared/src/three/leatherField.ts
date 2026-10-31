// The image work behind the 3D wordmark, without three.js: reading Ninja's logo mask, separating the letters from the
// outline, signed distances, the "inflation" that turns flat letters into a leather pillow, and the outline's contour.
// Plain typed arrays, so it runs anywhere a canvas does (the website, the panel, the app on the web).

export type Grid = { w: number; h: number; data: Float32Array };

const INF = 1e20;

/** Loads an image for reading its pixels: fetch + createImageBitmap where available, an <img> otherwise. */
export async function loadImage(url: string): Promise<CanvasImageSource & { width: number; height: number }> {
  if (typeof createImageBitmap === 'function' && typeof fetch === 'function') {
    try {
      const res = await fetch(url);
      if (res.ok) return await createImageBitmap(await res.blob());
    } catch {
      // Fall back to an image element below.
    }
  }
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = url;
  await img.decode();
  return img;
}

/**
 * The image's grey values (0–1), smoothly downsampled to `w` × `h` and framed by `pad` black pixels, so shapes that
 * touch the image's edge still get closed outlines.
 */
export function rasterize(src: CanvasImageSource, w: number, h: number, pad = 0): Float32Array {
  const canvas: OffscreenCanvas | HTMLCanvasElement =
    typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
  const ctx = canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!ctx) throw new Error('2D canvas unavailable');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(src, pad, pad, w - pad * 2, h - pad * 2);
  const px = ctx.getImageData(0, 0, w, h).data;
  const out = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = px[i * 4] / 255;
  return out;
}

// ------------------------------------------------------------------------------------------------ distance transform

/** Felzenszwalb & Huttenlocher's exact squared Euclidean distance transform, in place. */
function edt(grid: Float64Array, w: number, h: number) {
  const n = Math.max(w, h);
  const f = new Float64Array(n);
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  const pass = (len: number) => {
    let k = 0;
    v[0] = 0;
    z[0] = -INF;
    z[1] = INF;
    for (let q = 1; q < len; q++) {
      let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) {
        k--;
        s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      }
      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < len; q++) {
      while (z[k + 1] < q) k++;
      const dq = q - v[k];
      d[q] = dq * dq + f[v[k]];
    }
  };
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = grid[y * w + x];
    pass(h);
    for (let y = 0; y < h; y++) grid[y * w + x] = d[y];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = grid[y * w + x];
    pass(w);
    for (let x = 0; x < w; x++) grid[y * w + x] = d[x];
  }
}

/** Signed distance in pixels to the edge of `inside`: positive inside, negative outside; smoothed by `blur`. */
export function signedDistance(inside: Uint8Array, w: number, h: number, blur = 1.1): Grid {
  const a = new Float64Array(w * h);
  const b = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) {
    a[i] = inside[i] ? INF : 0; // distance to the nearest outside pixel
    b[i] = inside[i] ? 0 : INF; // distance to the nearest inside pixel
  }
  edt(a, w, h);
  edt(b, w, h);
  const s = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) s[i] = inside[i] ? Math.sqrt(a[i]) - 0.5 : -(Math.sqrt(b[i]) - 0.5);
  return { w, h, data: blur > 0 ? gaussian(s, w, h, blur) : s };
}

/** A separable Gaussian blur. */
export function gaussian(src: Float32Array, w: number, h: number, sigma: number): Float32Array {
  const r = Math.max(1, Math.ceil(sigma * 3));
  const k = new Float32Array(r * 2 + 1);
  let sum = 0;
  for (let i = -r; i <= r; i++) sum += k[i + r] = Math.exp(-(i * i) / (2 * sigma * sigma));
  for (let i = 0; i < k.length; i++) k[i] /= sum;
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let i = -r; i <= r; i++) acc += src[row + Math.min(w - 1, Math.max(0, x + i))] * k[i + r];
      tmp[row + x] = acc;
    }
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let acc = 0;
      for (let i = -r; i <= r; i++) acc += tmp[Math.min(h - 1, Math.max(0, y + i)) * w + x] * k[i + r];
      out[y * w + x] = acc;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------- the logo's parts

export type LogoParts = {
  w: number;
  h: number;
  /** The puffy letters (white in the mask, not touching the outline). */
  letters: Uint8Array;
  /** The thin outline around the word. */
  ring: Uint8Array;
  /** Everything inside the outline's outer edge: the letters, the gap and the outline itself. */
  backing: Uint8Array;
  /** Half the outline's width, in pixels. */
  ringHalf: number;
};

/**
 * Splits the mask into its parts: the background is what the image border reaches through black; the outline is the
 * white that touches it; the letters are the rest of the white.
 */
export function splitLogo(grey: Float32Array, w: number, h: number): LogoParts {
  const white = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) white[i] = grey[i] > 0.5 ? 1 : 0;
  const outside = new Uint8Array(w * h);
  const stack: number[] = [];
  const seed = (i: number) => {
    if (!white[i] && !outside[i]) {
      outside[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < w; x++) {
    seed(x);
    seed((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    seed(y * w);
    seed(y * w + w - 1);
  }
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % w;
    const y = (i - x) / w;
    if (x > 0) seed(i - 1);
    if (x < w - 1) seed(i + 1);
    if (y > 0) seed(i - w);
    if (y < h - 1) seed(i + w);
  }
  // The outline: white pixels connected (8-way) to white that borders the background.
  const ring = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (white[i] && !ring[i] && (outside[i - 1] || outside[i + 1] || outside[i - w] || outside[i + w])) {
        ring[i] = 1;
        stack.push(i);
      }
    }
  }
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % w;
    const y = (i - x) / w;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (white[j] && !ring[j]) {
          ring[j] = 1;
          stack.push(j);
        }
      }
    }
  }
  const letters = new Uint8Array(w * h);
  const backing = new Uint8Array(w * h);
  let ringArea = 0;
  for (let i = 0; i < w * h; i++) {
    letters[i] = white[i] && !ring[i] ? 1 : 0;
    backing[i] = outside[i] ? 0 : 1;
    if (ring[i]) ringArea += grey[i];
  }
  // The outline's length is about its outer edge; its width is its area over that length.
  let edge = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (ring[y * w + x] && outside[y * w + x + 1] !== outside[y * w + x - 1]) edge++;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (ring[y * w + x] && outside[(y + 1) * w + x] !== outside[(y - 1) * w + x]) edge++;
  const ringHalf = edge > 0 ? Math.max(0.6, ringArea / edge / 2) : 1;
  return { w, h, letters, ring, backing, ringHalf };
}

/** The bounding box of a mask. */
export function boundsOf(mask: Uint8Array, w: number, h: number) {
  let x0 = w;
  let y0 = h;
  let x1 = 0;
  let y1 = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return { x0, y0, x1, y1 };
}

// ------------------------------------------------------------------------------------------------------- inflation

/**
 * Inflates a shape: solves ∇²u = −1 inside (u = 0 on the exact edge, found from the signed distance between grid
 * points: Shortley–Weller), by successive over-relaxation. √(2u) is then a round profile: a semicircle across a strip,
 * a dome on a blob, a steep but smooth wall at the edge. That is the puffy leather.
 */
export function inflate(sdf: Grid, iterations: number): Float32Array {
  const { w, h, data: s } = sdf;
  const u = new Float32Array(w * h);
  const idx: number[] = [];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (s[y * w + x] > 0) idx.push(y * w + x);
  const n = idx.length;
  const cl = new Float32Array(n);
  const cr = new Float32Array(n);
  const cu = new Float32Array(n);
  const cd = new Float32Array(n);
  const inv = new Float32Array(n);
  const nl = new Int32Array(n);
  const nr = new Int32Array(n);
  const nu = new Int32Array(n);
  const nd = new Int32Array(n);
  // Distance (in grid steps) to the edge or the next point, per side.
  const step = (k: number, j: number) => (s[j] > 0 ? 1 : Math.min(1, Math.max(0.08, s[k] / (s[k] - s[j]))));
  for (let q = 0; q < n; q++) {
    const k = idx[q];
    const hl = step(k, k - 1);
    const hr = step(k, k + 1);
    const hu = step(k, k - w);
    const hd = step(k, k + w);
    cl[q] = 2 / (hl * (hl + hr));
    cr[q] = 2 / (hr * (hl + hr));
    cu[q] = 2 / (hu * (hu + hd));
    cd[q] = 2 / (hd * (hu + hd));
    inv[q] = 1 / (cl[q] + cr[q] + cu[q] + cd[q]);
    // Neighbours outside count as the edge, where u = 0: point them at a cell that stays 0.
    nl[q] = s[k - 1] > 0 ? k - 1 : -1;
    nr[q] = s[k + 1] > 0 ? k + 1 : -1;
    nu[q] = s[k - w] > 0 ? k - w : -1;
    nd[q] = s[k + w] > 0 ? k + w : -1;
    u[k] = Math.max(0, s[k]) * 2; // a start that is already the right shape near the edge
  }
  const at = (j: number) => (j < 0 ? 0 : u[j]);
  const omega = 1.88;
  for (let it = 0; it < iterations; it++) {
    for (let q = 0; q < n; q++) {
      const k = idx[q];
      const gs = (cl[q] * at(nl[q]) + cr[q] * at(nr[q]) + cu[q] * at(nu[q]) + cd[q] * at(nd[q]) + 1) * inv[q];
      u[k] += omega * (gs - u[k]);
    }
  }
  for (let q = 0; q < n; q++) if (u[idx[q]] < 0) u[idx[q]] = 0;
  return u;
}

// ------------------------------------------------------------------------------------------------------- contours

/** Closed contours of `sdf = 0` (marching squares), as [x, y] pixel coordinates; the longest first. */
export function contours(sdf: Grid): Float32Array[] {
  const { w, h, data: s } = sdf;
  // Edge crossings get ids: horizontal edges first, then vertical ones.
  const hid = (x: number, y: number) => y * (w - 1) + x;
  const vid = (x: number, y: number) => (w - 1) * h + y * w + x;
  const point = new Map<number, [number, number]>();
  const link = new Map<number, number[]>();
  const cross = (id: number, ax: number, ay: number, bx: number, by: number) => {
    if (!point.has(id)) {
      const sa = s[ay * w + ax];
      const sb = s[by * w + bx];
      const t = sa / (sa - sb);
      point.set(id, [ax + (bx - ax) * t, ay + (by - ay) * t]);
    }
    return id;
  };
  const join = (a: number, b: number) => {
    (link.get(a) ?? link.set(a, []).get(a)!).push(b);
    (link.get(b) ?? link.set(b, []).get(b)!).push(a);
  };
  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      const c0 = s[y * w + x] > 0;
      const c1 = s[y * w + x + 1] > 0;
      const c2 = s[(y + 1) * w + x + 1] > 0;
      const c3 = s[(y + 1) * w + x] > 0;
      if (c0 === c1 && c1 === c2 && c2 === c3) continue;
      const e: number[] = [];
      if (c0 !== c1) e.push(cross(hid(x, y), x, y, x + 1, y));
      if (c1 !== c2) e.push(cross(vid(x + 1, y), x + 1, y, x + 1, y + 1));
      if (c2 !== c3) e.push(cross(hid(x, y + 1), x + 1, y + 1, x, y + 1));
      if (c3 !== c0) e.push(cross(vid(x, y), x, y + 1, x, y));
      if (e.length === 2) join(e[0], e[1]);
      else if (e.length === 4) {
        const centre = (s[y * w + x] + s[y * w + x + 1] + s[(y + 1) * w + x + 1] + s[(y + 1) * w + x]) / 4 > 0;
        if (centre === c0) {
          join(e[0], e[1]);
          join(e[2], e[3]);
        } else {
          join(e[0], e[3]);
          join(e[1], e[2]);
        }
      }
    }
  }
  const seen = new Set<number>();
  const loops: Float32Array[] = [];
  for (const start of link.keys()) {
    if (seen.has(start)) continue;
    const pts: number[] = [];
    let prev = -1;
    let cur = start;
    for (let guard = 0; guard < 1e6; guard++) {
      seen.add(cur);
      const p = point.get(cur)!;
      pts.push(p[0], p[1]);
      const next = (link.get(cur) ?? []).find((n) => n !== prev && !seen.has(n));
      if (next === undefined) break;
      prev = cur;
      cur = next;
    }
    if (pts.length >= 8) loops.push(new Float32Array(pts));
  }
  return loops.sort((a, b) => b.length - a.length);
}

/** Signed area of a closed polyline (positive: counter-clockwise in y-up coordinates). */
export function polygonArea(p: Float32Array): number {
  let a = 0;
  const n = p.length / 2;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    a += p[i * 2] * p[j * 2 + 1] - p[j * 2] * p[i * 2 + 1];
  }
  return a / 2;
}

/** A closed polyline resampled at an even spacing, then smoothed without shrinking (Taubin). */
export function resampleClosed(p: Float32Array, spacing: number, smooth = 6): Float32Array {
  const n = p.length / 2;
  const cum = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    cum[i + 1] = cum[i] + Math.hypot(p[j * 2] - p[i * 2], p[j * 2 + 1] - p[i * 2 + 1]);
  }
  const total = cum[n];
  const m = Math.max(16, Math.round(total / spacing));
  let out = new Float32Array(m * 2);
  let seg = 0;
  for (let k = 0; k < m; k++) {
    const d = (k / m) * total;
    while (seg < n - 1 && cum[seg + 1] < d) seg++;
    const j = (seg + 1) % n;
    const t = (d - cum[seg]) / Math.max(1e-9, cum[seg + 1] - cum[seg]);
    out[k * 2] = p[seg * 2] + (p[j * 2] - p[seg * 2]) * t;
    out[k * 2 + 1] = p[seg * 2 + 1] + (p[j * 2 + 1] - p[seg * 2 + 1]) * t;
  }
  for (let it = 0; it < smooth; it++) {
    for (const lambda of [0.5, -0.53]) {
      const next = new Float32Array(m * 2);
      for (let k = 0; k < m; k++) {
        const a = (k + m - 1) % m;
        const b = (k + 1) % m;
        for (let c = 0; c < 2; c++) next[k * 2 + c] = out[k * 2 + c] + lambda * ((out[a * 2 + c] + out[b * 2 + c]) / 2 - out[k * 2 + c]);
      }
      out = next;
    }
  }
  return out;
}

/** Bilinear sample of a grid at a fractional pixel position. */
export function sample(g: Grid, x: number, y: number): number {
  const x0 = Math.max(0, Math.min(g.w - 2, Math.floor(x)));
  const y0 = Math.max(0, Math.min(g.h - 2, Math.floor(y)));
  const fx = Math.min(1, Math.max(0, x - x0));
  const fy = Math.min(1, Math.max(0, y - y0));
  const d = g.data;
  const i = y0 * g.w + x0;
  return (d[i] * (1 - fx) + d[i + 1] * fx) * (1 - fy) + (d[i + g.w] * (1 - fx) + d[i + g.w + 1] * fx) * fy;
}

/** Every other pixel of a grid (the mesh is half the resolution of the field it is read from). */
export function decimate(g: Grid, factor: number): Grid {
  const w = Math.floor((g.w - 1) / factor) + 1;
  const h = Math.floor((g.h - 1) / factor) + 1;
  const data = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data[y * w + x] = g.data[y * factor * g.w + x * factor] / factor;
  return { w, h, data };
}
