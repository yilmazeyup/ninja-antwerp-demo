// Leather in TSL: the pebble grain of Ninja's puffy logo as a procedural normal (cellular noise with an analytic
// gradient, so it stays crisp at any distance), and the materials made from it: oxblood leather with a lacquer coat,
// bone leather and the dark piping. Shared by the 3D wordmark and anything else that wants Ninja's leather.

import * as THREE from 'three/webgpu';
import { add, clamp, color, dot, float, floor, Fn, fract, fwidth, If, mix, mx_noise_float, normalize, normalLocal, positionLocal, sin, smoothstep, transformNormalToView, uniform, vec2, vec3 } from 'three/tsl';

import type { Quality } from './renderer';

type N = THREE.Node;
// TSL's typings are stricter than its runtime; shader code below passes nodes around as plain `Node`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TSL's chained node API is typed far stricter than it runs.
const n = (x: unknown): any => x;

const hash22 = (p: N) =>
  n(fract(n(sin(vec2(dot(p as never, vec2(127.1, 311.7)), dot(p as never, vec2(269.5, 183.3))))).mul(43758.5453)));

/**
 * Cellular (Worley) noise in 2D: x is the squared distance to the nearest cell centre, yz the vector to it. The grain's
 * height is 1 − F1², domes with creases where they meet; its gradient is simply 2·(centre − p).
 */
export function cellular(p: N): N {
  return Fn(() => {
    const ip = n(floor(p as never)).toVar();
    const fp = n(fract(p as never)).toVar();
    const best = n(float(9)).toVar();
    const toward = n(vec2(0, 0)).toVar();
    for (let j = -1; j <= 1; j++) {
      for (let i = -1; i <= 1; i++) {
        const g = vec2(i, j);
        const o = n(hash22(n(ip).add(g))).mul(0.78).add(0.11);
        const r = n(n(g).add(o)).sub(fp).toVar();
        const d = n(dot(r as never, r as never));
        If(n(d).lessThan(best) as never, () => {
          n(best).assign(d);
          n(toward).assign(r);
        });
      }
    }
    return vec3(best as never, toward as never);
  })() as unknown as N;
}

export type GrainOptions = {
  /** Cells per unit of object space. */
  scale: number;
  /** How far the normal tilts at a crease. */
  strength: number;
  /** A second, finer octave. */
  fine?: boolean;
  /** Optional object-space normal to start from (defaults to the geometry's). */
  normal?: N;
  /** Seed offset so different parts do not share a grain. */
  offset?: number;
};

export type Grain = {
  /** The perturbed normal in view space, for `normalNode`. */
  normal: N;
  /** A gentler one for the lacquer coat, so its highlights show the grain. */
  coat: N;
  /** 0 on a pebble's dome, 1 in a crease: for darker, rougher creases. */
  crease: N;
};

/** Pebble-grain leather on a surface that faces ±z (a logo, a tag): grain projected on the object's xy plane. */
export function pebbleGrain(opts: GrainOptions): Grain {
  const base = opts.normal ?? normalLocal;
  const p = n(positionLocal.xy).mul(opts.scale).add(opts.offset ?? 0);
  // Level of detail: as a pebble shrinks towards a pixel, its relief fades out instead of turning to noise.
  const fw = n(n(fwidth(n(p).x)).add(fwidth(n(p).y)));
  const fade1 = n(float(1)).sub(n(smoothstep(0.5, 1.25, fw)));
  const fade2 = n(float(1)).sub(n(smoothstep(0.21, 0.53, fw)));
  const c1 = n(cellular(p));
  let gx: N = n(c1.y).mul(2 * opts.strength).mul(fade1);
  let gy: N = n(c1.z).mul(2 * opts.strength).mul(fade1);
  const crease = n(smoothstep(0.2, 0.62, c1.x as never)).mul(n(fade1).mul(0.7).add(0.3));
  if (opts.fine) {
    const c2 = n(cellular(n(p).mul(2.37).add(17.3)));
    gx = n(add(gx as never, n(c2.y).mul(0.55 * opts.strength).mul(fade2)));
    gy = n(add(gy as never, n(c2.z).mul(0.55 * opts.strength).mul(fade2)));
  }
  const N0 = n(normalize(base as never)).toVar();
  const g = n(vec3(gx as never, gy as never, 0));
  const tangential = n(g.sub(n(N0).mul(dot(N0 as never, g as never))));
  const bent = n(normalize(n(N0).sub(tangential) as never));
  const soft = n(normalize(n(N0).sub(n(tangential).mul(0.25)) as never));
  return { normal: n(transformNormalToView(bent as never)), coat: n(transformNormalToView(soft as never)), crease };
}

export type LeatherKind = 'oxblood' | 'bone' | 'piping';

export type LeatherMaterialOptions = {
  kind: LeatherKind;
  quality: Quality;
  /** Object-space normal override (the logo inflates its normals). */
  normal?: N;
  /** Extra darkening (0–1 ambient occlusion) multiplied into the colour. */
  occlusion?: N;
  /** A 0–1 lightness from the shape: domes lighter, seams darker. */
  lift?: N;
};

/** Ninja's leather: physically based, with sheen, a lacquer clearcoat and the pebble grain. */
export function leatherMaterial(opts: LeatherMaterialOptions): THREE.MeshPhysicalNodeMaterial {
  const fine = opts.quality !== 'low';
  const m = new THREE.MeshPhysicalNodeMaterial();
  const mottle = n(n(mx_noise_float(n(positionLocal).mul(vec3(2.6, 2.6, 2.6)) as never)).mul(0.5).add(0.5));
  const occl: N = opts.occlusion ?? float(1);
  const lift: N = opts.lift ?? float(0.5);
  if (opts.kind === 'oxblood') {
    const grain = pebbleGrain({ scale: 118, strength: 0.17, fine, normal: opts.normal });
    const tone = n(clamp(n(n(lift).mul(0.6)).add(n(mottle).mul(0.4)) as never, 0, 1));
    const deep = color('#2a0905');
    const mid = color('#4a140c');
    const lit = color('#732619');
    const body = n(mix(n(mix(deep, mid, n(smoothstep(0.0, 0.5, tone as never)) as never)), lit, n(smoothstep(0.5, 1.0, tone as never)) as never));
    m.colorNode = n(body).mul(n(float(1)).sub(n(grain.crease).mul(0.3))).mul(occl);
    m.roughnessNode = n(mix(float(0.34), float(0.58), grain.crease as never));
    m.normalNode = grain.normal;
    m.clearcoat = 0.9;
    m.clearcoatRoughness = 0.12;
    m.clearcoatNormalNode = grain.coat;
    m.sheen = 0.22;
    m.sheenRoughness = 0.55;
    m.sheenColor = new THREE.Color('#8a3a28');
    m.specularIntensity = 0.5;
  } else if (opts.kind === 'bone') {
    const grain = pebbleGrain({ scale: 150, strength: 0.16, fine, normal: opts.normal, offset: 41 });
    const body = n(mix(color('#d9ccb8'), color('#efe6d8'), n(clamp(n(mottle).mul(0.7).add(0.15) as never, 0, 1)) as never));
    m.colorNode = n(body).mul(n(float(1)).sub(n(grain.crease).mul(0.1))).mul(occl);
    m.roughnessNode = n(mix(float(0.5), float(0.7), grain.crease as never));
    m.normalNode = grain.normal;
    m.clearcoat = 0.32;
    m.clearcoatRoughness = 0.32;
    m.clearcoatNormalNode = grain.coat;
    m.sheen = 0.35;
    m.sheenRoughness = 0.6;
    m.sheenColor = new THREE.Color('#fff1dc');
  } else {
    const grain = pebbleGrain({ scale: 170, strength: 0.18, fine: false, normal: opts.normal, offset: 7 });
    m.colorNode = n(mix(color('#2b0c08'), color('#4a170f'), mottle as never)).mul(occl);
    m.roughness = 0.38;
    m.normalNode = grain.normal;
    m.clearcoat = 0.7;
    m.clearcoatRoughness = 0.18;
    m.clearcoatNormalNode = grain.coat;
    m.sheen = 0.4;
    m.sheenRoughness = 0.5;
    m.sheenColor = new THREE.Color('#b0583f');
  }
  return m;
}

/** A float uniform, typed for TSL use. */
export const floatUniform = (value: number) => uniform(value) as unknown as N & { value: number };
