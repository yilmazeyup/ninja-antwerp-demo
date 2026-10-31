import * as THREE from 'three/webgpu';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Geometry for Ninja's room: shapes that three.js does not have ready (an elliptical "lathe" for the spaceship bar, a
// polyline with rounded corners for chrome tube furniture), and the furniture itself, built once and instanced.

export type Detail = { radial: number; tube: number; bevel: number };

export const DETAIL: Record<'low' | 'medium' | 'high', Detail> = {
  low: { radial: 14, tube: 5, bevel: 1 },
  medium: { radial: 24, tube: 7, bevel: 2 },
  high: { radial: 40, tube: 9, bevel: 3 },
};

/** Merges geometries that may differ in their attributes (index, uv): keeps position, normal and uv (and colour). */
export function merge(parts: THREE.BufferGeometry[], keepColor = false): THREE.BufferGeometry {
  const keep = keepColor ? ['position', 'normal', 'uv', 'color'] : ['position', 'normal', 'uv'];
  const clean = parts.map((g) => {
    const n = g.index ? g.toNonIndexed() : g.clone();
    for (const name of Object.keys(n.attributes)) if (!keep.includes(name)) n.deleteAttribute(name);
    const count = n.getAttribute('position').count;
    if (!n.getAttribute('uv')) n.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
    if (!n.getAttribute('normal')) n.computeVertexNormals();
    if (keepColor && !n.getAttribute('color')) n.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(count * 3).fill(1), 3));
    return n;
  });
  const out = mergeGeometries(clean, false);
  for (const g of clean) g.dispose();
  for (const g of parts) g.dispose();
  return out ?? new THREE.BufferGeometry();
}

/** Geometry moved, turned and scaled in place. */
export function placed(g: THREE.BufferGeometry, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s: number | [number, number, number] = 1) {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    Array.isArray(s) ? new THREE.Vector3(...s) : new THREE.Vector3(s, s, s),
  );
  g.applyMatrix4(m);
  return g;
}

/**
 * A profile swept around an ellipse: the spaceship bar's chrome skin. `profile` holds [offset from the ellipse, y]
 * pairs from bottom to top; the ellipse has radii rx and rz. The ring closes on itself, so there is no seam.
 */
export function ellipticLathe(profile: [number, number][], rx: number, rz: number, segments = 96): THREE.BufferGeometry {
  const rows = profile.length;
  const pos = new Float32Array(rows * segments * 3);
  const uvs = new Float32Array(rows * segments * 2);
  for (let j = 0; j < rows; j++) {
    const [o, y] = profile[j];
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const k = (j * segments + i) * 3;
      pos[k] = Math.cos(a) * (rx + o);
      pos[k + 1] = y;
      pos[k + 2] = Math.sin(a) * (rz + o);
      uvs[(j * segments + i) * 2] = i / segments;
      uvs[(j * segments + i) * 2 + 1] = j / (rows - 1);
    }
  }
  const index: number[] = [];
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < segments; i++) {
      const a = j * segments + i;
      const b = j * segments + ((i + 1) % segments);
      const c = (j + 1) * segments + i;
      const d = (j + 1) * segments + ((i + 1) % segments);
      index.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/** A flat elliptical ring with rounded edges (the bar's lacquered top), lying in the xz plane. */
export function ellipticRing(rx: number, rz: number, width: number, thickness: number, bevel = 0.02, segments = 96) {
  const shape = new THREE.Shape();
  shape.absellipse(0, 0, rx, rz, 0, Math.PI * 2, false, 0);
  const hole = new THREE.Path();
  hole.absellipse(0, 0, rx - width, rz - width, 0, Math.PI * 2, true, 0);
  shape.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.001, thickness - bevel * 2),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: segments,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, bevel, 0);
  return g;
}

/** A polyline whose corners are rounded with radius `r`: chrome tube furniture is bent, never welded at an angle. */
export function bentPath(points: THREE.Vector3[], r: number): THREE.CurvePath<THREE.Vector3> {
  const path = new THREE.CurvePath<THREE.Vector3>();
  let from = points[0].clone();
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    const a = points[i - 1];
    const b = points[i + 1];
    const inDir = p.clone().sub(a).normalize();
    const outDir = b.clone().sub(p).normalize();
    const cut = Math.min(r, p.distanceTo(a) / 2, p.distanceTo(b) / 2);
    const start = p.clone().sub(inDir.clone().multiplyScalar(cut));
    const end = p.clone().add(outDir.clone().multiplyScalar(cut));
    if (from.distanceTo(start) > 1e-4) path.add(new THREE.LineCurve3(from, start));
    path.add(new THREE.QuadraticBezierCurve3(start, p.clone(), end));
    from = end;
  }
  path.add(new THREE.LineCurve3(from, points[points.length - 1].clone()));
  return path;
}

export function tube(points: THREE.Vector3[], radius: number, bend = 0.06, d: Detail = DETAIL.high, closed = false) {
  const path = bentPath(points, bend);
  return new THREE.TubeGeometry(path, Math.max(24, points.length * 10), radius, d.tube, closed);
}

/** A rounded box. */
export const roundedBox = (w: number, h: number, d: number, r = 0.02, segments = 3) => new RoundedBoxGeometry(w, h, d, segments, Math.min(r, w / 2, h / 2, d / 2));

/** A disc with a soft rounded edge (round table tops, stool cushions). */
export function roundedDisc(radius: number, height: number, edge = 0.012, segments = 48) {
  const e = Math.min(edge, height / 2, radius / 2);
  const pts: THREE.Vector2[] = [new THREE.Vector2(0, -height / 2)];
  const steps = 6;
  for (let i = 0; i <= steps; i++) {
    const a = -Math.PI / 2 + (i / steps) * (Math.PI / 2);
    pts.push(new THREE.Vector2(radius - e + Math.cos(a) * e, -height / 2 + e + Math.sin(a) * e));
  }
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * (Math.PI / 2);
    pts.push(new THREE.Vector2(radius - e + Math.cos(a) * e, height / 2 - e + Math.sin(a) * e));
  }
  pts.push(new THREE.Vector2(0, height / 2));
  return new THREE.LatheGeometry(pts, segments);
}

// ------------------------------------------------------------------------------------------------------ furniture

/**
 * A cantilever chair in chrome tube with oxblood leather seat and back (the chairs Le Fooding mentions). Facing +z:
 * the guest sits looking along +z, the back is at -z. Returns the frame (chrome) and the cushions (leather).
 */
export function chair(d: Detail) {
  const r = 0.011;
  const side = (x: number) =>
    tube(
      [
        new THREE.Vector3(x, 0.84, -0.215),
        new THREE.Vector3(x, 0.47, -0.205),
        new THREE.Vector3(x, 0.445, 0.2),
        new THREE.Vector3(x, 0.012, 0.24),
        new THREE.Vector3(x, 0.012, -0.16),
      ],
      r,
      0.07,
      d,
    );
  const cross = (y: number, z: number) => placed(new THREE.CylinderGeometry(r, r, 0.4, d.tube), 0, y, z, 0, 0, Math.PI / 2);
  const frame = merge([side(-0.2), side(0.2), cross(0.012, -0.16), cross(0.445, 0.19)]);
  const seat = placed(roundedBox(0.44, 0.06, 0.43, 0.025, d.bevel), 0, 0.485, 0.0);
  const back = placed(roundedBox(0.42, 0.27, 0.05, 0.02, d.bevel), 0, 0.69, -0.225, -0.1);
  return { frame, cushion: merge([seat, back]) };
}

/** A tall stool in chrome with a round leather cushion: the bar and the fire row. */
export function stool(d: Detail, height = 0.74) {
  const base = placed(roundedDisc(0.2, 0.024, 0.008, d.radial), 0, 0.012, 0);
  const post = placed(new THREE.CylinderGeometry(0.024, 0.03, height - 0.06, d.tube + 4), 0, (height - 0.06) / 2 + 0.02, 0);
  const ring = placed(new THREE.TorusGeometry(0.165, 0.01, d.tube, d.radial), 0, height * 0.38, 0, Math.PI / 2);
  const spokes = [0, 1, 2].map((i) => placed(new THREE.CylinderGeometry(0.008, 0.008, 0.165, 6), Math.cos((i * Math.PI * 2) / 3) * 0.08, height * 0.38, Math.sin((i * Math.PI * 2) / 3) * 0.08, 0, -(i * Math.PI * 2) / 3, Math.PI / 2));
  const frame = merge([base, post, ring, ...spokes]);
  const cushion = placed(roundedDisc(0.2, 0.075, 0.03, d.radial), 0, height - 0.01, 0);
  return { frame, cushion };
}

/** A votive on the table: glass, and the flame on top is drawn by the room (instanced). */
export function votive(d: Detail) {
  return new THREE.CylinderGeometry(0.032, 0.03, 0.075, d.tube + 4, 1, true).translate(0, 0.0375, 0);
}

/** A white plate with meat on it, for the pass and for the plates on their way to a table. */
export function plateGeometry(d: Detail) {
  const plate = roundedDisc(0.13, 0.016, 0.006, d.radial);
  const meat = placed(new THREE.SphereGeometry(0.075, d.tube + 6, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0, 0.006, 0, 0, 0, 0, [1, 0.42, 0.8]);
  return { plate, meat };
}
