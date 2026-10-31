import * as THREE from 'three/webgpu';
import {
  abs,
  clamp,
  color,
  float,
  fract,
  hash,
  instanceIndex,
  mix,
  normalWorld,
  positionLocal,
  pow,
  sin,
  smoothstep,
  time,
  uniform,
  uv,
  varying,
  vec2,
  vec3,
} from 'three/tsl';

import { hash as hashText } from '../random';
import type { Quality } from './renderer';
import { blackSteel, chrome, fx, limestone, noise, oak, steel, travertine } from './room-materials';
import { merge, placed, roundedBox, type Detail } from './room-parts';

// The kitchen's heat for the room in 3D: the vertical rack of oak behind the two döner spits (glowing logs, flames,
// sparks rising on the GPU, a light that breathes with the fire), the spits themselves (layered meat that browns on
// the side facing the fire, turns, and shrinks as the evening's kilograms go), and the stone oven with its glowing
// mouth. Built for the panel's room; light enough for a phone at 'low'.


/** Ember to amber to white heat: the colour of fire at intensity `i` (0–1). */
const fireRamp = (i: THREE.Node<'float'>) =>
  mix(mix(color('#5A0F03'), color('#FF5A1C'), smoothstep(0.0, 0.42, i)), color('#FFE3A0'), smoothstep(0.5, 1.0, i));

/** A flame on a plane (uv 0–1, y up): turbulent tongues scrolling upward, added to the scene. */
function flameMaterial(strength: THREE.UniformNode<'float', number>) {
  const u = uv();
  const seed = varying(hash(instanceIndex));
  const n1 = noise(vec2(u.x.mul(0.32).add(seed), u.y.mul(0.26).sub(time.mul(0.36)))).r.mul(2).sub(1);
  const n2 = noise(vec2(u.x.mul(0.9).add(seed.mul(3.0)), u.y.mul(0.7).sub(time.mul(0.85)))).g.mul(2).sub(1);
  const sway = u.x.sub(0.5).add(n1.mul(0.2).mul(u.y.add(0.2)));
  const width = mix(float(0.44), float(0.05), pow(u.y, float(0.85)));
  const body = smoothstep(width, width.mul(0.25), abs(sway));
  const top = smoothstep(1.0, 0.18, u.y.add(n2.mul(0.3)).add(n1.mul(0.14)));
  const foot = smoothstep(0.0, 0.1, u.y);
  const i = clamp(body.mul(top).mul(foot).mul(n1.mul(0.5).add(1.0)), 0, 1);
  return fx(
    new THREE.MeshBasicNodeMaterial({
      colorNode: fireRamp(i).mul(i).mul(strength),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }),
  );
}

/** Charred oak with glowing cracks that pulse. */
function logMaterial(heat: THREE.UniformNode<'float', number>) {
  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0, roughness: 0.92 });
  const p = positionLocal;
  const seed = varying(hash(instanceIndex));
  const n = noise(vec2(p.x.add(p.z).mul(0.9).add(seed), p.y.mul(0.5).add(time.mul(0.015)))).r;
  const cracks = smoothstep(0.5, 0.82, n);
  const pulse = sin(time.mul(2.1).add(seed.mul(40.0))).mul(0.22).add(0.78);
  m.colorNode = mix(color('#0E0A08'), color('#2A1A12'), smoothstep(0.2, 0.6, n));
  m.emissiveNode = fireRamp(cracks.mul(0.85)).mul(cracks.mul(cracks)).mul(pulse).mul(heat);
  return m;
}

export type Fire = {
  group: THREE.Group;
  lights: THREE.Light[];
  /** 0–1: how hard the fire burns now (from the thermocouple), and the flicker follows. */
  setLevel(level: number): void;
  update(t: number, dt: number): void;
  dispose(): void;
};

/**
 * The vertical oak fire: a blackened steel rack against the wall with logs stacked across, open toward the room.
 * `x` is the rack's front face, `z0..z1` its length along the wall.
 */
export function createFire(opts: { x: number; z0: number; z1: number; quality: Quality; detail: Detail }): Fire {
  const { x, z0, z1, quality } = opts;
  const group = new THREE.Group();
  group.name = 'fire';
  const len = z1 - z0;
  const zc = (z0 + z1) / 2;
  const heat = uniform(1.0);
  const flameStrength = uniform(3.2);

  // The rack: a black steel frame with a back of firebrick.
  const frameMat = blackSteel();
  const brick = new THREE.MeshStandardNodeMaterial({ metalness: 0, roughness: 0.95 });
  const bn = noise(vec2(positionLocal.z.mul(0.5), positionLocal.y.mul(0.5).sub(time.mul(0.03))));
  brick.colorNode = mix(color('#1A0C08'), color('#3A1710'), bn.g);
  brick.emissiveNode = color('#FF4A12').mul(smoothstep(0.45, 0.85, bn.r).mul(0.45)).mul(heat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.7, len), brick);
  back.position.set(x - 0.42, 1.65, zc);
  group.add(back);
  const posts: THREE.BufferGeometry[] = [];
  for (const z of [z0, z1]) {
    posts.push(placed(new THREE.BoxGeometry(0.46, 1.9, 0.05), x - 0.21, 1.55, z));
  }
  posts.push(placed(new THREE.BoxGeometry(0.46, 0.05, len + 0.05), x - 0.21, 0.6, zc));
  posts.push(placed(new THREE.BoxGeometry(0.46, 0.05, len + 0.05), x - 0.21, 2.5, zc));
  // Grate bars in front of the logs.
  for (let i = 1; i < 9; i++) posts.push(placed(new THREE.CylinderGeometry(0.008, 0.008, 1.86, 6), x - 0.015, 1.55, z0 + (i / 9) * len));
  const frame = new THREE.Mesh(merge(posts), frameMat);
  frame.castShadow = quality !== 'low';
  group.add(frame);

  // The logs: split oak stacked across the rack, glowing in the cracks.
  const logs: { y: number; z: number; r: number; l: number; rx: number }[] = [];
  let row = 0;
  for (let y = 0.7; y < 2.35; y += 0.11, row++) {
    for (let z = z0 + 0.25 + (row % 2) * 0.22; z < z1 - 0.2; z += 0.46) {
      const h = hashText(`log-${row}-${z.toFixed(2)}`);
      logs.push({ y: y + ((h % 100) / 100) * 0.02, z: z + (((h >> 8) % 100) / 100 - 0.5) * 0.08, r: 0.045 + ((h >> 4) % 20) / 1000, l: 0.38 + ((h >> 12) % 10) / 100, rx: (((h >> 16) % 100) / 100 - 0.5) * 0.25 });
    }
  }
  const logGeo = new THREE.CylinderGeometry(1, 1, 1, quality === 'low' ? 6 : 9, 1);
  const logMesh = new THREE.InstancedMesh(logGeo, logMaterial(heat), logs.length);
  const m4 = new THREE.Matrix4();
  logs.forEach((l, i) => {
    m4.compose(new THREE.Vector3(x - 0.22, l.y, l.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2 + l.rx, 0, 0.1)), new THREE.Vector3(l.r, l.l, l.r));
    logMesh.setMatrixAt(i, m4);
  });
  logMesh.computeBoundingSphere();
  group.add(logMesh);

  // Flames: crossed planes along the rack, each with its own seed.
  const flames = quality === 'low' ? 6 : 10;
  const flameGeo = new THREE.PlaneGeometry(0.55, 1.15);
  flameGeo.translate(0, 0.575, 0);
  const flameMesh = new THREE.InstancedMesh(flameGeo, flameMaterial(flameStrength), flames * 2);
  for (let i = 0; i < flames; i++) {
    const z = z0 + 0.2 + ((i + 0.5) / flames) * (len - 0.4);
    const y = 0.72 + (i % 3) * 0.32;
    const s = 0.8 + ((hashText(`flame-${i}`) % 100) / 100) * 0.6;
    for (let k = 0; k < 2; k++) {
      m4.compose(new THREE.Vector3(x - 0.2, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2 + (k ? 0.75 : -0.75), 0)), new THREE.Vector3(s, s * (1.1 + (i % 2) * 0.35), s));
      flameMesh.setMatrixAt(i * 2 + k, m4);
    }
  }
  flameMesh.computeBoundingSphere();
  flameMesh.renderOrder = 2;
  group.add(flameMesh);

  // Sparks: GPU sprites, each on its own loop, rising out of the rack and drifting into the room.
  const sparkCount = quality === 'high' ? 280 : quality === 'medium' ? 150 : 50;
  const sm = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const a = hash(instanceIndex);
  const b = hash(instanceIndex.add(91));
  const c = hash(instanceIndex.add(377));
  const life = fract(time.mul(mix(float(0.16), float(0.4), b)).add(a));
  const rise = life.mul(mix(float(1.1), float(2.4), c));
  sm.positionNode = vec3(
    float(x - 0.22).add(life.mul(mix(float(0.15), float(0.9), a))).add(sin(life.mul(11.0).add(c.mul(30.0))).mul(0.05)),
    float(0.75).add(c.mul(0.9)).add(rise),
    float(z0 + 0.1).add(b.mul(len - 0.2)).add(sin(life.mul(7.0).add(a.mul(20.0))).mul(0.09)),
  );
  const round = smoothstep(0.5, 0.05, uv().sub(0.5).length());
  sm.colorNode = mix(color('#FFE6A8'), color('#FF3C0A'), smoothstep(0.0, 0.7, life)).mul(round).mul(smoothstep(1.0, 0.55, life)).mul(smoothstep(0.0, 0.06, life)).mul(7.0).mul(heat);
  sm.scaleNode = float(0.022).mul(life.oneMinus().mul(0.7).add(0.3));
  fx(sm);
  const sparks = new THREE.Sprite(sm);
  sparks.count = sparkCount;
  sparks.frustumCulled = false;
  sparks.renderOrder = 3;
  group.add(sparks);

  // The light: a warm spot out of the rack that throws the spits' and chefs' shadows into the room, and a fill.
  const lights: THREE.Light[] = [];
  const spot = new THREE.SpotLight('#FF7A36', 40, 0, 1.05, 0.85, 2);
  spot.position.set(x - 0.15, 1.5, zc);
  spot.target.position.set(x + 4.5, 0.4, zc + 0.6);
  if (quality !== 'low') {
    spot.castShadow = true;
    spot.shadow.mapSize.set(quality === 'high' ? 1024 : 512, quality === 'high' ? 1024 : 512);
    spot.shadow.bias = -0.0004;
    spot.shadow.normalBias = 0.03;
    spot.shadow.radius = 4;
    spot.shadow.camera.near = 0.2;
    spot.shadow.camera.far = 14;
  }
  group.add(spot, spot.target);
  lights.push(spot);
  const fill = new THREE.PointLight('#FF6A2A', 9, 7.5, 2);
  fill.position.set(x + 0.4, 1.4, zc);
  group.add(fill);
  lights.push(fill);

  let level = 1;
  const base = { spot: spot.intensity, fill: fill.intensity };
  return {
    group,
    lights,
    setLevel(l: number) {
      level = Math.max(0.2, Math.min(1.4, l));
    },
    update(t: number) {
      const flicker = 0.82 + 0.1 * Math.sin(t * 7.3) + 0.06 * Math.sin(t * 13.1 + 1.3) + 0.05 * Math.sin(t * 23.7 + 0.4);
      spot.intensity = base.spot * level * flicker;
      fill.intensity = base.fill * level * (0.9 + 0.1 * Math.sin(t * 11.2));
      heat.value = 0.55 + 0.3 * level;
      flameStrength.value = 1.7 + 1.0 * level;
    },
    dispose() {
      disposeGroup(group);
    },
  };
}

// --------------------------------------------------------------------------------------------------------- spits

export type Spit = {
  group: THREE.Group;
  /** 0–1: what is left of the spit (kilograms over the start); the meat gets thinner. */
  setLeft(fraction: number): void;
  update(t: number, dt: number): void;
  dispose(): void;
};

/** A vertical döner spit: the meat (layered, browned on the fire side), the skewer, the drip tray and the top. */
export function createSpit(opts: { kind: 'rund' | 'kip'; x: number; z: number; detail: Detail; quality: Quality }): Spit {
  const { kind, x, z, detail, quality } = opts;
  const group = new THREE.Group();
  group.name = `spit-${kind}`;
  group.position.set(x, 0, z);
  const glowAmount = uniform(1.0);

  // The meat: a lathe that widens toward the top, its surface carved in vertical facets and stacked by hand.
  const prof: THREE.Vector2[] = [];
  const H = 0.78;
  const shape = (t: number) => 0.12 + 0.11 * Math.pow(t, 0.8) - 0.05 * Math.pow(t, 6);
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    prof.push(new THREE.Vector2(shape(t), t * H));
  }
  prof.unshift(new THREE.Vector2(0.0, 0));
  prof.push(new THREE.Vector2(0.17, H + 0.015), new THREE.Vector2(0.0, H + 0.02));
  const seg = quality === 'low' ? 18 : 40;
  const meatGeo = new THREE.LatheGeometry(prof, seg);
  const pos = meatGeo.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    const py = pos.getY(i);
    const pz = pos.getZ(i);
    const r = Math.hypot(px, pz);
    if (r < 0.01) continue;
    const a = Math.atan2(pz, px);
    // Carved facets and a hand-stacked wobble.
    const facet = 1 - 0.035 * Math.abs(Math.sin(a * 4.5));
    const wobble = 1 + 0.03 * Math.sin(py * 38 + a * 2) + 0.02 * Math.sin(py * 91 + a * 5);
    pos.setXYZ(i, px * facet * wobble, py, pz * facet * wobble);
  }
  meatGeo.computeVertexNormals();

  const m = new THREE.MeshStandardNodeMaterial({ metalness: 0, roughness: 0.52 });
  const p = positionLocal;
  const nn = noise(vec2(p.x.add(p.z).mul(1.4), p.y.mul(1.1)));
  const layers = sin(p.y.mul(150).add(nn.g.mul(9))).mul(0.5).add(0.5);
  const chunk = nn.r.mul(2).sub(1);
  const toFire = clamp(normalWorld.dot(vec3(-1, 0, 0.12).normalize()), 0, 1);
  const c = kind === 'rund' ? { inner: '#83472B', mid: '#5E2D18', crust: '#2A1109', light: '#A35F38' } : { inner: '#D49A55', mid: '#AD6C2B', crust: '#5E300E', light: '#E3B26C' };
  const u = (hex: string) => uniform(new THREE.Color(hex));
  const flesh = mix(mix(u(c.mid), u(c.inner), smoothstep(-0.5, 0.6, chunk)), u(c.light), layers.mul(0.18));
  m.colorNode = mix(flesh, u(c.crust), clamp(toFire.mul(0.75).add(smoothstep(0.35, 0.9, chunk).mul(0.25)), 0, 1));
  m.roughnessNode = float(0.55).sub(toFire.mul(0.2));
  m.emissiveNode = color('#FF5A1A').mul(pow(toFire, float(3.0)).mul(0.22)).mul(glowAmount);
  const meat = new THREE.Mesh(meatGeo, m);
  meat.position.y = 0.97;
  meat.castShadow = quality !== 'low';
  meat.receiveShadow = quality !== 'low';
  group.add(meat);

  // Skewer, tray and top.
  const chromeMat = chrome();
  const steelMat = steel();
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.25, 10), chromeMat);
  rod.position.y = 1.43;
  group.add(rod);
  const tray = new THREE.Mesh(
    new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(0.27, 0), new THREE.Vector2(0.31, 0.05), new THREE.Vector2(0.3, 0.055), new THREE.Vector2(0.26, 0.012), new THREE.Vector2(0, 0.012)], detail.radial),
    steelMat,
  );
  tray.position.y = 0.9;
  group.add(tray);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, detail.radial), steelMat);
  top.position.y = 1.8;
  group.add(top);
  const motor = new THREE.Mesh(roundedBox(0.16, 0.12, 0.16, 0.02, detail.bevel), blackSteel());
  motor.position.y = 2.06;
  group.add(motor);

  let left = 1;
  let shown = 1;
  return {
    group,
    setLeft(fraction: number) {
      left = Math.max(0.12, Math.min(1, fraction));
    },
    update(t: number, dt: number) {
      meat.rotation.y += dt * ((2.2 * Math.PI * 2) / 60);
      shown += (left - shown) * Math.min(1, dt * 1.5);
      const s = 0.42 + 0.58 * Math.sqrt(shown);
      meat.scale.set(s, 0.94 + 0.06 * shown, s);
      glowAmount.value = 0.85 + 0.15 * Math.sin(t * 6.1);
    },
    dispose() {
      disposeGroup(group);
    },
  };
}

// ---------------------------------------------------------------------------------------------------------- oven

export type Oven = { group: THREE.Group; lights: THREE.Light[]; update(t: number): void; dispose(): void };

/** The stone oven from Istanbul: a dome in lime plaster on a travertine base, its mouth glowing toward the room. */
export function createOven(opts: { x: number; z: number; r: number; detail: Detail; quality: Quality }): Oven {
  const { x, z, r, detail, quality } = opts;
  const group = new THREE.Group();
  group.name = 'oven';
  group.position.set(x, 0, z);
  const baseH = 0.82;
  const domeH = r * 0.7;

  const base = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.05, baseH, detail.radial + 8), travertine());
  base.position.y = baseH / 2;
  base.castShadow = base.receiveShadow = quality !== 'low';
  group.add(base);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(r * 1.01, 0.035, 8, detail.radial + 8), travertine());
  lip.rotation.x = Math.PI / 2;
  lip.position.y = baseH;
  group.add(lip);

  const dome = new THREE.Mesh(new THREE.SphereGeometry(r, detail.radial + 8, 18, 0, Math.PI * 2, 0, Math.PI / 2), limestone());
  dome.scale.y = domeH / r;
  dome.position.y = baseH;
  dome.castShadow = dome.receiveShadow = quality !== 'low';
  group.add(dome);

  // The mouth: a black iron arch and the fire inside, toward +x (the room).
  const heat = uniform(1.0);
  const u = uv();
  const n = noise(vec2(u.x.mul(0.4), u.y.mul(0.3).sub(time.mul(0.25)))).r.mul(2).sub(1);
  const inner = new THREE.MeshBasicNodeMaterial({
    colorNode: fireRamp(clamp(n.mul(0.5).add(0.62).sub(u.y.mul(0.35)), 0, 1)).mul(float(2.6).mul(heat)),
  });
  const mouthR = 0.24;
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(mouthR, 24, 0, Math.PI), inner);
  mouth.rotation.y = Math.PI / 2;
  mouth.position.set(r * 0.86, baseH + 0.005, 0);
  group.add(mouth);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(mouthR + 0.02, 0.032, 8, 28, Math.PI), blackSteel());
  arch.rotation.y = Math.PI / 2;
  arch.position.set(r * 0.9, baseH, 0);
  group.add(arch);

  // A short black flue on the crown of the dome.
  const flue = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.11, 0.42, 16), blackSteel());
  flue.position.y = baseH + domeH + 0.17;
  group.add(flue);

  // A stack of split oak under the counter beside it.
  const logGeo = new THREE.CylinderGeometry(0.05, 0.055, 0.42, 7);
  const logs = new THREE.InstancedMesh(logGeo, oak(), 15);
  const m4 = new THREE.Matrix4();
  let k = 0;
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 5 - row; i++) {
      m4.compose(new THREE.Vector3(r * 0.2 + i * 0.105 + row * 0.052, 0.055 + row * 0.095, r + 0.38), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)), new THREE.Vector3(1, 1, 1));
      logs.setMatrixAt(k++, m4);
    }
  }
  logs.count = k;
  logs.computeBoundingSphere();
  group.add(logs);

  const lights: THREE.Light[] = [];
  const light = new THREE.PointLight('#FF7A30', 4.5, 4.5, 2);
  light.position.set(r + 0.25, baseH + 0.15, 0);
  group.add(light);
  lights.push(light);

  return {
    group,
    lights,
    update(t: number) {
      const f = 0.85 + 0.09 * Math.sin(t * 5.3) + 0.06 * Math.sin(t * 12.7 + 2);
      light.intensity = 4.5 * f;
      heat.value = f;
    },
    dispose() {
      disposeGroup(group);
    },
  };
}

// -------------------------------------------------------------------------------------------------------- helpers

export function disposeGroup(root: THREE.Object3D) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    mesh.geometry?.dispose();
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else mat?.dispose();
  });
}
