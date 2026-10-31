import * as THREE from 'three/webgpu';

/**
 * One tileable noise texture for every procedural surface in the room, made once on the CPU (a few milliseconds) and
 * mipmapped, so patterns stay calm from afar and shaders stay small:
 *   r – smooth fractal noise (clouds, bedding, mottling)
 *   g – the same at four times the frequency (grain, detail)
 *   b – cellular distance (pores, chips, cells), 0 at a cell's centre
 *   a – ridges (veins): 1 on the crest of the noise
 */

const SIZE = 256;

function lattice(seed: number, n: number) {
  const v = new Float32Array(n * n);
  let s = seed >>> 0;
  for (let i = 0; i < v.length; i++) {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    v[i] = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return v;
}

/** Tileable value noise at `cells` per tile. */
function valueNoise(seed: number, cells: number) {
  const g = lattice(seed, cells);
  return (x: number, y: number) => {
    const fx = (x / SIZE) * cells;
    const fy = (y / SIZE) * cells;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = fx - x0;
    const ty = fy - y0;
    const sx = tx * tx * (3 - 2 * tx);
    const sy = ty * ty * (3 - 2 * ty);
    const at = (i: number, j: number) => g[((j + cells) % cells) * cells + ((i + cells) % cells)];
    const a = at(x0, y0);
    const b = at(x0 + 1, y0);
    const c = at(x0, y0 + 1);
    const d = at(x0 + 1, y0 + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}

function fbm(seed: number, base: number, octaves: number) {
  const layers = Array.from({ length: octaves }, (_, o) => valueNoise(seed + o * 101, base << o));
  return (x: number, y: number) => {
    let sum = 0;
    let amp = 0.5;
    let norm = 0;
    for (const l of layers) {
      sum += l(x, y) * amp;
      norm += amp;
      amp *= 0.5;
    }
    return sum / norm;
  };
}

function worley(seed: number, cells: number) {
  const pts = lattice(seed, cells * 2);
  return (x: number, y: number) => {
    const fx = (x / SIZE) * cells;
    const fy = (y / SIZE) * cells;
    const cx = Math.floor(fx);
    const cy = Math.floor(fy);
    let best = 9;
    for (let j = -1; j <= 1; j++) {
      for (let i = -1; i <= 1; i++) {
        const gx = (cx + i + cells) % cells;
        const gy = (cy + j + cells) % cells;
        const px = cx + i + pts[gy * cells + gx];
        const py = cy + j + pts[cells * cells + gy * cells + gx];
        const d = (px - fx) ** 2 + (py - fy) ** 2;
        if (d < best) best = d;
      }
    }
    return Math.min(1, Math.sqrt(best));
  };
}

let shared: THREE.DataTexture | null = null;
let users = 0;

/** The shared noise texture (made on first use). */
export function noiseTexture(): THREE.DataTexture {
  users++;
  if (shared) return shared;
  const data = new Uint8Array(SIZE * SIZE * 4);
  const r = fbm(11, 4, 5);
  const g = fbm(29, 16, 4);
  const b = worley(47, 24);
  const a = fbm(83, 6, 4);
  let lo = 1;
  let hi = 0;
  const rr = new Float32Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const v = r(x, y);
      rr[y * SIZE + x] = v;
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
  }
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4;
      data[i] = Math.round(((rr[y * SIZE + x] - lo) / (hi - lo)) * 255);
      data[i + 1] = Math.round(Math.min(1, Math.max(0, (g(x, y) - 0.2) / 0.6)) * 255);
      data[i + 2] = Math.round(b(x, y) * 255);
      data[i + 3] = Math.round(Math.pow(1 - Math.abs(a(x, y) * 2 - 1), 3) * 255);
    }
  }
  const t = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 8;
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  shared = t;
  return t;
}

/** Frees the texture when the last user lets go. */
export function releaseNoise() {
  users = Math.max(0, users - 1);
  if (users === 0 && shared) {
    shared.dispose();
    shared = null;
  }
}
