// Ninja's open oak-wood fire, for the spit and for the wordmark: split oak logs with glowing cracks, a bed of embers
// that breathes, flames drawn from animated noise on soft camera-facing cards, sparks rising on the GPU, and a warm
// light that flickers with them. All of it can switch to the thermal camera's inferno colours.

import * as THREE from 'three/webgpu';
import {
  abs,
  clamp,
  color,
  cos,
  float,
  floor,
  fract,
  hash,
  instanceIndex,
  instancedBufferAttribute,
  mix,
  mx_noise_float,
  positionLocal,
  pow,
  screenCoordinate,
  sin,
  smoothstep,
  time,
  uniform,
  uv,
  vec2,
  vec3,
} from 'three/tsl';

import { THERMAL } from '../telemetry';
import { cellular } from './leather';
import type { Quality } from './renderer';

type N = THREE.Node;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TSL's chained node API is typed far stricter than it runs.
const n = (x: unknown): any => x;

export type FloatUniform = N & { value: number };

/** Sprite materials take an emissive node at runtime (it is what the bloom pass reads); the typings omit it. */
const glowOf = (m: THREE.SpriteNodeMaterial) => m as unknown as { emissiveNode: unknown };
export const floatUniform = (value: number) => uniform(value) as unknown as FloatUniform;

/** The thermal camera's inferno ramp (THERMAL in telemetry.ts) as a TSL function of 0–1. */
export function inferno(t: N): N {
  const stops = THERMAL.map((hex) => color(hex));
  let c: N = stops[0] as unknown as N;
  const k = stops.length - 1;
  const x = n(clamp(t as never, 0, 1)).mul(k);
  for (let i = 1; i <= k; i++) c = n(mix(c as never, stops[i], n(clamp(n(x).sub(i - 1) as never, 0, 1)) as never));
  return c;
}

/** Thermal-camera scanlines: a faint line every third pixel and a slow roll. */
export function scanlines(): N {
  const line = n(sin(n(screenCoordinate.y).mul(2.1).add(n(time).mul(3)) as never)).mul(0.5).add(0.5);
  const roll = n(smoothstep(0.0, 0.02, n(fract(n(screenCoordinate.y).mul(0.0016).sub(n(time).mul(0.12)) as never)).sub(0.98) as never));
  return n(float(0.9)).add(n(line).mul(0.1)).add(n(roll).mul(0.25));
}

export type FireLayout = 'pile' | 'wall';

export type OakFireOptions = {
  quality: Quality;
  /** A low pile of logs (under the wordmark) or a wall of logs in a steel grate (behind the spit). */
  layout?: FireLayout;
  /** Width of the pile, or of the grate. */
  width?: number;
  /** Height of the flames (pile) or of the grate (wall). */
  height?: number;
  /** 0–1: shared thermal look; the spit passes its own so the whole stage switches together. */
  thermal?: FloatUniform;
  /** Override the number of sparks. */
  sparks?: number;
};

export type OakFire = {
  group: THREE.Group;
  /** The fire's own light: warm, flickering. */
  light: THREE.PointLight;
  /** 0 is embers only, 1 a good fire, up to 1.5 when fresh oak catches. */
  setIntensity(v: number): void;
  update(t: number, dt: number): void;
  dispose(): void;
};

const SPARKS: Record<Quality, number> = { high: 520, medium: 300, low: 150 };
const FLAMES: Record<Quality, number> = { high: 34, medium: 24, low: 14 };

export function createOakFire(opts: OakFireOptions): OakFire {
  const layout = opts.layout ?? 'pile';
  const width = opts.width ?? (layout === 'pile' ? 2.4 : 0.9);
  const height = opts.height ?? (layout === 'pile' ? 0.9 : 1.25);
  const thermal = opts.thermal ?? floatUniform(0);
  const intensity = floatUniform(1);
  const group = new THREE.Group();
  group.name = 'oak-fire';
  const disposables: { dispose(): void }[] = [];
  const rand = mulberry(layout === 'pile' ? 7 : 11);

  // ------------------------------------------------------------------------------------------------------ logs
  const logGeo = splitLog(layout === 'pile' ? 0.085 : 0.075, layout === 'pile' ? 0.95 : width * 0.92, rand);
  const logCount = layout === 'pile' ? 9 : 7;
  const logMat = new THREE.MeshStandardNodeMaterial({ roughness: 1, metalness: 0 });
  {
    const seed = n(float(instanceIndex as never)).mul(7.31);
    const p = n(positionLocal).mul(vec3(10, 3.2, 10)).add(vec3(seed as never, n(seed).mul(0.37), 0));
    const drift = n(time).mul(0.06);
    const crack = n(pow(n(float(1)).sub(abs(mx_noise_float(n(p).add(vec3(0, drift as never, 0)) as never)) as never) as never, 14));
    const char = n(mx_noise_float(n(p).mul(2.3) as never)).mul(0.5).add(0.5);
    const breathe = n(sin(n(time).mul(1.7).add(n(seed).mul(3)) as never)).mul(0.25).add(0.75);
    // Hot patches where the cracks glow; elsewhere the char stays black.
    const patch = n(smoothstep(0.15, 0.75, n(mx_noise_float(n(n(p).mul(0.35)).add(vec3(n(seed).mul(0.2), n(time).mul(0.05), 0)) as never)).mul(0.5).add(0.5) as never));
    const heat = n(n(crack).mul(n(patch).mul(0.85).add(0.15)).mul(breathe).mul(intensity));
    const wood = n(mix(color('#060302'), color('#1a0f0a'), n(char).mul(0.6) as never));
    logMat.colorNode = n(wood).mul(n(float(1)).sub(thermal));
    const fireGlow = n(mix(color('#7a1a04'), color('#ffb347'), n(smoothstep(0.2, 0.9, heat as never)) as never)).mul(n(heat).mul(layout === 'pile' ? 7 : 4.6));
    const hot = n(inferno(n(float(0.62)).add(n(heat).mul(0.5)).add(n(char).mul(0.08)))).mul(scanlines());
    logMat.emissiveNode = n(mix(fireGlow as never, n(hot).mul(1.4) as never, thermal as never));
  }
  const logs = new THREE.InstancedMesh(logGeo, logMat, logCount);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  for (let i = 0; i < logCount; i++) {
    if (layout === 'pile') {
      // Two layers crossing, the top ones leaning in.
      const layer = i < 5 ? 0 : 1;
      const x = layer === 0 ? (i - 2) * (width / 5.2) : (i - 6.5) * (width / 3.6);
      e.set((rand() - 0.5) * 0.3, (layer === 0 ? 0.25 : -0.35) + (rand() - 0.5) * 0.5, Math.PI / 2 + (rand() - 0.5) * 0.15);
      q.setFromEuler(e);
      m4.compose(new THREE.Vector3(x, 0.07 + layer * 0.12, (rand() - 0.5) * 0.25), q, new THREE.Vector3(1, 1, 1));
    } else {
      // Stacked across the grate, slightly staggered.
      e.set((rand() - 0.5) * 0.12, (rand() - 0.5) * 0.18, Math.PI / 2 + (rand() - 0.5) * 0.06);
      q.setFromEuler(e);
      m4.compose(new THREE.Vector3((rand() - 0.5) * 0.06, 0.12 + i * (height / logCount), (rand() - 0.5) * 0.05), q, new THREE.Vector3(1, 1, 1));
    }
    logs.setMatrixAt(i, m4);
  }
  logs.instanceMatrix.needsUpdate = true;
  logs.castShadow = false;
  group.add(logs);
  disposables.push(logGeo, logMat);

  // ------------------------------------------------------------------------------------------------- ember bed
  const bedGeo = layout === 'pile' ? new THREE.CircleGeometry(1, 48) : new THREE.PlaneGeometry(1, 1, 1, 1);
  bedGeo.rotateX(-Math.PI / 2);
  const bedMat = new THREE.MeshStandardNodeMaterial({ roughness: 1, metalness: 0 });
  {
    const pp = n(vec2(positionLocal.x, positionLocal.z)).mul(layout === 'pile' ? 9 : 14);
    const c = n(cellular(n(pp).add(vec2(n(time).mul(0.03) as never, 0))));
    const coal = n(smoothstep(0.75, 0.05, c.x as never));
    const flick = n(mx_noise_float(vec3(n(pp).mul(0.5).x, n(pp).mul(0.5).y, n(time).mul(0.8)) as never)).mul(0.5).add(0.5);
    const edge = layout === 'pile' ? n(smoothstep(1.0, 0.25, n(vec2(positionLocal.x, positionLocal.z)).length() as never)) : n(float(1));
    const heat = n(n(coal).mul(n(flick).mul(0.8).add(0.3)).mul(edge).mul(intensity));
    bedMat.colorNode = n(color('#0a0605')).mul(n(float(1)).sub(thermal));
    const glow = n(mix(color('#5a1003'), color('#ff8a2a'), n(smoothstep(0.15, 0.8, heat as never)) as never)).mul(n(heat).mul(5.5));
    bedMat.emissiveNode = n(mix(glow as never, n(inferno(n(float(0.55)).add(n(heat).mul(0.45)))).mul(n(edge).mul(1.3)).mul(scanlines()) as never, thermal as never));
  }
  const bed = new THREE.Mesh(bedGeo, bedMat);
  if (layout === 'pile') bed.scale.set(width * 0.62, 1, 0.5);
  else bed.scale.set(width * 0.95, 1, 0.32);
  bed.position.y = 0.005;
  group.add(bed);
  disposables.push(bedGeo, bedMat);

  // ------------------------------------------------------------------------------------------------ the grate
  if (layout === 'wall') {
    const barGeo = new THREE.CylinderGeometry(0.008, 0.008, height + 0.25, 8);
    const barMat = new THREE.MeshPhysicalNodeMaterial({ color: '#1d1a19', metalness: 0.9, roughness: 0.45 });
    barMat.colorNode = n(color('#2b2624')).mul(n(float(1)).sub(thermal));
    barMat.emissiveNode = n(inferno(n(float(0.3)).add(n(smoothstep(0.0, 1.2, positionLocal.y as never)).mul(0.1)))).mul(thermal).mul(scanlines());
    const bars = new THREE.InstancedMesh(barGeo, barMat, 9);
    for (let i = 0; i < 9; i++) {
      m4.makeTranslation(-width / 2 + (i / 8) * width, (height + 0.25) / 2, 0.11);
      bars.setMatrixAt(i, m4);
    }
    bars.instanceMatrix.needsUpdate = true;
    group.add(bars);
    disposables.push(barGeo, barMat);
  }

  // ---------------------------------------------------------------------------------------------------- flames
  const flameCount = FLAMES[opts.quality];
  const flameData = new Float32Array(flameCount * 4);
  const flameSize = new Float32Array(flameCount * 2);
  for (let i = 0; i < flameCount; i++) {
    if (layout === 'pile') {
      // Clustered towards the middle of the pile, of very different heights, overlapping.
      const spread = (rand() + rand() + rand()) / 3 - 0.5;
      const middle = 1 - Math.abs(spread) * 1.6;
      flameData.set([spread * width * 1.15, 0.04 + rand() * 0.1, (rand() - 0.5) * 0.35, rand()], i * 4);
      flameSize.set([0.34 + rand() * 0.42, height * (0.35 + rand() * 0.55 + middle * 0.35)], i * 2);
    } else {
      flameData.set([(rand() - 0.5) * width * 0.8, 0.05 + rand() * height * 0.75, 0.04 + rand() * 0.1, rand()], i * 4);
      flameSize.set([0.2 + rand() * 0.2, 0.3 + rand() * 0.42], i * 2);
    }
  }
  const flameAttr = new THREE.InstancedBufferAttribute(flameData, 4);
  const sizeAttr = new THREE.InstancedBufferAttribute(flameSize, 2);
  const flameMat = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  {
    const inst = n(instancedBufferAttribute(flameAttr as never));
    const size = n(instancedBufferAttribute(sizeAttr as never));
    const seed = n(inst.w);
    flameMat.positionNode = vec3(inst.x, inst.y, inst.z);
    const tall = n(mix(float(0.55), float(1.15), n(clamp(intensity as never, 0, 1.4)).div(1.4) as never));
    flameMat.scaleNode = vec2(size.x, n(size.y).mul(tall));
    const fuv = n(uv());
    const tt = n(n(time).mul(n(seed).mul(0.5).add(0.9))).add(n(seed).mul(31));
    const n1 = n(mx_noise_float(vec3(n(fuv.x).mul(2.6), n(n(fuv.y).mul(1.8)).sub(n(tt).mul(1.9)), n(seed).mul(7))));
    const n2 = n(mx_noise_float(vec3(n(fuv.x).mul(6.4), n(n(fuv.y).mul(4.6)).sub(n(tt).mul(3.6)), n(seed).mul(13).add(3))));
    const turb = n(n(n1).mul(0.65)).add(n(n2).mul(0.35));
    const y = n(fuv.y);
    // The body sways more the higher it goes, narrows towards the tip and tears into tongues.
    const x = n(n(fuv.x).sub(0.5)).add(n(n(turb).mul(0.2)).mul(y));
    const halfWidth = n(mix(float(0.33), float(0.02), n(pow(y, 0.72))));
    const body = n(float(1)).sub(n(smoothstep(n(halfWidth).mul(0.12), halfWidth, abs(x))));
    const lift = n(n(y).add(n(turb).mul(0.22)));
    const vertical = n(n(smoothstep(0.0, 0.08, y)).mul(n(float(1)).sub(n(smoothstep(0.22, 0.95, lift)))));
    const tongues = n(n(n(n(n2).mul(0.5)).add(0.5)).mul(y)).mul(0.65);
    const heat = n(clamp(n(n(n(body).mul(vertical)).mul(n(n(n1).mul(0.35)).add(0.95))).sub(tongues), 0, 1.2));
    const core = n(smoothstep(0.55, 1.0, heat));
    // Saturated: deep red at the edges, orange, a yellow core; kept below white so tone mapping leaves it fire-coloured.
    const warm = n(mix(color('#6a1000'), color('#ff4a00'), n(smoothstep(0.04, 0.42, heat))));
    const hot = n(mix(warm, color('#ff9800'), core));
    const white = n(mix(hot, color('#ffc85a'), n(smoothstep(0.85, 1.12, heat))));
    const alpha = n(n(smoothstep(0.06, 0.5, heat))).mul(0.82);
    const strength = n(clamp(n(intensity), 0, 1.5));
    flameMat.colorNode = vec3(0, 0, 0);
    const normal = n(white).mul(n(n(heat).mul(1.35)).mul(strength));
    const hotThermal = n(inferno(n(float(0.72)).add(n(heat).mul(0.32)))).mul(n(heat).mul(1.9)).mul(scanlines());
    glowOf(flameMat).emissiveNode = n(mix(normal as never, hotThermal as never, thermal as never));
    flameMat.opacityNode = n(alpha).mul(n(clamp(n(strength).mul(1.2) as never, 0, 1)));
  }
  const flames = new THREE.Sprite(flameMat);
  flames.count = flameCount;
  flames.center.set(0.5, 0.02);
  flames.frustumCulled = false;
  flames.renderOrder = 2;
  group.add(flames);
  disposables.push(flameMat);

  // ---------------------------------------------------------------------------------------------------- sparks
  const sparkCount = opts.sparks ?? SPARKS[opts.quality];
  const sparkMat = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const sparkRise = floatUniform(layout === 'pile' ? 2.6 : 1.9);
  {
    const id = n(float(instanceIndex as never));
    const h1 = n(hash(id as never));
    const h2 = n(hash(n(id).add(101) as never));
    const h3 = n(hash(n(id).add(211) as never));
    const h4 = n(hash(n(id).add(331) as never));
    const rate = n(n(h4).mul(0.18)).add(0.12);
    const life = n(fract(n(n(time).mul(rate)).add(h1) as never));
    const cycle = n(floor(n(n(time).mul(rate)).add(h1) as never));
    // A new place every cycle, so the stream never repeats visibly.
    const re = n(hash(n(n(cycle).mul(17.7)).add(id) as never));
    const sx = layout === 'pile' ? n(n(n(re).sub(0.5)).mul(width * 0.9)) : n(n(n(re).sub(0.5)).mul(width * 0.75));
    const sz = n(n(n(h3).sub(0.5)).mul(layout === 'pile' ? 0.35 : 0.25));
    const rise = n(n(pow(life as never, 0.8)).mul(sparkRise).mul(n(n(h2).mul(0.6)).add(0.7)));
    const swayT = n(n(time).mul(n(n(h2).mul(1.4)).add(0.6))).add(n(h1).mul(30));
    const sway = n(n(sin(swayT as never)).mul(n(life).mul(0.22)));
    const curl = n(n(cos(n(swayT).mul(0.7) as never)).mul(n(life).mul(0.12)));
    const baseY = layout === 'pile' ? 0.15 : n(n(h3).mul(height * 0.8)).add(0.1);
    sparkMat.positionNode = vec3(n(sx).add(sway), n(rise).add(baseY as never), n(n(sz).add(curl)).add(layout === 'wall' ? 0.12 : 0));
    const sizeBase = n(n(n(h2).mul(0.012)).add(0.006));
    const fade = n(n(smoothstep(0.0, 0.06, life as never)).mul(n(float(1)).sub(n(smoothstep(0.55, 1.0, life as never)))));
    sparkMat.scaleNode = vec2(sizeBase, sizeBase);
    const flick = n(n(sin(n(n(time).mul(n(n(h4).mul(20)).add(14))).add(n(h1).mul(50)) as never)).mul(0.35)).add(0.65);
    const sparkCol = n(mix(color('#ffd27a'), color('#ff4a0c'), n(smoothstep(0.0, 0.6, life as never)) as never));
    const disc = n(float(1)).sub(n(smoothstep(0.15, 0.5, n(n(uv()).sub(0.5)).length() as never)));
    const amount = n(n(fade).mul(flick).mul(disc).mul(n(clamp(intensity as never, 0.15, 1.5))));
    sparkMat.colorNode = vec3(0, 0, 0);
    glowOf(sparkMat).emissiveNode = n(mix(n(sparkCol).mul(n(amount).mul(9)) as never, n(inferno(n(float(0.95)).sub(n(life).mul(0.4)))).mul(n(amount).mul(3)) as never, thermal as never));
    sparkMat.opacityNode = amount;
  }
  const sparks = new THREE.Sprite(sparkMat);
  sparks.count = sparkCount;
  sparks.frustumCulled = false;
  sparks.renderOrder = 3;
  group.add(sparks);
  disposables.push(sparkMat);

  // ----------------------------------------------------------------------------------------------------- light
  const light = new THREE.PointLight('#ff7a32', 6, layout === 'pile' ? 7 : 4, 1.7);
  light.position.set(0, layout === 'pile' ? 0.45 : height * 0.5, layout === 'pile' ? 0.15 : 0.26);
  group.add(light);
  let base = 1;

  return {
    group,
    light,
    setIntensity(v: number) {
      base = Math.max(0, Math.min(1.5, v));
    },
    update(t: number, dt: number) {
      // Ease towards the target, so a log going on swells rather than jumps.
      intensity.value += (base - intensity.value) * Math.min(1, dt * 1.8);
      const flicker = 0.82 + 0.1 * Math.sin(t * 13.1) + 0.06 * Math.sin(t * 27.7 + 1.3) + 0.05 * Math.sin(t * 5.3);
      light.intensity = (layout === 'pile' ? 7.5 : 1.9) * intensity.value * flicker * (1 - thermal.value * 0.85);
      light.position.x = Math.sin(t * 2.3) * 0.04;
    },
    dispose() {
      for (const d of disposables) d.dispose();
      logs.dispose();
      group.removeFromParent();
    },
  };
}

/** A split oak log: a rough, slightly flattened cylinder with uneven ends. */
function splitLog(radius: number, length: number, rand: () => number): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(radius, radius * 0.92, length, 9, 8, false);
  const p = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const a = Math.atan2(v.z, v.x);
    // One flat split face, bark bumps, and ends that are not quite square.
    const flat = Math.cos(a - 1.1) > 0.55 ? 0.72 : 1;
    const bump = 1 + 0.08 * Math.sin(a * 5 + v.y * 9) + 0.05 * (rand() - 0.5);
    v.x *= flat * bump;
    v.z *= flat * bump;
    if (Math.abs(v.y) > length / 2 - 1e-4) v.y += (rand() - 0.5) * radius * 0.6;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

