// Ninja's wordmark in 3D: the puffy leather letters, generated at runtime from the logo's own mask. The letters are
// inflated from their outline (a smooth pillow, steep and round at the seam, domed where the strokes are wide), sit on
// a bone-leather backing cut to the logo's outline, and the outline itself is a dark leather piping around it, as on
// Ninja's menu. About one unit tall, centred, lit by whatever scene it is put in.
//
//   const logo = await createLeatherLogo({ maskUrl: '/brand/logo-mask.png', quality });
//   scene.add(logo.group);  …  logo.update(seconds);  …  logo.dispose();

import * as THREE from 'three/webgpu';
import { attribute, float, normalLocal, positionLocal, smoothstep, texture, vec2, vec3 } from 'three/tsl';

import { contours, decimate, inflate, loadImage, polygonArea, rasterize, resampleClosed, sample, signedDistance, splitLogo, boundsOf, type Grid } from './leatherField';
import { floatUniform, leatherMaterial } from './leather';
import type { Quality } from './renderer';

export type LeatherLogoOptions = {
  /** The logo's grey mask: white letters and outline on black (`/brand/logo-mask.png`). */
  maskUrl: string;
  quality: Quality;
  /** The letters puff up when first shown (default true). */
  intro?: boolean;
};

export type LeatherLogo = {
  group: THREE.Group;
  /** Width and height of the backing in scene units (height is 1). */
  size: { width: number; height: number };
  /** Call every frame with the time in seconds: drives the intro. */
  update(t: number): void;
  dispose(): void;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TSL's chained node API is typed far stricter than it runs.
const n = (x: unknown): any => x;

const DETAIL: Record<Quality, { field: number; iterations: number; spacing: number; radial: number }> = {
  high: { field: 1100, iterations: 260, spacing: 1.3, radial: 14 },
  medium: { field: 860, iterations: 200, spacing: 1.7, radial: 11 },
  low: { field: 640, iterations: 150, spacing: 2.3, radial: 9 },
};

/** Front profile: √(2u)·K is a semicircle across a strip, so the strokes read as round, stuffed tubes. */
const FRONT = 1.0;
/** The back is flatter; it rests in the backing. */
const BACK = 0.38;

export async function createLeatherLogo(opts: LeatherLogoOptions): Promise<LeatherLogo> {
  const detail = DETAIL[opts.quality] ?? DETAIL.medium;
  const img = await loadImage(opts.maskUrl);
  const pad = 8;
  const fw = detail.field + pad * 2;
  const fh = Math.round((detail.field * img.height) / img.width) + pad * 2;
  const grey = rasterize(img, fw, fh, pad);
  if ('close' in img && typeof (img as ImageBitmap).close === 'function') (img as ImageBitmap).close();

  const parts = splitLogo(grey, fw, fh);
  const box = boundsOf(parts.backing, fw, fh);
  const unit = 1 / (box.y1 - box.y0 + 1); // scene units per field pixel: the backing is one unit tall
  const cx = (box.x0 + box.x1) / 2;
  const cy = (box.y0 + box.y1) / 2;
  const toX = (x: number) => (x - cx) * unit;
  const toY = (y: number) => -(y - cy) * unit;

  // The backing's thickness and the piping's radius follow the outline in the mask.
  const ringHalf = parts.ringHalf * unit;
  const piping = Math.max(0.0085, ringHalf * 1.55);
  const plate = piping * 1.45;
  const seam = plate / 2 - 0.0015;

  const letterField = signedDistance(parts.letters, fw, fh, 1.1);
  const backingField = signedDistance(parts.backing, fw, fh, 1.3);

  const lettersGeo = buildLetters(decimate(letterField, 2), detail.iterations, { toX, toY, step: 2, unit, seam });
  const { plateGeo, pipingGeo } = buildBacking(backingField, { toX, toY, unit, inset: ringHalf, piping, plate, spacing: detail.spacing, radial: detail.radial });
  const ao = occlusionTexture(decimate(letterField, 2), backingField, unit, toX, toY);

  // Materials. The intro inflates the letters from the backing: z scales up, normals follow.
  const inflateU = floatUniform(opts.intro === false ? 1 : 0.0001);
  const s = n(inflateU).max(0.03);
  const inflatedNormal = n(vec3(n(normalLocal.x).mul(s), n(normalLocal.y).mul(s), normalLocal.z));
  const puff = n(attribute('puff', 'float'));
  const letterMat = leatherMaterial({
    kind: 'oxblood',
    quality: opts.quality,
    normal: inflatedNormal,
    lift: puff,
    occlusion: n(smoothstep(0.0, 0.3, puff as never)).mul(0.5).add(0.5),
  });
  letterMat.positionNode = vec3(positionLocal.x, positionLocal.y, n(n(positionLocal.z).sub(seam)).mul(inflateU).add(seam));

  const ext = ao.extent;
  const aoUv = vec2(n(n(positionLocal.x).sub(ext.x0)).div(ext.x1 - ext.x0), n(n(float(ext.y0)).sub(positionLocal.y)).div(ext.y0 - ext.y1));
  const plateMat = leatherMaterial({ kind: 'bone', quality: opts.quality, occlusion: n(texture(ao.texture, aoUv as never)).x });
  const pipingMat = leatherMaterial({ kind: 'piping', quality: opts.quality });

  const group = new THREE.Group();
  group.name = 'ninja-leather-logo';
  const letters = new THREE.Mesh(lettersGeo, letterMat);
  letters.name = 'letters';
  letters.castShadow = true;
  letters.receiveShadow = true;
  const backing = new THREE.Mesh(plateGeo, plateMat);
  backing.name = 'backing';
  backing.receiveShadow = true;
  const rim = new THREE.Mesh(pipingGeo, pipingMat);
  rim.name = 'piping';
  rim.castShadow = true;
  group.add(backing, rim, letters);

  const width = (box.x1 - box.x0 + 1) * unit + piping * 2;
  let start = -1;
  return {
    group,
    size: { width, height: 1 + piping * 2 },
    update(t: number) {
      if (opts.intro === false) return;
      if (start < 0) start = t;
      const x = Math.min(1, Math.max(0, (t - start - 0.15) / 1.5));
      inflateU.value = Math.max(0.0001, 1 - Math.pow(1 - x, 3));
    },
    dispose() {
      lettersGeo.dispose();
      plateGeo.dispose();
      pipingGeo.dispose();
      ao.texture.dispose();
      letterMat.dispose();
      plateMat.dispose();
      pipingMat.dispose();
      group.removeFromParent();
    },
  };
}

// ---------------------------------------------------------------------------------------------------------- letters

type Mapping = { toX: (x: number) => number; toY: (y: number) => number; step: number; unit: number; seam: number };

/**
 * The letters as a closed pillow: a front and a back height field over the grid, cut at the exact outline by marching
 * squares (the edge vertices sit on the zero of the signed distance), meeting at the seam with horizontal normals.
 */
function buildLetters(sdf: Grid, iterations: number, map: Mapping): THREE.BufferGeometry {
  const { w, h, data: s } = sdf;
  const u = inflate(sdf, iterations);
  const scale = map.unit * map.step; // scene units per grid step
  const hf = new Float32Array(w * h);
  let top = 0;
  for (let i = 0; i < w * h; i++) {
    hf[i] = s[i] > 0 ? Math.sqrt(2 * u[i]) : 0;
    if (hf[i] > top) top = hf[i];
  }
  // Gradient of u, one-sided at the edge (distance to the edge from the signed distance).
  const grad = (k: number, d: number) => {
    const fwd = s[k + d] > 0 ? 1 : Math.min(1, Math.max(0.08, s[k] / (s[k] - s[k + d])));
    const back = s[k - d] > 0 ? 1 : Math.min(1, Math.max(0.08, s[k] / (s[k] - s[k - d])));
    const uf = s[k + d] > 0 ? u[k + d] : 0;
    const ub = s[k - d] > 0 ? u[k - d] : 0;
    return ((uf - u[k]) / fwd + (u[k] - ub) / back) / 2;
  };
  const sdfGrad = (x: number, y: number): [number, number] => {
    const xi = Math.min(w - 2, Math.max(1, Math.round(x)));
    const yi = Math.min(h - 2, Math.max(1, Math.round(y)));
    const gx = (sample(sdf, x + 0.5, y) - sample(sdf, x - 0.5, y)) || (s[yi * w + xi + 1] - s[yi * w + xi - 1]) / 2;
    const gy = (sample(sdf, x, y + 0.5) - sample(sdf, x, y - 0.5)) || (s[(yi + 1) * w + xi] - s[(yi - 1) * w + xi]) / 2;
    return [gx, gy];
  };

  const pos: number[] = [];
  const nrm: number[] = [];
  const puff: number[] = [];
  const front: number[] = [];
  const gridVert = new Int32Array(w * h).fill(-1);
  const hEdge = new Int32Array((w - 1) * h).fill(-1);
  const vEdge = new Int32Array(w * (h - 1)).fill(-1);

  const push = (x: number, y: number, z: number, nx: number, ny: number, nz: number, p: number) => {
    const l = Math.hypot(nx, ny, nz) || 1;
    pos.push(map.toX(x * map.step), map.toY(y * map.step), z);
    nrm.push(nx / l, ny / l, nz / l);
    puff.push(p);
    return pos.length / 3 - 1;
  };
  const gridVertex = (x: number, y: number) => {
    const k = y * w + x;
    if (gridVert[k] >= 0) return gridVert[k];
    const r = Math.sqrt(2 * u[k]) + 1e-4;
    const ux = x > 0 && x < w - 1 ? grad(k, 1) : 0;
    const uy = y > 0 && y < h - 1 ? grad(k, w) : 0;
    // dz/dx (grid) = K·∂u/∂x / √(2u); in scene space y is flipped.
    const dx = (FRONT * ux) / r;
    const dy = (FRONT * uy) / r;
    return (gridVert[k] = push(x, y, map.seam + FRONT * hf[k] * scale, -dx, dy, 1, top > 0 ? hf[k] / top : 0));
  };
  const edgeVertex = (ax: number, ay: number, bx: number, by: number) => {
    const horizontal = ay === by;
    const id = horizontal ? ay * (w - 1) + Math.min(ax, bx) : Math.min(ay, by) * w + ax;
    const table = horizontal ? hEdge : vEdge;
    if (table[id] >= 0) return table[id];
    const sa = s[ay * w + ax];
    const sb = s[by * w + bx];
    const t = sa / (sa - sb);
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t;
    const [gx, gy] = sdfGrad(x, y);
    // Outward and level: the seam, where the front meets the back.
    return (table[id] = push(x, y, map.seam, -gx, gy, 0, 0));
  };

  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      const cx = [x, x + 1, x + 1, x];
      const cy = [y, y, y + 1, y + 1];
      const inside = cx.map((xx, i) => s[cy[i] * w + xx] > 0);
      const count = inside.filter(Boolean).length;
      if (count === 0) continue;
      const poly: number[] = [];
      const corner: number[] = [];
      const edge: number[] = [];
      for (let k = 0; k < 4; k++) {
        const k2 = (k + 1) % 4;
        corner[k] = inside[k] ? gridVertex(cx[k], cy[k]) : -1;
        edge[k] = inside[k] !== inside[k2] ? edgeVertex(cx[k], cy[k], cx[k2], cy[k2]) : -1;
        if (corner[k] >= 0) poly.push(corner[k]);
        if (edge[k] >= 0) poly.push(edge[k]);
      }
      const saddle = count === 2 && inside[0] === inside[2];
      const centre = (s[y * w + x] + s[y * w + x + 1] + s[(y + 1) * w + x + 1] + s[(y + 1) * w + x]) / 4;
      if (saddle && centre <= 0) {
        for (let k = 0; k < 4; k++) if (corner[k] >= 0) front.push(edge[(k + 3) % 4], edge[k], corner[k]);
        continue;
      }
      // Walking c0→c1→c2→c3 in image space (y down) is clockwise in scene space: reverse for faces toward +z.
      for (let i = 1; i < poly.length - 1; i++) front.push(poly[0], poly[i + 1], poly[i]);
    }
  }

  // The back: the same outline, a flatter pillow, facing −z.
  const count = pos.length / 3;
  for (let i = 0; i < count; i++) {
    const z = pos[i * 3 + 2];
    const depth = ((z - map.seam) * BACK) / FRONT;
    pos.push(pos[i * 3], pos[i * 3 + 1], map.seam - depth);
    const nx = nrm[i * 3] * BACK;
    const ny = nrm[i * 3 + 1] * BACK;
    const nz = -nrm[i * 3 + 2];
    const l = Math.hypot(nx, ny, nz) || 1;
    nrm.push(nx / l, ny / l, nz / l);
    puff.push(0);
  }
  const index: number[] = front.slice();
  for (let i = 0; i < front.length; i += 3) index.push(front[i] + count, front[i + 2] + count, front[i + 1] + count);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geo.setAttribute('puff', new THREE.Float32BufferAttribute(puff, 1));
  geo.setIndex(count * 2 > 65535 ? new THREE.Uint32BufferAttribute(index, 1) : new THREE.Uint16BufferAttribute(index, 1));
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

// ------------------------------------------------------------------------------------------------ backing and piping

type BackingOptions = { toX: (x: number) => number; toY: (y: number) => number; unit: number; inset: number; piping: number; plate: number; spacing: number; radial: number };

/** The bone backing cut to the outline, and the piping: a leather tube following the outline all around. */
function buildBacking(field: Grid, o: BackingOptions) {
  const loops = contours(field);
  // The outer edge: the loop that encloses the most.
  let outer = loops[0];
  let best = 0;
  for (const l of loops) {
    const a = Math.abs(polygonArea(l));
    if (a > best) {
      best = a;
      outer = l;
    }
  }
  const pts = resampleClosed(outer, o.spacing, 8);
  const m = pts.length / 2;
  // Into scene space, counter-clockwise.
  const xs = new Float32Array(m);
  const ys = new Float32Array(m);
  for (let i = 0; i < m; i++) {
    xs[i] = o.toX(pts[i * 2]);
    ys[i] = o.toY(pts[i * 2 + 1]);
  }
  let area = 0;
  for (let i = 0; i < m; i++) {
    const j = (i + 1) % m;
    area += xs[i] * ys[j] - xs[j] * ys[i];
  }
  if (area < 0) {
    xs.reverse();
    ys.reverse();
  }
  // Outward normals (for a counter-clockwise loop: the tangent turned clockwise), and the line the piping follows.
  const nx = new Float32Array(m);
  const ny = new Float32Array(m);
  const px = new Float32Array(m);
  const py = new Float32Array(m);
  for (let i = 0; i < m; i++) {
    const a = (i + m - 1) % m;
    const b = (i + 1) % m;
    const tx = xs[b] - xs[a];
    const ty = ys[b] - ys[a];
    const l = Math.hypot(tx, ty) || 1;
    nx[i] = ty / l;
    ny[i] = -tx / l;
    px[i] = xs[i] - nx[i] * o.inset;
    py[i] = ys[i] - ny[i] * o.inset;
  }

  const shape = new THREE.Shape(Array.from(px, (x, i) => new THREE.Vector2(x, py[i])));
  const plateGeo = new THREE.ExtrudeGeometry(shape, { depth: o.plate, bevelEnabled: false, curveSegments: 1, steps: 1 });
  plateGeo.translate(0, 0, -o.plate / 2);

  // The piping: a tube of radius `piping` around the line, slightly proud of both faces.
  const R = o.radial;
  const pos = new Float32Array(m * R * 3);
  const nrm = new Float32Array(m * R * 3);
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < R; j++) {
      const phi = (j / R) * Math.PI * 2;
      const c = Math.cos(phi);
      const sn = Math.sin(phi);
      const k = (i * R + j) * 3;
      nrm[k] = c * nx[i];
      nrm[k + 1] = c * ny[i];
      nrm[k + 2] = sn;
      pos[k] = px[i] + nrm[k] * o.piping;
      pos[k + 1] = py[i] + nrm[k + 1] * o.piping;
      pos[k + 2] = nrm[k + 2] * o.piping;
    }
  }
  const idx: number[] = [];
  for (let i = 0; i < m; i++) {
    const i2 = (i + 1) % m;
    for (let j = 0; j < R; j++) {
      const j2 = (j + 1) % R;
      const a = i * R + j;
      const b = i2 * R + j;
      const c = i2 * R + j2;
      const d = i * R + j2;
      idx.push(a, b, d, b, c, d);
    }
  }
  const pipingGeo = new THREE.BufferGeometry();
  pipingGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pipingGeo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  pipingGeo.setIndex(m * R > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
  // Make sure the faces point outward: compare one face's winding with its normal.
  {
    const v = (q: number) => new THREE.Vector3(pos[q * 3], pos[q * 3 + 1], pos[q * 3 + 2]);
    const [a, b, d] = [idx[0], idx[1], idx[2]];
    const face = new THREE.Vector3().subVectors(v(b), v(a)).cross(new THREE.Vector3().subVectors(v(d), v(a)));
    const normal = new THREE.Vector3(nrm[a * 3], nrm[a * 3 + 1], nrm[a * 3 + 2]);
    if (face.dot(normal) < 0) {
      for (let q = 0; q < idx.length; q += 3) [idx[q + 1], idx[q + 2]] = [idx[q + 2], idx[q + 1]];
      pipingGeo.setIndex(m * R > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
    }
  }
  pipingGeo.computeBoundingSphere();
  return { plateGeo, pipingGeo };
}

/** Contact shadow on the backing: darker right next to the letters and under the piping. */
function occlusionTexture(letters: Grid, backing: Grid, unit: number, toX: (x: number) => number, toY: (y: number) => number) {
  const { w, h } = letters;
  const unitPerCell = unit * 2;
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = y * w + x;
      const out = Math.max(0, -letters.data[k]) * unitPerCell;
      let ao = 1 - 0.62 * Math.exp(-out / 0.016) - 0.12 * Math.exp(-out / 0.05);
      const edge = sample(backing, x * 2, y * 2) * (unitPerCell / 2);
      if (edge > 0) ao *= 1 - 0.28 * Math.exp(-edge / 0.012);
      const v = Math.round(Math.min(1, Math.max(0, ao)) * 255);
      data[k * 4] = data[k * 4 + 1] = data[k * 4 + 2] = v;
      data[k * 4 + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  // Texel i covers the cell around grid point i (field pixel 2i): the texture's edges sit half a cell outside.
  const x0 = toX(0) - unit;
  const y0 = toY(0) + unit;
  return { texture: tex, extent: { x0, x1: x0 + unitPerCell * w, y0, y1: y0 - unitPerCell * h } };
}
