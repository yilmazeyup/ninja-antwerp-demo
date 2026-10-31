import * as THREE from 'three/webgpu';

import { hash } from '../random';
import { cloth, skin } from './room-materials';
import { merge, placed, roundedBox, type Detail } from './room-parts';

// The people in the room: smooth, faceless figures in the proportions of real people, dressed in what Antwerp wears
// to be seen (black, camel, cream, oxblood, denim), the chefs in white with the white headband. One draw call per body
// part for everyone (instancing), so a full Saturday with a line outside costs as much as an empty room.

export type Pose = 'stand' | 'sit' | 'walk' | 'carry';

export type Look = {
  top: string;
  bottom: string;
  skin: string;
  hair: string;
  /** 0 short, 1 long, 2 bun, 3 none (shaved or covered). */
  hairStyle: 0 | 1 | 2 | 3;
  skirt: boolean;
  chef: boolean;
  /** Height (1 = 1.74 m) and build (shoulders) as scales. */
  height: number;
  build: number;
};

export type Figure = {
  pose: Pose;
  x: number;
  z: number;
  /** Rotation about y: 0 faces +z. */
  yaw: number;
  look: Look;
  /** Height of the floor under the figure. */
  y?: number;
  /** Walking: the stride's phase in radians. */
  phase?: number;
  /** A turn of the head, in radians. */
  head?: number;
};

const PARTS = ['torso', 'head', 'hair0', 'hair1', 'hair2', 'armL', 'armR', 'armsSit', 'armsCarry', 'hands', 'legL', 'legR', 'legsSit', 'skirt', 'headband', 'apron'] as const;
type Part = (typeof PARTS)[number];

const SHOULDER = 0.185;
const HIP = 0.085;

/** A limb from a to b, tapering from r0 to r1, with round joints. */
function limb(a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, d: Detail) {
  const len = a.distanceTo(b);
  const g = new THREE.CylinderGeometry(r1, r0, len, d.tube + 3, 1, true);
  g.translate(0, len / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  g.applyQuaternion(q);
  g.translate(a.x, a.y, a.z);
  const ja = new THREE.SphereGeometry(r0, d.tube + 3, 6).translate(a.x, a.y, a.z);
  const jb = new THREE.SphereGeometry(r1, d.tube + 3, 6).translate(b.x, b.y, b.z);
  return merge([g, ja, jb]);
}

/** Paints a whole geometry with one vertex colour: shoes are dark whatever the trousers. */
function paint(g: THREE.BufferGeometry, shade: number) {
  const n = g.getAttribute('position').count;
  const c = new Float32Array(n * 3).fill(shade);
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}

function mergePainted(parts: THREE.BufferGeometry[]) {
  // merge() keeps position, normal and uv; colours are carried separately and joined in the same order.
  const colors: number[] = [];
  for (const p of parts) {
    const g = p.index ? p.toNonIndexed() : p;
    const c = g.getAttribute('color') as THREE.BufferAttribute | undefined;
    const n = g.getAttribute('position').count;
    for (let i = 0; i < n; i++) colors.push(c ? c.getX(i) : 1, c ? c.getY(i) : 1, c ? c.getZ(i) : 1);
    if (g !== p) g.dispose();
  }
  const out = merge(parts);
  out.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return out;
}

function shoe(x: number, y: number, z: number, d: Detail) {
  return paint(placed(roundedBox(0.085, 0.07, 0.25, 0.03, d.bevel), x, y, z), 0.16);
}

function buildGeometry(d: Detail): Record<Part, THREE.BufferGeometry> {
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  // Torso: hips to the base of the neck, an ellipse in section.
  const torsoProfile: [number, number][] = [
    [0.0, -0.01],
    [0.13, 0.0],
    [0.158, 0.06],
    [0.152, 0.15],
    [0.136, 0.25],
    [0.15, 0.36],
    [0.168, 0.45],
    [0.178, 0.51],
    [0.15, 0.56],
    [0.075, 0.585],
    [0.0, 0.59],
  ];
  const torso = new THREE.LatheGeometry(
    torsoProfile.map(([r, y]) => new THREE.Vector2(r, y)),
    d.radial,
  ).scale(1, 1, 0.62);

  const neck = new THREE.CylinderGeometry(0.043, 0.05, 0.11, d.tube + 3, 1, true).translate(0, 0.045, 0);
  const skull = new THREE.SphereGeometry(0.1, d.radial, Math.round(d.radial * 0.6)).scale(0.9, 1.1, 1.0).translate(0, 0.18, 0.005);
  const nose = new THREE.SphereGeometry(0.018, 8, 6).scale(0.8, 1.2, 1).translate(0, 0.17, 0.097);
  const head = merge([neck, skull, nose]);

  const cap = () => new THREE.SphereGeometry(0.108, d.radial, 10, 0, Math.PI * 2, 0, Math.PI * 0.6).rotateX(-0.42).scale(0.93, 1.1, 1.05).translate(0, 0.19, -0.004);
  const hair0 = cap();
  const hair1 = merge([cap(), placed(roundedBox(0.2, 0.36, 0.075, 0.035, d.bevel), 0, 0.05, -0.075, 0.08)]);
  const hair2 = merge([cap(), new THREE.SphereGeometry(0.05, 12, 8).translate(0, 0.265, -0.085)]);

  // A standing arm hangs from its shoulder pivot (the origin).
  const arm = merge([limb(V(0, 0, 0), V(0.01, -0.29, 0.005), 0.046, 0.038, d), limb(V(0.01, -0.29, 0.005), V(0.012, -0.55, 0.03), 0.037, 0.03, d)]);
  const armL = arm;
  const armR = arm.clone();
  const hand = new THREE.SphereGeometry(0.038, 10, 8).scale(0.75, 1.25, 0.6);

  // Seated (seat at 0.47): forearms resting on the table.
  const sitArm = (s: number) => merge([limb(V(s * SHOULDER, 0.99, 0.0), V(s * 0.205, 0.76, 0.13), 0.046, 0.037, d), limb(V(s * 0.205, 0.76, 0.13), V(s * 0.13, 0.775, 0.39), 0.036, 0.03, d)]);
  const armsSit = merge([sitArm(-1), sitArm(1)]);
  const carryArm = (s: number) => merge([limb(V(s * SHOULDER, 1.41, 0.0), V(s * 0.2, 1.15, 0.05), 0.046, 0.037, d), limb(V(s * 0.2, 1.15, 0.05), V(s * 0.12, 1.03, 0.33), 0.036, 0.03, d)]);
  const armsCarry = merge([carryArm(-1), carryArm(1)]);

  // A standing leg hangs from its hip pivot, with its shoe.
  const legProfile: [number, number][] = [
    [0.0, 0.02],
    [0.074, 0.0],
    [0.07, -0.12],
    [0.056, -0.42],
    [0.05, -0.5],
    [0.053, -0.6],
    [0.04, -0.82],
    [0.0, -0.84],
  ];
  const legL = mergePainted([paint(new THREE.LatheGeometry(legProfile.map(([r, y]) => new THREE.Vector2(r, y)), d.tube + 5), 1), shoe(0, -0.865, 0.045, d)]);
  const legR = legL.clone();

  const sitLeg = (s: number) => [
    paint(limb(V(s * HIP, 0.53, 0.0), V(s * 0.095, 0.53, 0.45), 0.075, 0.055, d), 1),
    paint(limb(V(s * 0.095, 0.53, 0.45), V(s * 0.1, 0.085, 0.48), 0.052, 0.04, d), 1),
    shoe(s * 0.1, 0.035, 0.53, d),
  ];
  const legsSit = mergePainted([...sitLeg(-1), ...sitLeg(1)]);

  const skirt = new THREE.LatheGeometry(
    [
      [0.142, 0.14],
      [0.162, 0.03],
      [0.19, -0.16],
      [0.24, -0.42],
      [0.238, -0.43],
    ].map(([r, y]) => new THREE.Vector2(r, y)),
    d.radial,
  ).scale(1, 1, 0.72);

  const band = new THREE.TorusGeometry(0.103, 0.016, 6, d.radial).rotateX(Math.PI / 2).scale(0.93, 1, 1.03).translate(0, 0.205, 0.0);
  const tails = [placed(roundedBox(0.03, 0.12, 0.012, 0.005, 1), -0.02, 0.16, -0.112, 0.25, 0, 0.18), placed(roundedBox(0.03, 0.11, 0.012, 0.005, 1), 0.02, 0.165, -0.11, 0.2, 0, -0.22)];
  const headband = merge([band, ...tails]);

  const apron = new THREE.CylinderGeometry(0.168, 0.235, 0.56, 16, 1, true, -1.05, 2.1).scale(1, 1, 0.76).translate(0, -0.12, 0.0);

  return { torso, head, hair0, hair1, hair2, armL, armR, armsSit, armsCarry, hands: hand, legL, legR, legsSit, skirt, headband, apron };
}

/**
 * Everyone in the room, instanced: figure i uses slot i in every part (slot 2i and 2i+1 for the hands). Place figures
 * with `place`, then `flush` once per frame or per change.
 */
export class Crowd {
  readonly group = new THREE.Group();
  private readonly meshes = {} as Record<Part, THREE.InstancedMesh>;
  private readonly dirty = new Set<Part>();
  private readonly zero = new THREE.Matrix4().makeScale(0, 0, 0);
  private readonly tmp = { base: new THREE.Matrix4(), m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), v: new THREE.Vector3(), s: new THREE.Vector3(), c: new THREE.Color() };
  private readonly shown: boolean[];

  constructor(readonly capacity: number, detail: Detail, shadows: boolean) {
    this.group.name = 'crowd';
    this.shown = new Array(capacity).fill(false);
    const geo = buildGeometry(detail);
    const fabric = cloth();
    const fabricVC = cloth(0.68, true);
    const hairMat = fabric;
    const skinMat = skin();
    const material: Record<Part, THREE.Material> = {
      torso: fabric,
      head: skinMat,
      hair0: hairMat,
      hair1: hairMat,
      hair2: hairMat,
      armL: fabric,
      armR: fabric,
      armsSit: fabric,
      armsCarry: fabric,
      hands: skinMat,
      legL: fabricVC,
      legR: fabricVC,
      legsSit: fabricVC,
      skirt: fabric,
      headband: fabric,
      apron: fabric,
    };
    for (const part of PARTS) {
      const count = part === 'hands' ? capacity * 2 : capacity;
      const mesh = new THREE.InstancedMesh(geo[part], material[part], count);
      mesh.name = `crowd-${part}`;
      mesh.frustumCulled = false;
      mesh.castShadow = shadows;
      mesh.receiveShadow = false;
      for (let i = 0; i < count; i++) {
        mesh.setMatrixAt(i, this.zero);
        mesh.setColorAt(i, this.tmp.c.set('#ffffff'));
      }
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.meshes[part] = mesh;
      this.group.add(mesh);
    }
  }

  private set(part: Part, i: number, m: THREE.Matrix4 | null, hex?: string) {
    const mesh = this.meshes[part];
    mesh.setMatrixAt(i, m ?? this.zero);
    if (hex && m) mesh.setColorAt(i, this.tmp.c.set(hex));
    this.dirty.add(part);
  }

  private local(x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    const { m, q, e, v, s, base } = this.tmp;
    m.compose(v.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), s.set(sx, sy, sz));
    return m.premultiply(base);
  }

  /** Puts figure `i` in the room. */
  place(i: number, f: Figure) {
    if (i < 0 || i >= this.capacity) return;
    const { look } = f;
    const { base, q, e, v, s } = this.tmp;
    const h = look.height;
    const sit = f.pose === 'sit';
    const walking = f.pose === 'walk' || f.pose === 'carry';
    const phase = f.phase ?? 0;
    const bob = walking ? Math.abs(Math.sin(phase)) * 0.018 : 0;
    base.compose(v.set(f.x, (f.y ?? 0) + bob, f.z), q.setFromEuler(e.set(0, f.yaw, 0)), s.set(h, h, h));
    this.shown[i] = true;

    const hipY = sit ? 0.47 : 0.88;
    const neckY = hipY + 0.585;
    const b = look.build;
    this.set('torso', i, this.local(0, hipY, 0, sit ? 0.05 : 0, 0, 0, b, 1, 1), look.top);
    const headM = this.local(0, neckY, sit ? 0.03 : 0, 0, f.head ?? 0, 0).clone();
    this.set('head', i, headM, look.skin);
    for (const k of [0, 1, 2] as const) {
      const part = `hair${k}` as const;
      this.set(part, i, look.hairStyle === k ? headM : null, look.hair);
    }
    this.set('headband', i, look.chef ? headM : null, '#F4F1EC');

    // Arms and hands.
    const swing = walking ? Math.sin(phase) * 0.38 : 0;
    const handM = new THREE.Matrix4();
    if (sit) {
      this.set('armL', i, null);
      this.set('armR', i, null);
      this.set('armsCarry', i, null);
      this.set('armsSit', i, this.local(0, 0, 0, 0, 0, 0, b, 1, 1), look.top);
      for (const sd of [-1, 1]) this.set('hands', i * 2 + (sd > 0 ? 1 : 0), handM.copy(this.local(sd * 0.13 * b, 0.775, 0.43, -1.4)), look.skin);
    } else if (f.pose === 'carry') {
      this.set('armL', i, null);
      this.set('armR', i, null);
      this.set('armsSit', i, null);
      this.set('armsCarry', i, this.local(0, 0, 0, 0, 0, 0, b, 1, 1), look.top);
      for (const sd of [-1, 1]) this.set('hands', i * 2 + (sd > 0 ? 1 : 0), handM.copy(this.local(sd * 0.12 * b, 1.03, 0.37, -1.3)), look.skin);
    } else {
      this.set('armsSit', i, null);
      this.set('armsCarry', i, null);
      for (const sd of [-1, 1]) {
        const a = sd < 0 ? swing : -swing;
        const arm = this.local(sd * SHOULDER * b, 1.41, 0, a, 0, sd * 0.07);
        this.set(sd < 0 ? 'armL' : 'armR', i, arm, look.top);
        // The hand sits at the end of the arm: 0.6 m below the shoulder pivot, turned with it.
        const hand = new THREE.Matrix4().compose(new THREE.Vector3(0.012 * sd, -0.6, 0.03), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
        this.set('hands', i * 2 + (sd > 0 ? 1 : 0), handM.copy(arm).multiply(hand), look.skin);
      }
    }

    // Legs.
    if (sit) {
      this.set('legL', i, null);
      this.set('legR', i, null);
      this.set('legsSit', i, this.local(0, 0, 0), look.bottom);
      this.set('skirt', i, null);
      this.set('apron', i, null);
    } else {
      this.set('legsSit', i, null);
      const stride = walking ? Math.sin(phase) * 0.42 : 0;
      this.set('legL', i, this.local(-HIP, 0.9, 0, -stride), look.bottom);
      this.set('legR', i, this.local(HIP, 0.9, 0, stride), look.bottom);
      this.set('skirt', i, look.skirt ? this.local(0, hipY, 0, 0, 0, 0, b, 1, 1) : null, look.bottom);
      this.set('apron', i, look.chef ? this.local(0, 0.88, 0.02, 0, 0, 0, b, 1, 1) : null, '#F4F1EC');
    }
  }

  hide(i: number) {
    if (i < 0 || i >= this.capacity || !this.shown[i]) return;
    this.shown[i] = false;
    for (const part of PARTS) {
      if (part === 'hands') {
        this.set('hands', i * 2, null);
        this.set('hands', i * 2 + 1, null);
      } else this.set(part, i, null);
    }
  }

  isShown(i: number) {
    return this.shown[i] ?? false;
  }

  /** Sends the changes to the GPU. */
  flush() {
    for (const part of this.dirty) {
      const mesh = this.meshes[part];
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    this.dirty.clear();
  }

  dispose() {
    const mats = new Set<THREE.Material>();
    for (const part of PARTS) {
      const mesh = this.meshes[part];
      mesh.geometry.dispose();
      mats.add(mesh.material as THREE.Material);
      mesh.dispose();
    }
    mats.forEach((m) => m.dispose());
  }
}

// ---------------------------------------------------------------------------------------------------------- looks

const TOPS = ['#111012', '#1B1A1C', '#2A2726', '#A07A52', '#E7DECF', '#5E1D14', '#1C1F27', '#3E3A2C', '#EDE9E2', '#47301F', '#6D6964', '#0D0D0E', '#7B151A', '#C9B79C'];
const BOTTOMS = ['#121113', '#1E2532', '#1A1918', '#E3DACB', '#8C6A48', '#3B3A3D', '#0E0E0F', '#2C2A27'];
const SKINS = ['#F1D3BF', '#E8C3A6', '#D9A982', '#C68E66', '#B07651', '#8E5B3D', '#6B4430', '#F5DCCB'];
const HAIRS = ['#14100D', '#1F1611', '#2A1C14', '#4A3020', '#C9A26A', '#6B2E1A', '#8F8A84', '#0C0A09', '#B88B4A'];

/** A guest's look, the same every time for the same seed. */
export function guestLook(seed: string): Look {
  const h = hash(seed);
  const r = (k: number, n: number) => (hash(`${seed}:${k}`) % 1000) / 1000 * n;
  const woman = h % 2 === 0;
  const hairStyle = (woman ? [1, 1, 2, 0][Math.floor(r(1, 4))] : [0, 0, 0, 3][Math.floor(r(1, 4))]) as Look['hairStyle'];
  return {
    top: TOPS[Math.floor(r(2, TOPS.length))],
    bottom: BOTTOMS[Math.floor(r(3, BOTTOMS.length))],
    skin: SKINS[Math.floor(r(4, SKINS.length))],
    hair: HAIRS[Math.floor(r(5, HAIRS.length))],
    hairStyle,
    skirt: woman && r(6, 1) < 0.35,
    chef: false,
    height: woman ? 0.95 + r(7, 0.06) : 1.0 + r(7, 0.07),
    build: woman ? 0.9 + r(8, 0.06) : 1.0 + r(8, 0.08),
  };
}

/** A team member's look: chefs in white with the headband, the floor in black. */
export function staffLook(m: { skin: string; hair: string; outfit: string; headband: boolean }, woman: boolean): Look {
  return {
    top: m.outfit,
    bottom: m.headband ? '#1A1817' : '#111012',
    skin: m.skin,
    hair: m.hair,
    hairStyle: m.headband ? 0 : woman ? 2 : 0,
    skirt: false,
    chef: m.headband,
    height: woman ? 0.97 : 1.02,
    build: woman ? 0.92 : 1.03,
  };
}
