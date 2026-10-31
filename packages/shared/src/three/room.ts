import * as THREE from 'three/webgpu';
import { color, fract, sin, smoothstep, time, uniform, uv } from 'three/tsl';

import { ROOM, TABLES, tableById, type Table } from '../floor';
import { hash } from '../random';
import { TEAM, type TeamId } from '../team';
import { createFire, createOven, createSpit, disposeGroup, type Fire, type Oven, type Spit } from './fire-admin';
import { Crowd, guestLook, staffLook, type Look } from './people';
import type { Quality } from './renderer';
import * as M from './room-materials';
import { DETAIL, chair, ellipticLathe, ellipticRing, merge, plateGeometry, roundedBox, roundedDisc, stool, tube, votive, type Detail } from './room-parts';

/*
 * Ninja's room in 3D, the demo's own drawing after Le Fooding's description and Ninja's photos: a modernist ground
 * floor on the Vlaamsekaai, cut open like a doll's house at night. Walnut-slatted walls, the oxblood channel-stitched
 * banquette, travertine tables, chrome tube chairs, the spaceship bar in chrome with its glowing ring, the open kitchen
 * with two döner spits before an oak fire, the stone oven, the pass under garlands of garlic and chili, the glass front
 * on the quay with its lit pilasters, the heated terrace, the wet street, and the people.
 *
 * `createRoom` is framework-free (no DOM, no React): the guest app calls it on its own WebGPURenderer; the panel builds
 * its live twin on top of it (guests at their tables, the line, plates on their way, calls, Match).
 * Units are metres; the coordinates are those of floor.ts.
 */

export type RoomOptions = { quality: Quality; people?: boolean; outside?: boolean };

export type Seat = { x: number; z: number; yaw: number; kind: 'chair' | 'stool' | 'bench'; y: number };

/** A plate cut from the spit, from the pass to its table: minutes of Ninja's evening (with seconds as a fraction). */
export type PlateTrip = { id: string; table: string; carved: number; served: number; seat?: number };

export type Room = {
  group: THREE.Group;
  /** The point above a table's top (or the counter in front of a stool), for markers and labels. */
  anchor(tableId: string): THREE.Vector3;
  /** Rings of light around these tables on the floor; an empty list clears them. */
  highlight(tableIds: string[], color?: string): void;
  update(t: number, dt: number): void;
  dispose(): void;

  // ---- more for the panel ----
  quality: Quality;
  /** Invisible boxes over every table and its seats, for picking (`userData.table`). */
  pickables: THREE.Object3D[];
  seats(tableId: string): Seat[];
  /** What is left on each spit, 0–1. */
  setSpits(left: { rund: number; kip: number }): void;
  /** How hard the fire burns, 0.2–1.4 (1 is normal). */
  setFire(level: number): void;
  /** 0 at night, 1 in daylight: the light through the glass and the colour of the sky. */
  setDaylight(d: number): void;
  /** The sky colour for the scene's background and fog, following the daylight. */
  sky: THREE.Color;
  /** The screen with the night's flash photos, and the sign above the door. */
  setScreen(texture: THREE.Texture | null): void;
  setSign(texture: THREE.Texture | null): void;
  crowd: Crowd | null;
  /** Groups at their tables. */
  setGuests(list: { table: string; size: number; seed: string }[]): void;
  /** The line along the glass, first in line nearest the door. */
  setLine(list: { seed: string; size: number }[]): void;
  /** Where the line starts, for its label. */
  lineHead(): THREE.Vector3;
  /** Ninja's clock (minutes with seconds as fraction): plates move by it. */
  setMinute(m: number): void;
  setPlates(list: PlateTrip[]): void;
  /** The plate's object (for a label that follows it), while it is shown. */
  plateObject(id: string): THREE.Object3D | null;
  /** Pulsing beacons for service calls. */
  setBeacons(list: { table: string; color?: string }[]): void;
  /** Glowing arcs between tables (Match, a çay sent across the room). */
  setArcs(list: { from: string; to: string; color?: string }[]): void;
  arcTop(from: string, to: string): THREE.Vector3;
  /** A spit being cut: the spit master turns to it. */
  carving(spit: 'rund' | 'kip' | null): void;
};

// ---------------------------------------------------------------------------------------------------------- seats

const TABLE_H = 0.75;
const STOOL_H = 0.74;
const STOOL_LIFT = STOOL_H - 0.47;
const BAR_TOP = 1.06;
const BENCH_Z = -4.12;

const yawTo = (sx: number, sz: number, tx: number, tz: number) => Math.atan2(tx - sx, tz - sz);

function seatsFor(t: Table): Seat[] {
  const out: Seat[] = [];
  if (t.area === 'fire') return [{ x: t.x, z: t.z, yaw: -Math.PI / 2, kind: 'stool', y: STOOL_LIFT }];
  if (t.area === 'bar') {
    const ux = t.x - ROOM.bar.x;
    const uz = t.z - ROOM.bar.z;
    const l = Math.hypot(ux, uz) || 1;
    const [nx, nz] = [ux / l, uz / l];
    for (const s of [-1, 1]) {
      const x = t.x + -nz * 0.31 * s;
      const z = t.z + nx * 0.31 * s;
      out.push({ x, z, yaw: yawTo(x, z, ROOM.bar.x, ROOM.bar.z), kind: 'stool', y: STOOL_LIFT });
    }
    return out;
  }
  if (t.area === 'banquette') {
    const n = t.seats / 2;
    for (let i = 0; i < n; i++) {
      const x = t.x + (n === 1 ? 0 : (i - (n - 1) / 2) * 0.66);
      out.push({ x, z: BENCH_Z, yaw: 0, kind: 'bench', y: 0 });
      out.push({ x, z: t.z + t.d / 2 + 0.33, yaw: Math.PI, kind: 'chair', y: 0 });
    }
    return out;
  }
  if (t.shape === 'round') {
    const r = t.w / 2 + 0.34;
    for (let k = 0; k < t.seats; k++) {
      const a = (t.seats === 2 ? Math.PI / 2 : Math.PI / 4) + (k * Math.PI * 2) / t.seats;
      const x = t.x + Math.sin(a) * r;
      const z = t.z + Math.cos(a) * r;
      out.push({ x, z, yaw: yawTo(x, z, t.x, t.z), kind: 'chair', y: 0 });
    }
    return out;
  }
  if (t.area === 'window' || t.seats === 2) {
    for (const s of [-1, 1]) {
      const x = t.x + s * (t.w / 2 + 0.3);
      out.push({ x, z: t.z, yaw: yawTo(x, t.z, t.x, t.z), kind: 'chair', y: 0 });
    }
    return out;
  }
  const n = t.seats / 2;
  for (const s of [-1, 1]) {
    for (let i = 0; i < n; i++) {
      const x = t.x + (i - (n - 1) / 2) * (t.w / n);
      const z = t.z + s * (t.d / 2 + 0.33);
      out.push({ x, z, yaw: yawTo(x, z, x, t.z), kind: 'chair', y: 0 });
    }
  }
  // Alternate the sides, so a group of two sits face to face.
  return out.map((_, i) => out[i % 2 === 0 ? i / 2 : n + (i - 1) / 2]);
}

// ---------------------------------------------------------------------------------------------------------- paths

const PICKUP = new THREE.Vector3(-3.95, 0, 1.2);
const AISLES = { back: -2.25, middle: 0.22, front: 2.85 };

/** The way from the pass to a table: along the aisles, so nobody walks through a chair. */
function routeTo(t: Table): THREE.Vector3[] {
  const V = (x: number, z: number) => new THREE.Vector3(x, 0, z);
  const p: THREE.Vector3[] = [PICKUP.clone()];
  if (t.area === 'terrace') {
    p.push(V(-3.2, AISLES.front), V(1.4, AISLES.front + 0.6), V(1.4, 5.0), V(t.x + (t.x < 1.4 ? t.w / 2 + 0.5 : -(t.w / 2 + 0.5)), 5.4), V(t.x + (t.x < 1.4 ? t.w / 2 + 0.5 : -(t.w / 2 + 0.5)), t.z));
    return p;
  }
  if (t.area === 'window') {
    p.push(V(-3.2, AISLES.front), V(t.x, AISLES.front), V(t.x, t.z - 0.62));
    return p;
  }
  if (t.area === 'bar') {
    const ux = t.x - ROOM.bar.x;
    const uz = t.z - ROOM.bar.z;
    const l = Math.hypot(ux, uz) || 1;
    const end = V(t.x + (ux / l) * 0.62, t.z + (uz / l) * 0.62);
    p.push(V(-3.2, AISLES.middle), V(Math.min(end.x, 3.2), AISLES.middle), end);
    return p;
  }
  if (t.area === 'banquette') {
    p.push(V(-3.2, AISLES.middle), V(-3.2, AISLES.back), V(t.x + t.w / 2 + 0.3, AISLES.back), V(t.x + t.w / 2 + 0.3, t.z + 0.35));
    return p;
  }
  // The travertine tables: to the short end, or the open side of the round one.
  if (t.shape === 'round') {
    p.push(V(-3.2, AISLES.middle), V(t.x, AISLES.middle), V(t.x, t.z + t.w / 2 + 0.3));
    return p;
  }
  const endX = t.x - t.w / 2 - 0.35;
  p.push(V(-3.2, AISLES.middle), V(endX, AISLES.middle), V(endX, t.z));
  return p;
}

const pathLength = (pts: THREE.Vector3[]) => pts.reduce((s, q, i) => (i ? s + q.distanceTo(pts[i - 1]) : 0), 0);

function along(pts: THREE.Vector3[], d: number, out: THREE.Vector3): number {
  for (let i = 1; i < pts.length; i++) {
    const seg = pts[i].distanceTo(pts[i - 1]);
    if (d <= seg || i === pts.length - 1) {
      out.lerpVectors(pts[i - 1], pts[i], seg ? Math.min(1, d / seg) : 1);
      return Math.atan2(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
    }
    d -= seg;
  }
  out.copy(pts[pts.length - 1]);
  return 0;
}

/** The line outside: from the door along the glass, then round the corner of the terrace and along the quay. */
const QUEUE = [new THREE.Vector3(2.75, 0, 5.12), new THREE.Vector3(7.9, 0, 5.12), new THREE.Vector3(8.7, 0, 5.75), new THREE.Vector3(8.7, 0, 8.1), new THREE.Vector3(13.5, 0, 8.1)];

// --------------------------------------------------------------------------------------------------------- shapes

function roundedRectShape(w: number, h: number, r: number, hole?: { w: number; h: number; r: number }) {
  const rr = (s: THREE.Path, W: number, H: number, R: number, cw: boolean) => {
    const x = -W / 2;
    const y = -H / 2;
    if (!cw) {
      s.moveTo(x + R, y);
      s.lineTo(x + W - R, y);
      s.quadraticCurveTo(x + W, y, x + W, y + R);
      s.lineTo(x + W, y + H - R);
      s.quadraticCurveTo(x + W, y + H, x + W - R, y + H);
      s.lineTo(x + R, y + H);
      s.quadraticCurveTo(x, y + H, x, y + H - R);
      s.lineTo(x, y + R);
      s.quadraticCurveTo(x, y, x + R, y);
    } else {
      s.moveTo(x + R, y);
      s.quadraticCurveTo(x, y, x, y + R);
      s.lineTo(x, y + H - R);
      s.quadraticCurveTo(x, y + H, x + R, y + H);
      s.lineTo(x + W - R, y + H);
      s.quadraticCurveTo(x + W, y + H, x + W, y + H - R);
      s.lineTo(x + W, y + R);
      s.quadraticCurveTo(x + W, y, x + W - R, y);
      s.lineTo(x + R, y);
    }
  };
  const shape = new THREE.Shape();
  rr(shape, w, h, r, false);
  if (hole) {
    const p = new THREE.Path();
    rr(p, hole.w, hole.h, hole.r, true);
    shape.holes.push(p);
  }
  return shape;
}

/** A flat ring of light on the floor around a table and its seats. */
function haloGeometry(t: Table): THREE.BufferGeometry {
  const seats = seatsFor(t);
  let minX = t.x - t.w / 2;
  let maxX = t.x + t.w / 2;
  let minZ = t.z - t.d / 2;
  let maxZ = t.z + t.d / 2;
  for (const s of seats) {
    minX = Math.min(minX, s.x - 0.25);
    maxX = Math.max(maxX, s.x + 0.25);
    minZ = Math.min(minZ, s.z - 0.25);
    maxZ = Math.max(maxZ, s.z + 0.25);
  }
  const w = maxX - minX + 0.24;
  const h = maxZ - minZ + 0.24;
  const r = Math.min(0.45, w / 2, h / 2);
  const g = new THREE.ShapeGeometry(roundedRectShape(w, h, r, { w: w - 0.05, h: h - 0.05, r: Math.max(0.01, r - 0.025) }), 8);
  g.rotateX(-Math.PI / 2);
  g.translate((minX + maxX) / 2, 0.012, (minZ + maxZ) / 2);
  return g;
}

// ------------------------------------------------------------------------------------------------------ the room

export function createRoom(opts: RoomOptions): Room {
  const quality = opts.quality;
  const d: Detail = DETAIL[quality];
  const high = quality === 'high';
  const low = quality === 'low';
  const shadows = !low;
  const group = new THREE.Group();
  group.name = 'ninja-room';
  const updaters: ((t: number, dt: number) => void)[] = [];
  const add = <T extends THREE.Object3D>(o: T, parent: THREE.Object3D = group, cast = false, receive = shadows): T => {
    o.castShadow = cast && shadows;
    o.receiveShadow = receive && shadows;
    parent.add(o);
    return o;
  };
  const mesh = (g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0, parent: THREE.Object3D = group, cast = false, receive = true) => {
    const o = new THREE.Mesh(g, m);
    o.position.set(x, y, z);
    return add(o, parent, cast, receive);
  };

  // Shared materials.
  const mat = {
    floor: M.terrazzo(),
    plaster: M.plaster(),
    walnut: M.walnut(),
    leather: M.leather(),
    travertine: M.travertine(),
    chrome: M.chrome(),
    steel: M.steel(),
    black: M.blackSteel(),
    lacquer: M.lacquer(),
    limestone: M.limestone(),
    brass: M.brass(),
    glass: M.glass(0.045, '#7F9A98'),
    smallGlass: M.glass(0.22, '#E6DCCB'),
    light: M.lightMaterial(),
    pool: M.poolMaterial(),
    flickerPool: M.poolMaterial(true),
    produce: M.produce(),
    oak: M.oak(),
    cap: new THREE.MeshStandardNodeMaterial({ color: '#2A211C', roughness: 0.6, metalness: 0.1 }),
  };

  /** A plane lying on a surface, painted with a light's colour (for the shared pool material). */
  const poolPlane = (hex: string, strength: number) => M.paintLight(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), hex, strength);

  const W = ROOM.width / 2;
  const D = ROOM.depth / 2;
  const H = ROOM.height;

  // ---------------------------------------------------------------------------------------------- the shell
  // The slab: the cut shows its thickness, like an architect's section model.
  mesh(new THREE.BoxGeometry(ROOM.width + 0.3, 0.3, ROOM.depth + 0.15), mat.cap, 0, -0.15, -0.075, group, false, true);
  const floor = mesh(new THREE.PlaneGeometry(ROOM.width, ROOM.depth), mat.floor, 0, 0.001, 0, group, false, true);
  floor.rotation.x = -Math.PI / 2;

  // Walls: plaster behind, cut at the top with a dark cap.
  const wall = (w: number, h: number, dpt: number, x: number, z: number) => {
    mesh(roundedBox(w, h, dpt, 0.004, 1), mat.plaster, x, h / 2, z, group, true, true);
    mesh(new THREE.BoxGeometry(w + 0.002, 0.025, dpt + 0.002), mat.cap, x, h + 0.0125, z, group, false, false);
  };
  wall(ROOM.width + 0.3, H, 0.15, 0, -D - 0.075);
  wall(0.15, H, ROOM.depth, -W - 0.075, 0);
  wall(0.15, H, ROOM.depth, W + 0.075, 0);

  // Walnut slats on the walls of the room (not in the kitchen, where the oxblood tiles are).
  {
    const pitch = 0.046;
    const slat = roundedBox(0.034, H - 0.04, 0.022, 0.006, 1);
    const spots: { x: number; z: number; ry: number }[] = [];
    for (let x = ROOM.kitchen.x1 + 0.03; x < W - 0.02; x += pitch) spots.push({ x, z: -D + 0.011, ry: 0 });
    for (let z = -D + 0.03; z < D - 0.02; z += pitch) spots.push({ x: W - 0.011, z, ry: Math.PI / 2 });
    for (let z = ROOM.kitchen.z1 + 0.03; z < D - 0.02; z += pitch) spots.push({ x: -W + 0.011, z, ry: Math.PI / 2 });
    const slats = new THREE.InstancedMesh(slat, mat.walnut, spots.length);
    const m4 = new THREE.Matrix4();
    const c = new THREE.Color();
    spots.forEach((s, i) => {
      m4.compose(new THREE.Vector3(s.x, H / 2 - 0.0, s.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, s.ry, 0)), new THREE.Vector3(1, 1, 1));
      slats.setMatrixAt(i, m4);
      const v = 0.86 + ((hash(`slat-${i}`) % 100) / 100) * 0.28;
      slats.setColorAt(i, c.setRGB(v, v * 0.97, v * 0.95));
    });
    slats.computeBoundingSphere();
    add(slats, group, false, true);
    // A warm line of light where the slats meet the floor and the top: the grazers that make the wood glow.
    const lenBack = W - ROOM.kitchen.x1;
    mesh(M.paintLight(new THREE.BoxGeometry(lenBack, 0.012, 0.02), '#FFB774', 1.3), mat.light, (W + ROOM.kitchen.x1) / 2, H - 0.06, -D + 0.04, group, false, false);
    mesh(M.paintLight(new THREE.BoxGeometry(0.02, 0.012, ROOM.depth), '#FFB774', 1.3), mat.light, W - 0.04, H - 0.06, 0, group, false, false);
  }

  // Oxblood glazed tiles behind the fire and the kitchen (Ninja's own counter wall).
  {
    const kw = ROOM.kitchen.z1 - ROOM.kitchen.z0;
    const left = mesh(new THREE.PlaneGeometry(kw, H), M.tiles(), -W + 0.004, H / 2, (ROOM.kitchen.z0 + ROOM.kitchen.z1) / 2, group, false, true);
    left.rotation.y = Math.PI / 2;
    const bw = ROOM.kitchen.x1 - ROOM.kitchen.x0;
    mesh(new THREE.PlaneGeometry(bw, H), M.tiles(), (ROOM.kitchen.x0 + ROOM.kitchen.x1) / 2, H / 2, -D + 0.004, group, false, true);
  }

  // ------------------------------------------------------------------------------------------- the banquette
  {
    const x0 = -3.15;
    const x1 = 4.15;
    const len = x1 - x0;
    const cx = (x0 + x1) / 2;
    mesh(roundedBox(len, 0.3, 0.5, 0.01, 1), mat.lacquer, cx, 0.15, -D + 0.3, group, true, true);
    const cushions = Math.round(len / 1.22);
    for (let i = 0; i < cushions; i++) {
      const w = len / cushions;
      mesh(roundedBox(w - 0.015, 0.14, 0.54, 0.05, d.bevel), mat.leather, x0 + w * (i + 0.5), 0.39, -D + 0.32, group, true, true);
    }
    const channel = roundedBox(0.168, 0.64, 0.11, 0.05, d.bevel);
    const n = Math.floor(len / 0.18);
    const backs = new THREE.InstancedMesh(channel, mat.leather, n);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      m4.compose(new THREE.Vector3(x0 + 0.09 + i * (len / n), 0.86, -D + 0.1), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.07, 0, 0)), new THREE.Vector3(1, 1, 1));
      backs.setMatrixAt(i, m4);
    }
    backs.computeBoundingSphere();
    add(backs);
    mesh(roundedBox(len + 0.04, 0.035, 0.16, 0.012, 1), mat.walnut, cx, 1.2, -D + 0.09);
  }

  // ------------------------------------------------------------------------------------------------ the kitchen
  const fire: Fire = createFire({ x: ROOM.fire.x + ROOM.fire.w / 2, z0: ROOM.fire.z - ROOM.fire.d / 2, z1: ROOM.fire.z + ROOM.fire.d / 2, quality, detail: d });
  group.add(fire.group);
  updaters.push((t, dt) => fire.update(t, dt));

  const spits: Record<'rund' | 'kip', Spit> = {
    rund: createSpit({ kind: 'rund', x: ROOM.spits[0].x, z: ROOM.spits[0].z, detail: d, quality }),
    kip: createSpit({ kind: 'kip', x: ROOM.spits[1].x, z: ROOM.spits[1].z, detail: d, quality }),
  };
  for (const s of Object.values(spits)) {
    group.add(s.group);
    updaters.push((t, dt) => s.update(t, dt));
  }
  // The fire bank under the spits: steel, with a grease channel.
  mesh(roundedBox(1.25, 0.86, 3.3, 0.01, 1), mat.steel, -6.85, 0.43, ROOM.fire.z);
  mesh(new THREE.BoxGeometry(1.0, 0.012, 3.1), mat.black, -6.8, 0.866, ROOM.fire.z, group, false, true);

  const oven: Oven = createOven({ x: ROOM.oven.x, z: ROOM.oven.z, r: ROOM.oven.r, detail: d, quality });
  group.add(oven.group);
  updaters.push((t) => oven.update(t));

  // The hood over the fire, brushed steel.
  mesh(roundedBox(1.25, 0.9, 3.5, 0.02, 1), mat.steel, -7.38, 3.12, ROOM.fire.z, group, false, true);

  // The cold kitchen along the back wall: a steel counter, a shelf with jars of lemons and stacked pans.
  mesh(roundedBox(2.5, 0.9, 0.62, 0.01, 1), mat.steel, -5.95, 0.45, -D + 0.31);
  mesh(new THREE.BoxGeometry(2.5, 0.025, 0.28), mat.steel, -5.95, 1.62, -D + 0.14, group, true, true);
  {
    const jarGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.26, d.tube + 6);
    const jars = new THREE.InstancedMesh(jarGeo, mat.smallGlass, 6);
    const lemonGeo = new THREE.SphereGeometry(0.034, 10, 8);
    const lemons = new THREE.InstancedMesh(lemonGeo, mat.produce, 6 * 9);
    const m4 = new THREE.Matrix4();
    let k = 0;
    for (let i = 0; i < 6; i++) {
      const x = -7.0 + i * 0.22;
      m4.makeTranslation(x, 1.765, -D + 0.14);
      jars.setMatrixAt(i, m4);
      for (let j = 0; j < 9; j++) {
        m4.makeTranslation(x + Math.cos(j * 2.4) * 0.042, 1.67 + Math.floor(j / 3) * 0.065, -D + 0.14 + Math.sin(j * 2.4) * 0.042);
        lemons.setColorAt(k, new THREE.Color('#E2B624'));
        lemons.setMatrixAt(k++, m4);
      }
    }
    jars.computeBoundingSphere();
    lemons.computeBoundingSphere();
    add(lemons, group, false, false);
    add(jars, group, false, false);
    const pans = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.15, 0.13, 0.03, d.radial), mat.steel, 12);
    for (let i = 0; i < 12; i++) {
      m4.makeTranslation(-5.55 + Math.floor(i / 6) * 0.34, 1.65 + (i % 6) * 0.032, -D + 0.16);
      pans.setMatrixAt(i, m4);
    }
    pans.computeBoundingSphere();
    add(pans, group, false, false);
  }

  // The pass: a travertine block with a steel top, a glass shelf, heat lamps; the fire row sits on the room side.
  const P = ROOM.pass;
  mesh(roundedBox(P.w, 1.04, P.d, 0.015, d.bevel), mat.travertine, P.x, 0.52, P.z);
  mesh(new THREE.BoxGeometry(P.w + 0.06, 0.025, P.d + 0.04), mat.steel, P.x, 1.052, P.z, group, false, true);
  mesh(new THREE.BoxGeometry(0.34, 0.012, P.d - 0.1), mat.smallGlass, P.x - 0.02, 1.44, P.z, group, false, false);
  for (const z of [P.z - P.d / 2 + 0.1, P.z, P.z + P.d / 2 - 0.1]) mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.4, 8), mat.chrome, P.x + 0.13, 1.25, z, group, false, false);
  {
    const shade = new THREE.LatheGeometry([new THREE.Vector2(0.0, 0.11), new THREE.Vector2(0.03, 0.11), new THREE.Vector2(0.11, 0.0), new THREE.Vector2(0.105, -0.004), new THREE.Vector2(0.0, 0.1)], d.radial);
    for (const z of [P.z - 1.1, P.z, P.z + 1.1]) {
      mesh(shade, mat.black, P.x - 0.05, 1.85, z, group, false, false);
      mesh(M.paintLight(new THREE.CircleGeometry(0.095, 20).rotateX(Math.PI / 2), '#FF9A4C', 4), mat.light, P.x - 0.05, 1.848, z, group, false, false);
      mesh(new THREE.CylinderGeometry(0.004, 0.004, H - 1.95, 4), mat.black, P.x - 0.05, (H + 1.95) / 2, z, group, false, false);
    }
  }

  // Garlands of garlic and chili over the pass, as in Ninja's photos.
  {
    const rail = mesh(new THREE.CylinderGeometry(0.014, 0.014, P.d + 0.6, 10).rotateX(Math.PI / 2), mat.brass, P.x - 0.12, 3.12, P.z, group, false, false);
    rail.name = 'garland-rail';
    const strings = 10;
    const garlicGeo = new THREE.SphereGeometry(0.046, d.tube + 4, 8).scale(1, 0.82, 1);
    const chiliGeo = new THREE.ConeGeometry(0.017, 0.13, 8).rotateX(Math.PI);
    const garlic = new THREE.InstancedMesh(garlicGeo, mat.produce, strings * 12);
    const chili = new THREE.InstancedMesh(chiliGeo, mat.produce, strings * 14);
    const cords = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.003, 0.003, 1, 4), mat.produce, strings);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const c = new THREE.Color();
    let gi = 0;
    let ci = 0;
    for (let s = 0; s < strings; s++) {
      const z = P.z - P.d / 2 + 0.1 + (s / (strings - 1)) * (P.d - 0.2);
      const x = P.x - 0.12 + ((s % 2) - 0.5) * 0.08;
      const isGarlic = s % 3 !== 1;
      const len = 0.75 + ((hash(`garland-${s}`) % 100) / 100) * 0.35;
      m4.compose(new THREE.Vector3(x, 3.12 - len / 2, z), q.identity(), new THREE.Vector3(1, len, 1));
      cords.setMatrixAt(s, m4);
      cords.setColorAt(s, c.set('#8A7A5E'));
      const items = isGarlic ? 12 : 14;
      for (let k = 0; k < items; k++) {
        const y = 3.06 - (k / items) * len;
        const a = k * 2.2 + s;
        const r = isGarlic ? 0.04 : 0.03;
        if (isGarlic) {
          m4.compose(new THREE.Vector3(x + Math.cos(a) * r, y, z + Math.sin(a) * r), q.setFromEuler(e.set(0, a, 0.2)), new THREE.Vector3(1, 1, 1));
          garlic.setMatrixAt(gi, m4);
          const v = (hash(`g-${s}-${k}`) % 100) / 100;
          garlic.setColorAt(gi++, c.set(v < 0.75 ? '#EFE6D6' : '#D9B9A6'));
        } else {
          m4.compose(new THREE.Vector3(x + Math.cos(a) * r, y, z + Math.sin(a) * r), q.setFromEuler(e.set(Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5)), new THREE.Vector3(1, 1, 1));
          chili.setMatrixAt(ci, m4);
          const v = (hash(`c-${s}-${k}`) % 100) / 100;
          chili.setColorAt(ci++, c.set(v < 0.62 ? '#A8120B' : v < 0.85 ? '#7A0D08' : '#E09A18'));
        }
      }
    }
    garlic.count = gi;
    chili.count = ci;
    for (const im of [garlic, chili, cords]) {
      im.computeBoundingSphere();
      add(im, group, false, false);
    }
  }

  // ------------------------------------------------------------------------------------------- tables & seats
  const seatMap = new Map<string, Seat[]>();
  for (const t of TABLES) seatMap.set(t.id, seatsFor(t));
  const pickables: THREE.Object3D[] = [];
  const hitMat = new THREE.MeshBasicNodeMaterial({ visible: false });
  const tableGroup = new THREE.Group();
  tableGroup.name = 'tables';
  group.add(tableGroup);
  const candles: THREE.Vector3[] = [];
  const pools: { x: number; y: number; z: number; r: number }[] = [];

  for (const t of TABLES) {
    const seats = seatMap.get(t.id)!;
    if (t.area !== 'fire' && t.area !== 'bar') {
      const outside = t.area === 'terrace';
      if (t.shape === 'round') {
        mesh(roundedDisc(t.w / 2, 0.045, 0.014, d.radial + 8), mat.travertine, t.x, TABLE_H - 0.0225, t.z, tableGroup, true);
        mesh(
          new THREE.LatheGeometry([new THREE.Vector2(0.0, 0), new THREE.Vector2(0.3, 0), new THREE.Vector2(0.3, 0.03), new THREE.Vector2(0.13, 0.08), new THREE.Vector2(0.11, 0.4), new THREE.Vector2(0.16, TABLE_H - 0.05), new THREE.Vector2(0.0, TABLE_H - 0.045)], d.radial),
          outside ? mat.black : mat.travertine,
          t.x,
          0,
          t.z,
          tableGroup,
          true,
        );
      } else {
        mesh(roundedBox(t.w, 0.045, t.d, 0.012, d.bevel), mat.travertine, t.x, TABLE_H - 0.0225, t.z, tableGroup, true);
        const legs = t.w > 1.8 ? [-t.w / 4, t.w / 4] : [0];
        for (const lx of legs) mesh(roundedBox(Math.min(0.5, t.w * 0.32), TABLE_H - 0.045, t.d * 0.34, 0.01, 1), outside ? mat.black : mat.travertine, t.x + lx, (TABLE_H - 0.045) / 2, t.z, tableGroup, true);
      }
      candles.push(new THREE.Vector3(t.x + (t.shape === 'round' ? 0 : t.w * 0.18), TABLE_H, t.z));
      pools.push({ x: t.x, y: TABLE_H + 0.002, z: t.z, r: Math.max(t.w, t.d) * 0.62 });
    }
    // A box over the table and its seats, for picking.
    const xs = [t.x - t.w / 2, t.x + t.w / 2, ...seats.map((s) => s.x - 0.25), ...seats.map((s) => s.x + 0.25)];
    const zs = [t.z - t.d / 2, t.z + t.d / 2, ...seats.map((s) => s.z - 0.25), ...seats.map((s) => s.z + 0.25)];
    const bx = Math.max(...xs) - Math.min(...xs);
    const bz = Math.max(...zs) - Math.min(...zs);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(bx, 1.5, bz), hitMat);
    hit.position.set((Math.max(...xs) + Math.min(...xs)) / 2, 0.75, (Math.max(...zs) + Math.min(...zs)) / 2);
    hit.userData.table = t.id;
    hit.name = `hit-${t.id}`;
    group.add(hit);
    pickables.push(hit);
  }

  // Chairs and stools, instanced.
  {
    const all = [...seatMap.values()].flat();
    const chairs = all.filter((s) => s.kind === 'chair');
    const stools = all.filter((s) => s.kind === 'stool');
    const c = chair(d);
    const st = stool(d, STOOL_H);
    const frame = new THREE.InstancedMesh(c.frame, mat.chrome, chairs.length);
    const cushion = new THREE.InstancedMesh(c.cushion, mat.leather, chairs.length);
    const sFrame = new THREE.InstancedMesh(st.frame, mat.chrome, stools.length);
    const sCushion = new THREE.InstancedMesh(st.cushion, mat.leather, stools.length);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    chairs.forEach((s, i) => {
      // Chairs sit a little back from where the guest's hips are.
      m4.compose(new THREE.Vector3(s.x - Math.sin(s.yaw) * 0.02, 0, s.z - Math.cos(s.yaw) * 0.02), q.setFromAxisAngle(up, s.yaw), new THREE.Vector3(1, 1, 1));
      frame.setMatrixAt(i, m4);
      cushion.setMatrixAt(i, m4);
    });
    stools.forEach((s, i) => {
      m4.compose(new THREE.Vector3(s.x, 0, s.z), q.setFromAxisAngle(up, s.yaw), new THREE.Vector3(1, 1, 1));
      sFrame.setMatrixAt(i, m4);
      sCushion.setMatrixAt(i, m4);
    });
    for (const im of [frame, cushion, sFrame, sCushion]) {
      im.computeBoundingSphere();
      add(im, group, true, true);
    }
  }

  // Candles: a glass votive, a flame, and the pool of light on the travertine.
  {
    const glassV = new THREE.InstancedMesh(votive(d), mat.smallGlass, candles.length);
    const flames = new THREE.InstancedMesh(M.paintLight(new THREE.SphereGeometry(0.011, 8, 6).scale(1, 2.1, 1), '#FFD08A', 4.2), mat.light, candles.length);
    const m4 = new THREE.Matrix4();
    candles.forEach((p, i) => {
      m4.makeTranslation(p.x, p.y, p.z);
      glassV.setMatrixAt(i, m4);
      m4.makeTranslation(p.x, p.y + 0.06, p.z);
      flames.setMatrixAt(i, m4);
    });
    glassV.computeBoundingSphere();
    flames.computeBoundingSphere();
    glassV.renderOrder = 2;
    add(glassV, group, false, false);
    add(flames, group, false, false);
    const poolMesh = new THREE.InstancedMesh(poolPlane('#FFB25E', 0.42), mat.flickerPool, pools.length);
    pools.forEach((p, i) => {
      m4.compose(new THREE.Vector3(p.x, p.y, p.z), new THREE.Quaternion(), new THREE.Vector3(p.r * 2, 1, p.r * 2));
      poolMesh.setMatrixAt(i, m4);
    });
    poolMesh.computeBoundingSphere();
    poolMesh.renderOrder = 1;
    add(poolMesh, group, false, false);
  }

  // ---------------------------------------------------------------------------------------- the spaceship bar
  {
    const B = ROOM.bar;
    const bar = new THREE.Group();
    bar.name = 'bar';
    bar.position.set(B.x, 0, B.z);
    group.add(bar);
    const skin: [number, number][] = [
      [-0.2, 0.06],
      [-0.17, 0.14],
      [-0.1, 0.24],
      [-0.035, 0.38],
      [0.0, 0.55],
      [0.025, 0.75],
      [0.05, 0.92],
      [0.085, 1.0],
      [0.115, BAR_TOP - 0.035],
    ];
    mesh(ellipticLathe(skin, B.rx, B.rz, high ? 160 : 96), mat.chrome, 0, 0, 0, bar, true);
    // The inside of the ring, toward the bartender (the profile runs top to bottom, so it faces in).
    mesh(ellipticLathe([[-0.5, BAR_TOP - 0.03], [-0.5, 0]], B.rx, B.rz, 96), mat.lacquer, 0, 0, 0, bar);
    mesh(ellipticRing(B.rx + 0.13, B.rz + 0.13, 0.66, 0.05, 0.018, high ? 128 : 72), mat.lacquer, 0, BAR_TOP - 0.035, 0, bar);
    // The ring of light under the tucked-in base.
    const ringProfile: [number, number][] = [];
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ringProfile.push([-0.2 + Math.cos(a) * 0.022, 0.045 + Math.sin(a) * 0.022]);
    }
    mesh(M.paintLight(ellipticLathe(ringProfile, B.rx, B.rz, 96), '#FFE2BC', 6), mat.light, 0, 0, 0, bar, false, false);
    const halo = mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), M.ringPool('#FFC995', 1.6, 0.4, 0.09), 0, 0.004, 0, bar, false, false);
    halo.scale.set((B.rx + 0.15) * 2 * 1.25, 1, (B.rz + 0.15) * 2 * 1.25);
    halo.renderOrder = 1;
    // Brass foot rail.
    const rail: [number, number][] = [];
    for (let i = 0; i <= 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      rail.push([0.2 + Math.cos(a) * 0.016, 0.24 + Math.sin(a) * 0.016]);
    }
    mesh(ellipticLathe(rail, B.rx, B.rz, 96), mat.brass, 0, 0, 0, bar);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.3;
      mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.22, 6), mat.brass, Math.cos(a) * (B.rx + 0.12), 0.13, Math.sin(a) * (B.rz + 0.12), bar, false, false).rotation.z = 0.35 * Math.cos(a);
    }
    // The island: oak shelves with bottles, a chrome column, and the halo above, like the ship's deck.
    mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.95, d.radial).scale(1, 1, 0.42), mat.oak, 0, 0.475, 0, bar);
    mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.03, d.radial).scale(1, 1, 0.44), mat.lacquer, 0, 0.965, 0, bar);
    const bottles = new THREE.InstancedMesh(new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(0.035, 0), new THREE.Vector2(0.036, 0.2), new THREE.Vector2(0.014, 0.25), new THREE.Vector2(0.012, 0.31), new THREE.Vector2(0, 0.31)], 10), M.bottleGlass(), 26);
    const m4 = new THREE.Matrix4();
    const tint = ['#5C3A12', '#2F4A2C', '#C9C6B8', '#7A2A12', '#A8761E', '#1E2A22', '#E2D9C2'];
    const c = new THREE.Color();
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      m4.makeTranslation(Math.cos(a) * 0.36, 0.98, Math.sin(a) * 0.15);
      bottles.setMatrixAt(i, m4);
      bottles.setColorAt(i, c.set(tint[hash(`bottle-${i}`) % tint.length]));
    }
    bottles.computeBoundingSphere();
    add(bottles, bar);
    mesh(new THREE.CylinderGeometry(0.05, 0.05, H - 1.0, 16), mat.chrome, 0, 1.0 + (H - 1.0) / 2, 0, bar, false, false);
    const deckProfile: [number, number][] = [];
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      deckProfile.push([Math.cos(a) * 0.05, 2.62 + Math.sin(a) * 0.028]);
    }
    mesh(ellipticLathe(deckProfile, B.rx * 0.82, B.rz * 0.82, 96), mat.chrome, 0, 0, 0, bar, false, false);
    const strip: [number, number][] = [];
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      strip.push([Math.cos(a) * 0.012, 2.585 + Math.sin(a) * 0.006]);
    }
    mesh(M.paintLight(ellipticLathe(strip, B.rx * 0.82, B.rz * 0.82, 96), '#FFE7C6', 5), mat.light, 0, 0, 0, bar, false, false);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      mesh(tube([new THREE.Vector3(0, 2.95, 0), new THREE.Vector3(Math.cos(a) * B.rx * 0.82, 2.64, Math.sin(a) * B.rz * 0.82)], 0.006, 0.05, d), mat.chrome, 0, 0, 0, bar, false, false);
    }
  }

  // ---------------------------------------------------------------------------------------- the screen & art
  const screenMat = new THREE.MeshBasicNodeMaterial({ color: '#0C0A09' });
  {
    const S = ROOM.wall;
    mesh(roundedBox(0.05, S.h + 0.08, S.w + 0.08, 0.012, 1), mat.lacquer, S.x - 0.02, 1.75, S.z, group, false, true);
    const screen = mesh(new THREE.PlaneGeometry(S.w, S.h), screenMat, S.x - 0.048, 1.75, S.z, group, false, false);
    screen.rotation.y = -Math.PI / 2;
    const spill = mesh(poolPlane('#C9B9A8', 0.18), mat.pool, S.x - 0.9, 0.003, S.z, group, false, false);
    spill.scale.set(1.6, 1, S.w * 1.3);
  }

  // ----------------------------------------------------------------------------------------- pendants & lights
  const lights = new THREE.Group();
  lights.name = 'lights';
  group.add(lights);
  const hemi = new THREE.HemisphereLight('#6A5244', '#140D0A', 0.75);
  lights.add(hemi);
  {
    const stemMat = mat.brass;
    const globe = M.paintLight(new THREE.SphereGeometry(1, d.radial, Math.round(d.radial * 0.7)), '#FFC48A', 1.45);
    const pendant = (x: number, z: number, r: number, y: number) => {
      mesh(globe, mat.light, x, y, z, group, false, false).scale.setScalar(r);
      mesh(new THREE.CylinderGeometry(0.004, 0.004, H - y - r, 4), stemMat, x, (H + y + r) / 2, z, group, false, false);
      mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.05, 12), stemMat, x, y + r + 0.02, z, group, false, false);
    };
    pendant(-1.75, -0.9, 0.15, 2.15);
    pendant(-0.65, -0.9, 0.15, 2.15);
    pendant(1.5, -0.9, 0.17, 2.1);
    pendant(0.2, 1.3, 0.16, 2.15);
    for (const id of ['B1', 'B2', 'B3', 'B4']) {
      const t = tableById(id)!;
      pendant(t.x, t.z + 0.05, 0.1, 2.0);
    }
    for (const id of ['W1', 'W2', 'W3']) {
      const t = tableById(id)!;
      pendant(t.x, t.z, 0.09, 2.05);
    }
  }
  const spot = (x: number, y: number, z: number, tx: number, ty: number, tz: number, intensity: number, angle: number, hex: string, shadow: number) => {
    const s = new THREE.SpotLight(hex, intensity, 0, angle, 0.75, 2);
    s.position.set(x, y, z);
    s.target.position.set(tx, ty, tz);
    if (shadow && shadows) {
      s.castShadow = true;
      s.shadow.mapSize.set(shadow, shadow);
      s.shadow.bias = -0.0004;
      s.shadow.normalBias = 0.025;
      s.shadow.radius = 5;
      s.shadow.camera.near = 0.5;
      s.shadow.camera.far = 9;
    }
    lights.add(s, s.target);
    return s;
  };
  spot(0.1, 3.45, -0.9, 0.1, 0, -0.9, 48, 0.86, '#FFC386', high ? 1024 : 0);
  spot(0.4, 3.4, 2.3, 0.4, 0, 2.6, 36, 0.92, '#FFC386', 0);
  spot(0.9, 3.45, -1.55, 0.9, 0.5, -4.4, 60, 1.05, '#FFB574', 0);
  const barLight = new THREE.PointLight('#FFDDB0', 16, 7.5, 2);
  barLight.position.set(ROOM.bar.x, 2.45, ROOM.bar.z);
  lights.add(barLight);
  // The moon, or the low sun at dusk: one directional light for the whole model.
  const sun = new THREE.DirectionalLight('#9DB2FF', 0.4);
  sun.position.set(-7, 16, 15);
  sun.target.position.set(0, 0, 0.5);
  if (shadows) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(high ? 2048 : 1024, high ? 2048 : 1024);
    const cam = sun.shadow.camera as THREE.OrthographicCamera;
    cam.left = -15;
    cam.right = 15;
    cam.top = 13;
    cam.bottom = -13;
    cam.near = 1;
    cam.far = 50;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.04;
    sun.shadow.radius = 3;
  }
  lights.add(sun, sun.target);

  // --------------------------------------------------------------------------------------------- the front
  const facade = new THREE.Group();
  facade.name = 'facade';
  group.add(facade);
  const signMat = new THREE.MeshBasicNodeMaterial({ transparent: true, alphaTest: 0.4, depthWrite: false, visible: false });
  {
    const pil = [-8.0, -4.4, 0.45, 2.35, 5.3, 8.0];
    const led = M.paintLight(new THREE.BoxGeometry(0.026, 2.55, 0.012), '#FFE3BE', 3.6);
    const fz = D + 0.16;
    for (const x of pil) {
      mesh(roundedBox(0.26, 3.0, 0.3, 0.01, 1), M.limestone('#B8AA94'), x, 1.5, fz, facade);
      mesh(led, mat.light, x, 1.45, fz + 0.155, facade, false, false);
    }
    const panes: [number, number][] = [];
    for (let i = 0; i < pil.length - 1; i++) panes.push([pil[i] + 0.18, pil[i + 1] - 0.18]);
    panes.forEach(([a, b], i) => {
      const w = b - a;
      const cx = (a + b) / 2;
      const door = i === 2;
      if (!door) {
        const g = mesh(new THREE.PlaneGeometry(w, 3.03), mat.glass, cx, 1.565, D + 0.05, facade, false, false);
        g.renderOrder = 4;
      }
      mesh(new THREE.BoxGeometry(w, 0.05, 0.07), mat.black, cx, 3.075, D + 0.05, facade, false, false);
      mesh(new THREE.BoxGeometry(w, 0.06, 0.09), mat.black, cx, 0.03, D + 0.05, facade, false, false);
      if (door) {
        for (const s of [-1, 1]) {
          const leaf = mesh(new THREE.PlaneGeometry(w / 2 - 0.02, 2.5), mat.glass, cx + (s * w) / 4, 1.28, D + 0.05, facade, false, false);
          leaf.renderOrder = 4;
          mesh(new THREE.BoxGeometry(0.035, 2.52, 0.05), mat.black, cx + s * 0.012, 1.28, D + 0.05, facade, false, false);
          mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.2, 10), mat.chrome, cx + s * 0.09, 1.2, D + 0.12, facade, false, false);
        }
        mesh(new THREE.BoxGeometry(w, 0.05, 0.07), mat.black, cx, 2.55, D + 0.05, facade, false, false);
        const sign = mesh(new THREE.PlaneGeometry(1.25, 0.42), signMat, cx, 2.82, D + 0.075, facade, false, false);
        sign.renderOrder = 5;
      }
    });
  }

  // --------------------------------------------------------------------------------------------- outside
  const outside = new THREE.Group();
  outside.name = 'outside';
  if (opts.outside !== false) group.add(outside);
  {
    const fz = D + 0.32;
    const curbZ = 9.6;
    const walk = mesh(new THREE.PlaneGeometry(64, curbZ - fz), M.wetBricks(), 0, -0.005, (fz + curbZ) / 2, outside, false, true);
    walk.rotation.x = -Math.PI / 2;
    mesh(new THREE.BoxGeometry(64, 0.14, 0.2), M.granite(), 0, -0.065, curbZ + 0.1, outside, false, true);
    const road = mesh(new THREE.PlaneGeometry(64, 8.4), M.asphalt(13.9), 0, -0.13, curbZ + 0.2 + 4.2, outside, false, true);
    road.rotation.x = -Math.PI / 2;
    const far = mesh(new THREE.PlaneGeometry(64, 3), M.wetBricks(), 0, -0.005, curbZ + 8.6 + 1.5, outside, false, true);
    far.rotation.x = -Math.PI / 2;
    const ground = mesh(new THREE.PlaneGeometry(140, 140), new THREE.MeshStandardNodeMaterial({ color: '#0A0807', roughness: 0.9 }), 0, -0.2, 0, outside, false, true);
    ground.rotation.x = -Math.PI / 2;

    // Light from the pilasters' LED strips on the wet bricks.
    const spill = poolPlane('#FFD3A0', 0.55);
    for (const x of [-8.0, -4.4, 0.45, 2.35, 5.3, 8.0]) {
      const p = mesh(spill, mat.pool, x, 0.003, fz + 0.55, outside, false, false);
      p.scale.set(1.4, 1, 1.2);
      p.renderOrder = 1;
    }
    // The warm glow of the room on the pavement in front of the glass.
    const roomGlow = mesh(poolPlane('#FFB070', 0.32), mat.pool, 0, 0.002, fz + 1.2, outside, false, false);
    roomGlow.scale.set(17, 1, 3.4);
    roomGlow.renderOrder = 1;

    // The terrace: dark oak decks, planters with clipped box, glass-tube heaters.
    const decks: [number, number, number, number][] = [
      [-4.45, 0.25, 5.35, 7.45],
      [3.75, 5.55, 5.75, 7.15],
    ];
    for (const [x0, x1, z0, z1] of decks) {
      mesh(roundedBox(x1 - x0, 0.04, z1 - z0, 0.008, 1), mat.oak, (x0 + x1) / 2, 0.02, (z0 + z1) / 2, outside, false, true);
      mesh(roundedBox(x1 - x0, 0.42, 0.36, 0.01, 1), mat.black, (x0 + x1) / 2, 0.21, z1 + 0.2, outside);
      mesh(roundedBox(x1 - x0 - 0.06, 0.26, 0.3, 0.1, d.bevel), M.boxwood(), (x0 + x1) / 2, 0.52, z1 + 0.2, outside);
    }
    const heaterFlame = M.fx(
      new THREE.MeshBasicNodeMaterial({
        colorNode: color('#FF8A3A').mul(fract(uv().y.mul(3.0).sub(time.mul(0.9))).mul(0.4).add(0.8)).mul(smoothstep(0.0, 0.15, uv().y)).mul(smoothstep(1.0, 0.75, uv().y)).mul(5),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    for (const [x, z] of [
      [-2.05, 7.05],
      [5.95, 6.95],
    ]) {
      mesh(roundedBox(0.46, 0.08, 0.46, 0.02, 1), mat.black, x, 0.06, z, outside);
      for (const [sx, sz] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ])
        mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.85, 6), mat.black, x + sx * 0.19, 1.0, z + sz * 0.19, outside, false, false);
      mesh(new THREE.CylinderGeometry(0.075, 0.075, 1.45, 16, 1, true), mat.smallGlass, x, 1.0, z, outside, false, false).renderOrder = 4;
      const fl = mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.3, 10, 1, true), heaterFlame, x, 1.0, z, outside, false, false);
      fl.renderOrder = 3;
      mesh(new THREE.ConeGeometry(0.34, 0.22, 4).rotateY(Math.PI / 4), mat.black, x, 2.03, z, outside, false, false);
      const g = mesh(poolPlane('#FF8A40', 0.7), mat.flickerPool, x, 0.045, z, outside, false, false);
      g.scale.set(2.6, 1, 2.6);
      g.renderOrder = 1;
    }


    // Plane trees on the quay, the leaves turning.
    const trees = [-11.5, -17.5, 11.5, 17.5];
    const blobs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, low ? 1 : 2), M.foliage(), trees.length * 9);
    const m4 = new THREE.Matrix4();
    const c = new THREE.Color();
    let bi = 0;
    for (const x of trees) {
      const z = 8.9 + (x > 0 ? 0.1 : -0.1);
      const trunk = mesh(new THREE.CylinderGeometry(0.11, 0.17, 3.4, 10), M.bark(), x, 1.7, z, outside);
      trunk.rotation.z = (hash(`tree-${x}`) % 10) / 200 - 0.025;
      for (let k = 0; k < 9; k++) {
        const h = hash(`blob-${x}-${k}`);
        const a = (k / 9) * Math.PI * 2 + (h % 10) / 10;
        const r = k === 0 ? 0 : 0.75 + ((h >> 4) % 30) / 100;
        const s = k === 0 ? 1.35 : 0.85 + ((h >> 8) % 40) / 100;
        m4.compose(new THREE.Vector3(x + Math.cos(a) * r, 3.9 + (k === 0 ? 0.55 : ((h >> 12) % 70) / 100), z + Math.sin(a) * r * 0.8), new THREE.Quaternion(), new THREE.Vector3(s, s * 0.85, s));
        blobs.setMatrixAt(bi, m4);
        blobs.setColorAt(bi++, c.set(['#C9C08A', '#E3C977', '#B4B07A', '#D8A853'][(h >> 3) % 4]));
      }
    }
    blobs.computeBoundingSphere();
    add(blobs, outside, true, false);

    // Street lamps and bollards.
    for (const x of [-7.2, 7.6]) {
      mesh(new THREE.CylinderGeometry(0.05, 0.07, 4.4, 10), mat.black, x, 2.2, curbZ - 0.35, outside);
      mesh(roundedBox(0.36, 0.12, 0.36, 0.03, 1), mat.black, x, 4.42, curbZ - 0.35, outside, true, false);
      mesh(M.paintLight(new THREE.CircleGeometry(0.15, 20).rotateX(Math.PI / 2), '#FFE2BC', 7), mat.light, x, 4.355, curbZ - 0.35, outside, false, false);
      const lamp = new THREE.PointLight('#FFD3A2', low ? 0 : 22, 15, 2);
      lamp.position.set(x, 4.1, curbZ - 0.35);
      if (!low) outside.add(lamp);
      const pool = mesh(poolPlane('#FFD8A8', 0.35), mat.pool, x, 0.004, curbZ - 0.6, outside, false, false);
      pool.scale.set(6, 1, 5);
      pool.renderOrder = 1;
    }
    const bollards = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.07, 0.75, 10), mat.black, 24);
    for (let i = 0; i < 24; i++) {
      m4.makeTranslation(-27.6 + i * 2.4, 0.37, curbZ - 0.18);
      bollards.setMatrixAt(i, m4);
    }
    bollards.computeBoundingSphere();
    add(bollards, outside, false, false);
  }

  // ------------------------------------------------------------------------------------------- highlights
  const halos = new Map<string, THREE.Mesh>();
  const haloMats = new Map<string, THREE.MeshBasicNodeMaterial>();
  const haloMat = (hex: string) => {
    let m = haloMats.get(hex);
    if (!m) {
      m = M.fx(
        new THREE.MeshBasicNodeMaterial({
          colorNode: color(hex).mul(sin(time.mul(2.2)).mul(0.25).add(1.6)),
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          polygonOffset: true,
          polygonOffsetFactor: -3,
          polygonOffsetUnits: -3,
        }),
      );
      haloMats.set(hex, m);
    }
    return m;
  };
  for (const t of TABLES) {
    const h = new THREE.Mesh(haloGeometry(t), haloMat('#FFB547'));
    h.visible = false;
    h.renderOrder = 2;
    h.name = `halo-${t.id}`;
    group.add(h);
    halos.set(t.id, h);
  }

  // ----------------------------------------------------------------------------------------------- beacons
  const beaconGroup = new THREE.Group();
  beaconGroup.name = 'beacons';
  group.add(beaconGroup);
  type Beacon = { root: THREE.Group; ring: THREE.Mesh; strength: THREE.UniformNode<'float', number>; tint: THREE.UniformNode<'color', THREE.Color>; table: string };
  const beacons: Beacon[] = [];
  const makeBeacon = (): Beacon => {
    const root = new THREE.Group();
    const strength = uniform(1);
    const tint = uniform(new THREE.Color('#FF5B4D'));
    const ringMat = M.fx(new THREE.MeshBasicNodeMaterial({ colorNode: tint.mul(strength).mul(3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.46, 0.5, 48).rotateX(-Math.PI / 2), ringMat);
    ring.position.y = 0.015;
    root.add(ring);
    const beamMat = M.fx(
      new THREE.MeshBasicNodeMaterial({
        colorNode: tint.mul(smoothstep(1.0, 0.0, uv().y).mul(smoothstep(0.0, 0.08, uv().y)).mul(1.6)),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    );
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.07, 2.4, 16, 1, true), beamMat);
    beam.position.y = 1.2;
    root.add(beam);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), M.fx(new THREE.MeshBasicNodeMaterial({ colorNode: tint.mul(5) })));
    orb.position.y = 2.45;
    root.add(orb);
    root.visible = false;
    beaconGroup.add(root);
    return { root, ring, strength, tint, table: '' };
  };

  // --------------------------------------------------------------------------------------------------- arcs
  type Arc = { mesh: THREE.Mesh; key: string; tint: THREE.UniformNode<'color', THREE.Color> };
  const arcs: Arc[] = [];
  const arcGroup = new THREE.Group();
  arcGroup.name = 'arcs';
  group.add(arcGroup);
  const arcCurve = (from: string, to: string) => {
    const a = anchorOf(from);
    const b = anchorOf(to);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    mid.y += 0.9 + a.distanceTo(b) * 0.28;
    return new THREE.QuadraticBezierCurve3(a, mid, b);
  };
  const makeArc = (): Arc => {
    const tint = uniform(new THREE.Color('#FF7A8A'));
    const m = M.fx(
      new THREE.MeshBasicNodeMaterial({
        colorNode: tint.mul(smoothstep(0.55, 1.0, fract(uv().x.mul(7.0).sub(time.mul(0.7)))).mul(2.6).add(0.55)),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), m);
    mesh.visible = false;
    mesh.renderOrder = 3;
    arcGroup.add(mesh);
    return { mesh, key: '', tint };
  };

  // ------------------------------------------------------------------------------------------------- plates
  const plateGeo = plateGeometry(d);
  const PLATES = 72;
  const plateMat = new THREE.MeshStandardNodeMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.28 });
  const dish = merge([M.paintLight(plateGeo.plate, '#F3EEE6', 1), M.paintLight(plateGeo.meat, '#6A3420', 1)], true);
  const plateMesh = new THREE.InstancedMesh(dish, plateMat, PLATES);
  for (const im of [plateMesh]) {
    im.frustumCulled = false;
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    im.castShadow = shadows;
    for (let i = 0; i < PLATES; i++) im.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0));
    group.add(im);
  }
  type PlateState = { trip: PlateTrip; slot: number; obj: THREE.Object3D; state: 'pass' | 'carried' | 'table'; runner: number; pos: THREE.Vector3 };
  const plateStates = new Map<string, PlateState>();
  const freeSlots: number[] = Array.from({ length: PLATES }, (_, i) => PLATES - 1 - i);

  // ------------------------------------------------------------------------------------------------- people
  const crowd = opts.people ? new Crowd(low ? 96 : 136, d, shadows && !low) : null;
  if (crowd) group.add(crowd.group);
  const STAFF = TEAM.length;
  const seatIndex = new Map<string, number>();
  {
    let k = STAFF;
    for (const t of TABLES) seatMap.get(t.id)!.forEach((_, i) => seatIndex.set(`${t.id}:${i}`, k++));
  }
  const LINE0 = STAFF + [...seatMap.values()].reduce((s, l) => s + l.length, 0);
  const lineCap = crowd ? crowd.capacity - LINE0 : 0;
  const women: Record<TeamId, boolean> = { baran: false, deniz: false, ilyas: false, noor: true, seppe: false, fien: true, robbe: false, yasmine: true };
  const staffLooks = TEAM.map((m) => staffLook(m, women[m.id]));
  const homes: Record<TeamId, { x: number; z: number; yaw: number }> = {
    baran: { x: -6.08, z: ROOM.spits[0].z + 0.05, yaw: -Math.PI / 2 },
    deniz: { x: -5.12, z: ROOM.oven.z, yaw: -Math.PI / 2 },
    ilyas: { x: -4.98, z: -0.45, yaw: Math.PI / 2 },
    noor: { x: 1.95, z: 3.45, yaw: 0.2 },
    seppe: { x: ROOM.bar.x + 0.1, z: ROOM.bar.z + 0.47, yaw: 0 },
    fien: { x: -3.25, z: 1.85, yaw: -2.2 },
    robbe: { x: 2.7, z: 2.55, yaw: 0.6 },
    yasmine: { x: -3.35, z: -2.85, yaw: -1.2 },
  };
  type Runner = { idx: number; id: TeamId; pos: THREE.Vector3; yaw: number; phase: number; plate: string | null; route: THREE.Vector3[]; dist: number; mode: 'idle' | 'fetch' | 'deliver' | 'home' };
  const runners: Runner[] = (['fien', 'yasmine', 'robbe'] as TeamId[]).map((id) => ({
    idx: TEAM.findIndex((m) => m.id === id),
    id,
    pos: new THREE.Vector3(homes[id].x, 0, homes[id].z),
    yaw: homes[id].yaw,
    phase: 0,
    plate: null,
    route: [],
    dist: 0,
    mode: 'idle',
  }));
  let carvingSpit: 'rund' | 'kip' | null = null;
  let tNow = 0;

  const placeStaff = () => {
    if (!crowd) return;
    TEAM.forEach((m, i) => {
      if (runners.some((r) => r.idx === i)) return;
      const h = homes[m.id];
      let yaw = h.yaw;
      let x = h.x;
      let z = h.z;
      if (m.id === 'baran' && carvingSpit) {
        const s = carvingSpit === 'rund' ? ROOM.spits[0] : ROOM.spits[1];
        x = s.x + 0.62;
        z = s.z + 0.12;
        yaw = -Math.PI / 2 - 0.25;
      }
      const sway = Math.sin(tNow * 0.4 + i * 1.7) * 0.12;
      crowd.place(i, { pose: 'stand', x, z, yaw: yaw + sway * 0.4, look: staffLooks[i], head: sway });
    });
  };

  // Guests: one figure per seat; the slot is fixed, so a group sits down and gets up in place.
  const guestSeats = new Set<number>();
  const setGuests = (list: { table: string; size: number; seed: string }[]) => {
    if (!crowd) return;
    const wanted = new Map<number, { seat: Seat; look: Look; seed: string }>();
    for (const g of list) {
      const seats = seatMap.get(g.table);
      if (!seats) continue;
      for (let i = 0; i < Math.min(g.size, seats.length); i++) {
        const idx = seatIndex.get(`${g.table}:${i}`)!;
        wanted.set(idx, { seat: seats[i], look: guestLook(`${g.seed}:${i}`), seed: g.seed });
      }
    }
    for (const idx of guestSeats) if (!wanted.has(idx)) crowd.hide(idx);
    guestSeats.clear();
    for (const [idx, w] of wanted) {
      guestSeats.add(idx);
      const turn = ((hash(`${w.seed}-${idx}`) % 100) / 100 - 0.5) * 0.6;
      crowd.place(idx, { pose: 'sit', x: w.seat.x, z: w.seat.z, y: w.seat.y, yaw: w.seat.yaw, look: w.look, head: turn });
    }
  };

  let lineFigures = 0;
  const lineSpots: { pos: THREE.Vector3; yaw: number; look: Look }[] = [];
  const setLine = (list: { seed: string; size: number }[]) => {
    if (!crowd) return;
    lineSpots.length = 0;
    let dist = 0.2;
    const p = new THREE.Vector3();
    const side = new THREE.Vector3();
    for (const g of list) {
      const rows = Math.ceil(g.size / 2);
      for (let k = 0; k < g.size && lineSpots.length < lineCap; k++) {
        const r = Math.floor(k / 2);
        const yawPath = along(QUEUE, dist + r * 0.5, p);
        const pair = g.size - r * 2 >= 2;
        side.set(Math.cos(yawPath), 0, -Math.sin(yawPath));
        const off = pair ? (k % 2 === 0 ? -0.24 : 0.24) : 0;
        const pos = p.clone().addScaledVector(side, off);
        const face = yawPath + Math.PI + ((hash(`${g.seed}-${k}`) % 100) / 100 - 0.5) * 0.9;
        lineSpots.push({ pos, yaw: face, look: guestLook(`${g.seed}:${k}`) });
      }
      dist += rows * 0.5 + 0.38;
    }
    for (let i = lineSpots.length; i < lineFigures; i++) crowd.hide(LINE0 + i);
    lineFigures = lineSpots.length;
    lineSpots.forEach((s, i) => crowd.place(LINE0 + i, { pose: 'stand', x: s.pos.x, z: s.pos.z, yaw: s.yaw, look: s.look }));
  };

  // A room that looks lived in, for the app's seat picker: a few tables taken, someone at the door.
  if (crowd) {
    const ambient = TABLES.filter((t) => hash(`ambient-${t.id}`) % 3 === 0).map((t) => ({ table: t.id, size: Math.max(1, t.seats - (hash(t.id) % 2)), seed: `amb-${t.id}` }));
    setGuests(ambient);
    setLine([
      { seed: 'amb-l1', size: 2 },
      { seed: 'amb-l2', size: 3 },
    ]);
  }

  // ----------------------------------------------------------------------------------------- anchors & api
  function anchorOf(id: string): THREE.Vector3 {
    const t = tableById(id);
    if (!t) return new THREE.Vector3();
    if (t.area === 'fire') return new THREE.Vector3(P.x + 0.18, 1.1, t.z);
    if (t.area === 'bar') {
      const ux = t.x - ROOM.bar.x;
      const uz = t.z - ROOM.bar.z;
      const l = Math.hypot(ux, uz) || 1;
      return new THREE.Vector3(t.x - (ux / l) * 0.42, BAR_TOP + 0.02, t.z - (uz / l) * 0.42);
    }
    return new THREE.Vector3(t.x, TABLE_H + 0.02, t.z);
  }

  /** Where a plate sits on its table: in front of one of the seats. */
  const plateSpot = (table: string, k: number) => {
    const t = tableById(table);
    const seats = seatMap.get(table) ?? [];
    if (!t || !seats.length) return anchorOf(table);
    const s = seats[k % seats.length];
    const a = anchorOf(table);
    if (t.area === 'fire') return new THREE.Vector3(P.x + 0.2, 1.08, t.z);
    const toward = new THREE.Vector3(Math.sin(s.yaw), 0, Math.cos(s.yaw));
    const reach = t.area === 'bar' ? 0.36 : 0.4;
    return new THREE.Vector3(s.x + toward.x * reach, a.y - 0.01, s.z + toward.z * reach);
  };
  const passSpot = (k: number) => new THREE.Vector3(P.x + 0.06, 1.075, P.z + P.d / 2 - 0.16 - (k % 6) * 0.27);

  const m4 = new THREE.Matrix4();
  const q4 = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  const writePlate = (s: PlateState) => {
    m4.compose(s.pos, q4.identity(), one);
    plateMesh.setMatrixAt(s.slot, m4);
    s.obj.position.copy(s.pos);
  };
  const hidePlate = (slot: number) => {
    m4.makeScale(0, 0, 0);
    plateMesh.setMatrixAt(slot, m4);
  };

  let minute = 0;
  const plateGroup = new THREE.Group();
  plateGroup.name = 'plate-anchors';
  group.add(plateGroup);

  const setPlates = (list: PlateTrip[]) => {
    const keep = new Set(list.map((p) => p.id));
    for (const [id, s] of plateStates) {
      if (keep.has(id)) continue;
      hidePlate(s.slot);
      freeSlots.push(s.slot);
      s.obj.removeFromParent();
      const r = runners.find((x) => x.plate === id);
      if (r) {
        r.plate = null;
        r.mode = 'home';
        r.route = [r.pos.clone(), new THREE.Vector3(homes[r.id].x, 0, homes[r.id].z)];
        r.dist = 0;
      }
      plateStates.delete(id);
    }
    let onPass = [...plateStates.values()].filter((s) => s.state === 'pass').length;
    for (const trip of list) {
      const have = plateStates.get(trip.id);
      if (have) {
        have.trip = trip;
        continue;
      }
      const slot = freeSlots.pop();
      if (slot === undefined) continue;
      const obj = new THREE.Object3D();
      obj.name = `plate-${trip.id}`;
      plateGroup.add(obj);
      const served = minute >= trip.served;
      const s: PlateState = { trip, slot, obj, state: served ? 'table' : 'pass', runner: -1, pos: served ? plateSpot(trip.table, trip.seat ?? 0) : passSpot(onPass++) };
      plateStates.set(trip.id, s);
      writePlate(s);
    }
  };

  const updatePlates = (dt: number) => {
    if (!plateStates.size && runners.every((r) => r.mode === 'idle')) return;
    const speed = 1.15;
    // Fire-row plates go straight over the pass at their time.
    for (const s of plateStates.values()) {
      if (s.state !== 'pass') continue;
      const t = tableById(s.trip.table);
      if (t?.area === 'fire' && minute >= s.trip.served - 0.02) {
        s.state = 'table';
        s.pos.copy(plateSpot(s.trip.table, 0));
        writePlate(s);
      }
    }
    // Free runners take the oldest plate waiting on the pass.
    const waiting = [...plateStates.values()].filter((s) => s.state === 'pass' && s.runner < 0 && tableById(s.trip.table)?.area !== 'fire' && minute >= s.trip.carved).sort((a, b) => a.trip.carved - b.trip.carved);
    for (const s of waiting) {
      const r = runners.find((x) => x.mode === 'idle' || x.mode === 'home');
      if (!r) break;
      r.plate = s.trip.id;
      r.mode = 'fetch';
      r.route = [r.pos.clone(), PICKUP.clone()];
      r.dist = 0;
      s.runner = runners.indexOf(r);
    }
    const tmp = new THREE.Vector3();
    for (const r of runners) {
      if (r.mode === 'idle') continue;
      r.dist += speed * dt;
      const total = pathLength(r.route);
      const yaw = along(r.route, r.dist, tmp);
      r.pos.copy(tmp);
      r.yaw = yaw;
      r.phase += dt * 7.2;
      const plate = r.plate ? plateStates.get(r.plate) : undefined;
      if (r.mode === 'deliver' && plate) {
        plate.pos.set(r.pos.x + Math.sin(r.yaw) * 0.36, 1.06, r.pos.z + Math.cos(r.yaw) * 0.36);
        writePlate(plate);
      }
      if (r.dist >= total) {
        if (r.mode === 'fetch' && plate) {
          const t = tableById(plate.trip.table);
          r.mode = 'deliver';
          plate.state = 'carried';
          r.route = t ? routeTo(t) : [r.pos.clone()];
          r.dist = 0;
        } else if (r.mode === 'deliver' && plate) {
          plate.state = 'table';
          plate.pos.copy(plateSpot(plate.trip.table, plate.trip.seat ?? 0));
          writePlate(plate);
          plate.runner = -1;
          r.plate = null;
          r.mode = 'home';
          r.route = [...r.route].reverse().concat([new THREE.Vector3(homes[r.id].x, 0, homes[r.id].z)]);
          r.dist = 0;
        } else {
          r.mode = 'idle';
          r.yaw = homes[r.id].yaw;
          r.pos.set(homes[r.id].x, 0, homes[r.id].z);
        }
      }
    }
    plateMesh.instanceMatrix.needsUpdate = true;
  };

  const placeRunners = () => {
    if (!crowd) return;
    for (const r of runners) {
      const carrying = r.mode === 'deliver';
      const walking = r.mode !== 'idle';
      const sway = Math.sin(tNow * 0.35 + r.idx) * 0.1;
      crowd.place(r.idx, { pose: carrying ? 'carry' : walking ? 'walk' : 'stand', x: r.pos.x, z: r.pos.z, yaw: r.yaw + (walking ? 0 : sway), phase: r.phase, look: staffLooks[r.idx], head: walking ? 0 : sway });
    }
  };

  const setBeacons = (list: { table: string; color?: string }[]) => {
    while (beacons.length < list.length) beacons.push(makeBeacon());
    beacons.forEach((b, i) => {
      const item = list[i];
      b.root.visible = !!item;
      if (!item) return;
      const t = tableById(item.table);
      if (!t) {
        b.root.visible = false;
        return;
      }
      const a = anchorOf(item.table);
      b.root.position.set(t.area === 'fire' ? t.x : a.x, 0, t.area === 'fire' ? t.z : a.z);
      b.table = item.table;
      b.tint.value.set(item.color ?? '#FF5B4D');
    });
  };

  const setArcs = (list: { from: string; to: string; color?: string }[]) => {
    while (arcs.length < list.length) arcs.push(makeArc());
    arcs.forEach((a, i) => {
      const item = list[i];
      a.mesh.visible = !!item;
      if (!item) return;
      const key = `${item.from}>${item.to}`;
      if (a.key !== key) {
        a.mesh.geometry.dispose();
        a.mesh.geometry = new THREE.TubeGeometry(arcCurve(item.from, item.to), 64, 0.008, 5, false);
        a.key = key;
      }
      a.tint.value.set(item.color ?? '#FF7A8A');
    });
  };

  const sky = new THREE.Color('#0B0807');
  const night = new THREE.Color('#0B0807');
  const dusk = new THREE.Color('#1A2030');
  const day = new THREE.Color('#7F93A8');
  const setDaylight = (dl: number) => {
    const x = Math.max(0, Math.min(1, dl));
    if (x < 0.35) sky.copy(night).lerp(dusk, x / 0.35);
    else sky.copy(dusk).lerp(day, (x - 0.35) / 0.65);
    sun.intensity = 0.4 + x * 3.2;
    sun.color.set('#9DB2FF').lerp(new THREE.Color('#FFE9CF'), Math.min(1, x * 1.4));
    hemi.intensity = 0.75 + x * 1.3;
    hemi.color.set('#6A5244').lerp(new THREE.Color('#9FB4CC'), x);
  };
  setDaylight(0);

  // Shadows are redrawn in turn, one light per frame: people move slowly, the fire only flickers.
  type Shadowed = THREE.Light & { shadow: THREE.LightShadow };
  const shadowLights: Shadowed[] = [];
  group.traverse((o) => {
    const l = o as Shadowed;
    if (l.isLight && l.castShadow && l.shadow) {
      l.shadow.autoUpdate = false;
      l.shadow.needsUpdate = true;
      shadowLights.push(l);
    }
  });
  let frameNo = 0;

  let lastHalo = '';
  const room: Room = {
    group,
    quality,
    pickables,
    crowd,
    sky,
    anchor: (id) => anchorOf(id),
    seats: (id) => seatMap.get(id) ?? [],
    highlight(ids, hex = '#FFB547') {
      const key = `${ids.join(',')}|${hex}`;
      if (key === lastHalo) return;
      lastHalo = key;
      for (const [id, h] of halos) {
        h.visible = ids.includes(id);
        if (h.visible) h.material = haloMat(hex);
      }
    },
    setSpits(left) {
      spits.rund.setLeft(left.rund);
      spits.kip.setLeft(left.kip);
    },
    setFire(level) {
      fire.setLevel(level);
    },
    setDaylight,
    setScreen(texture) {
      // Only switching between a picture and none changes the shader; another picture is just a binding.
      if (!!screenMat.map !== !!texture) screenMat.needsUpdate = true;
      screenMat.map = texture;
      screenMat.color.set(texture ? '#ffffff' : '#0C0A09');
    },
    setSign(texture) {
      if (!!signMat.map !== !!texture) signMat.needsUpdate = true;
      signMat.map = texture;
      signMat.visible = !!texture;
      signMat.color.set('#FFF4E8');
    },
    setGuests,
    setLine,
    lineHead: () => QUEUE[0].clone().setY(2.1),
    setMinute(m) {
      minute = m;
    },
    setPlates,
    plateObject: (id) => plateStates.get(id)?.obj ?? null,
    setBeacons,
    setArcs,
    arcTop: (from, to) => arcCurve(from, to).getPoint(0.5),
    carving(spit) {
      carvingSpit = spit;
    },
    update(t, dt) {
      tNow = t;
      frameNo++;
      if (shadowLights.length) shadowLights[frameNo % shadowLights.length].shadow.needsUpdate = true;
      for (const u of updaters) u(t, dt);
      updatePlates(dt);
      for (const b of beacons) {
        if (!b.root.visible) continue;
        const k = (t * 0.8) % 1;
        b.ring.scale.setScalar(0.7 + k * 1.1);
        b.strength.value = (1 - k) * 1.4;
      }
      if (crowd) {
        placeStaff();
        placeRunners();
        crowd.flush();
      }
    },
    dispose() {
      disposeGroup(group);
      for (const m of haloMats.values()) m.dispose();
      group.removeFromParent();
    },
  };
  return room;
}

/**
 * Reflections for a room at night: a dark warm box with the room's own lights in it (pendants overhead, the oak fire
 * on the left, the bar's ring on the right, the street through the glass), prefiltered once. Chrome and lacquer then
 * mirror warm light instead of a photo studio. Set it as `scene.environment`.
 */
export function roomEnvironment(renderer: THREE.WebGPURenderer): THREE.Texture {
  const env = new THREE.Scene();
  const parts: THREE.Mesh[] = [];
  const box = new THREE.Mesh(new THREE.BoxGeometry(20, 8, 20), new THREE.MeshBasicNodeMaterial({ color: '#160E0B', side: THREE.BackSide }));
  box.position.y = 2.5;
  parts.push(box);
  const panel = (w: number, h: number, x: number, y: number, z: number, rx: number, ry: number, hex: string, k: number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicNodeMaterial({ colorNode: color(hex).mul(k), side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, 0);
    parts.push(m);
  };
  panel(2.6, 1.0, -2.5, 6.4, 0, Math.PI / 2, 0, '#FFC88F', 3.2);
  panel(2.6, 1.0, 2.5, 6.4, -1.5, Math.PI / 2, 0, '#FFC88F', 2.6);
  panel(1.2, 1.2, 0.5, 6.4, 3, Math.PI / 2, 0, '#FFD9B0', 2.0);
  panel(2.0, 3.2, -9.9, 1.4, -1.5, 0, Math.PI / 2, '#FF6A2A', 4.0);
  panel(5.0, 0.35, 9.9, 0.5, 0, 0, -Math.PI / 2, '#FFE2BC', 3.0);
  panel(16, 3.0, 0, 1.6, 9.9, 0, Math.PI, '#4E5466', 0.45);
  panel(16, 2.6, 0, 1.8, -9.9, 0, 0, '#5A2A18', 0.5);
  for (const p of parts) env.add(p);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const texture = pmrem.fromScene(env, 0.035).texture;
  pmrem.dispose();
  for (const p of parts) {
    p.geometry.dispose();
    (p.material as THREE.Material).dispose();
  }
  return texture;
}
