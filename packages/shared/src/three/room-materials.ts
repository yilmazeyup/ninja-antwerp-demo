import * as THREE from 'three/webgpu';
import { abs, clamp, color, float, floor, fract, fwidth, hash, min, mix, positionWorld, pow, sin, smoothstep, texture, time, uv, vec2, vertexColor } from 'three/tsl';

import { noiseTexture } from './noise';

// The materials of Ninja's room, procedural on the GPU (TSL) from one small mipmapped noise texture, so nothing has to
// be downloaded, shaders stay small and nothing shimmers from afar: travertine with its bedding and pores, red walnut
// slats, oxblood leather with sheen and clearcoat, chrome, black lacquer, a polished terrazzo floor, glazed oxblood
// tiles behind the fire, wet bricks on the quay.

/** The shared noise at a uv: r clouds, g grain, b cells, a ridges (see noise.ts). */
export const noise = (at: THREE.Node<'vec2'>) => texture(noiseTexture(), at);

/** 1 where an analytic pattern (joints, grout, lines) is resolvable, fading to 0 where it would alias. */
const detail = (scale: number) => smoothstep(0.35, 0.12, fwidth(positionWorld.x.add(positionWorld.z)).mul(scale));

/** Materials that are drawn on top (glass, fire, glow): the panel's effects pipeline keeps them out of its buffers. */
export const fx = <M extends THREE.Material>(m: M): M => {
  m.userData.fx = true;
  return m;
};

const cache = new Map<string, THREE.Material>();
const cached = <M extends THREE.Material>(key: string, make: () => M): M => {
  const hit = cache.get(key) as M | undefined;
  if (hit) return hit;
  const m = make();
  cache.set(key, m);
  m.addEventListener('dispose', () => cache.delete(key));
  return m;
};

// ------------------------------------------------------------------------------------------------------- stone

/** Honed travertine: warm bone with its bedding along the slab, darker veins and the small pores it is known for. */
export function travertine(tint = '#EEE4D4', deep = '#CDB89A') {
  return cached(`trav-${tint}-${deep}`, () => {
    const m = new THREE.MeshStandardNodeMaterial({ metalness: 0, roughness: 0.6 });
    const p = positionWorld;
    const bed = noise(vec2(p.x.mul(0.09).add(p.z.mul(0.02)), p.z.add(p.y).mul(0.85)));
    const veins = noise(vec2(p.x.mul(0.05), p.z.add(p.y).mul(0.32)).add(0.37)).a;
    const pores = smoothstep(0.16, 0.05, noise(p.xz.add(p.y).mul(0.6).add(0.5)).b);
    const base = mix(color(deep), color(tint), smoothstep(0.25, 0.75, bed.r).mul(0.8).add(bed.g.mul(0.2)));
    m.colorNode = mix(mix(base, color('#A88E70'), smoothstep(0.55, 0.95, veins).mul(0.5)), color('#8C7459'), pores.mul(0.7));
    m.roughnessNode = float(0.55).add(pores.mul(0.3));
    return m;
  });
}

/** The cream stone of the facade's pilasters and the oven's plaster: finer, chalkier. */
export function limestone(tint = '#DED1BE') {
  return cached(`lime-${tint}`, () => {
    const m = new THREE.MeshStandardNodeMaterial({ metalness: 0, roughness: 0.8 });
    const p = positionWorld;
    const n = noise(vec2(p.x.add(p.z).mul(0.35), p.y.mul(0.35)));
    m.colorNode = mix(color(tint).mul(0.88), color(tint).mul(1.04), n.r.mul(0.7).add(n.g.mul(0.3)));
    return m;
  });
}

/** Polished terrazzo in warm black, with travertine and oxblood chips: it mirrors the fire. */
export function terrazzo() {
  return cached('terrazzo', () => {
    const m = new THREE.MeshPhysicalNodeMaterial({ metalness: 0, roughness: 0.2, clearcoat: 0.6, clearcoatRoughness: 0.1 });
    const p = positionWorld.xz;
    const a = noise(p.mul(0.42));
    const b = noise(p.mul(1.31).add(0.21));
    const cloud = noise(p.mul(0.05)).r;
    const chipA = smoothstep(0.2, 0.12, a.b);
    const chipB = smoothstep(0.16, 0.08, b.b);
    const base = mix(color('#17110E'), color('#2E231E'), cloud);
    m.colorNode = mix(mix(base, mix(color('#4F4136'), color('#8C7B66'), a.r), chipA.mul(0.42)), mix(color('#3A100D'), color('#62221A'), b.r), chipB.mul(0.4));
    m.roughnessNode = float(0.16).add(cloud.mul(0.12));
    return m;
  });
}

// --------------------------------------------------------------------------------------------------------- wood

/** Red walnut, satin lacquered: the grain runs along the slats (up the wall). */
export function walnut(dark = '#2B120A', light = '#74391F') {
  return cached(`walnut-${dark}-${light}`, () => {
    const m = new THREE.MeshStandardNodeMaterial({ metalness: 0, roughness: 0.48 });
    const p = positionWorld;
    const g = noise(vec2(p.x.add(p.z).mul(3.2), p.y.mul(0.07)));
    const fine = noise(vec2(p.x.add(p.z).mul(14.0), p.y.mul(0.3))).g;
    m.colorNode = mix(color(dark), color(light), clamp(g.r.mul(0.75).add(fine.mul(0.35)).sub(0.08), 0, 1));
    m.roughnessNode = float(0.44).add(fine.mul(0.1));
    return m;
  });
}

/** Dark oiled oak: the terrace deck and the bar's island. */
export function oak(dark = '#1E140F', light = '#4A3322') {
  return cached(`oak-${dark}-${light}`, () => {
    const m = new THREE.MeshStandardNodeMaterial({ metalness: 0, roughness: 0.62 });
    const p = positionWorld;
    const g = noise(vec2(p.x.mul(0.08), p.z.add(p.y).mul(2.6)));
    m.colorNode = mix(color(dark), color(light), g.r.mul(0.7).add(g.g.mul(0.3)));
    return m;
  });
}

// ------------------------------------------------------------------------------------------------------ leather

/** Oxblood leather: soft mottling, a fine grain, sheen at grazing angles and a thin clearcoat. */
export function leather(dark = '#3E0E0B', light = '#7E2018') {
  return cached(`leather-${dark}-${light}`, () => {
    const m = new THREE.MeshPhysicalNodeMaterial({
      metalness: 0,
      roughness: 0.42,
      clearcoat: 0.35,
      clearcoatRoughness: 0.36,
      sheen: 0.8,
      sheenRoughness: 0.42,
      sheenColor: new THREE.Color('#E8A07E'),
    });
    const p = positionWorld;
    const n = noise(vec2(p.x.add(p.z).mul(0.6), p.y.add(p.z).mul(0.6)));
    const grain = noise(vec2(p.x.add(p.z).mul(6.0), p.y.mul(6.0))).g;
    m.colorNode = mix(color(dark), color(light), n.r).mul(grain.mul(0.1).add(0.95));
    m.roughnessNode = float(0.38).add(grain.mul(0.08)).add(n.r.mul(0.06));
    return m;
  });
}

// -------------------------------------------------------------------------------------------------------- metal

export function chrome(roughness = 0.07) {
  return cached(`chrome-${roughness}`, () => new THREE.MeshPhysicalNodeMaterial({ color: '#F1F3F6', metalness: 1, roughness, specularIntensity: 1 }));
}

/** Brushed stainless steel: the kitchen, the hood, the pass. */
export function steel(tint = '#B9BEC4') {
  return cached(`steel-${tint}`, () => {
    const m = new THREE.MeshStandardNodeMaterial({ color: tint, metalness: 1, roughness: 0.3 });
    const p = positionWorld;
    m.roughnessNode = float(0.25).add(noise(vec2(p.x.add(p.z).mul(0.3), p.y.mul(24))).g.mul(0.1));
    return m;
  });
}

export function blackSteel() {
  return cached('black-steel', () => new THREE.MeshStandardNodeMaterial({ color: '#17110F', metalness: 0.85, roughness: 0.36 }));
}

export function brass() {
  return cached('brass', () => new THREE.MeshStandardNodeMaterial({ color: '#C99C58', metalness: 1, roughness: 0.22 }));
}

// ------------------------------------------------------------------------------------------------------ lacquer

/** Piano lacquer: clearcoat 1. */
export function lacquer(tint = '#0A0706', roughness = 0.24) {
  return cached(`lacquer-${tint}-${roughness}`, () => new THREE.MeshPhysicalNodeMaterial({ color: tint, metalness: 0, roughness, clearcoat: 1, clearcoatRoughness: 0.03 }));
}

/** The wall behind the slats: dark plaster, matte. */
export function plaster(tint = '#17110E') {
  return cached(`plaster-${tint}`, () => {
    const m = new THREE.MeshStandardNodeMaterial({ metalness: 0, roughness: 0.9 });
    const p = positionWorld;
    m.colorNode = color(tint).mul(noise(vec2(p.x.add(p.z).mul(0.2), p.y.mul(0.2))).r.mul(0.3).add(0.85));
    return m;
  });
}

// --------------------------------------------------------------------------------------------------------- tile

/** Glazed oxblood tiles in running bond, as on the wall behind Ninja's counter: on any wall (they follow x + z, and y). */
export function tiles() {
  return cached('tiles', () => {
    const m = new THREE.MeshPhysicalNodeMaterial({ metalness: 0, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.06 });
    const tw = 0.3;
    const th = 0.075;
    const q = vec2(positionWorld.x.add(positionWorld.z), positionWorld.y);
    const row = floor(q.y.div(th));
    const x = q.x.add(fract(row.mul(0.5)).mul(tw));
    const col = floor(x.div(tw));
    const fx = fract(x.div(tw));
    const fy = fract(q.y.div(th));
    const edge = min(min(fx, fx.oneMinus()).mul(tw), min(fy, fy.oneMinus()).mul(th));
    const grout = smoothstep(0.0032, 0.0014, edge).mul(detail(30));
    const h = hash(row.mul(131).add(col.mul(17)));
    const glaze = noise(q.mul(0.9)).g;
    const tile = mix(color('#3F0B09'), color('#7A231B'), h.mul(0.55).add(glaze.mul(0.45)));
    m.colorNode = mix(tile, color('#1A100D'), grout);
    m.roughnessNode = mix(float(0.09).add(h.mul(0.12)), float(0.9), grout);
    m.clearcoatNode = grout.oneMinus();
    return m;
  });
}

// -------------------------------------------------------------------------------------------------------- glass

export function glass(opacity = 0.1, tint = '#9DB2B2') {
  return cached(`glass-${opacity}-${tint}`, () =>
    fx(new THREE.MeshStandardNodeMaterial({ color: tint, metalness: 0, roughness: 0.03, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide })),
  );
}

/** Garlic, chili, lemons and the cords they hang on: one glossy material, the colour per piece (instance colour). */
export function produce() {
  return cached('produce', () => new THREE.MeshStandardNodeMaterial({ color: '#ffffff', metalness: 0, roughness: 0.42 }));
}

/** Bottles at the bar: opaque glossy glass, coloured per bottle. */
export function bottleGlass() {
  return cached('bottle', () => new THREE.MeshStandardNodeMaterial({ metalness: 0, roughness: 0.08 }));
}

// ------------------------------------------------------------------------------------------------------ outside

/** Belgian clinker bricks in running bond, wet after the rain: puddles mirror the lamps. */
export function wetBricks() {
  return cached('bricks', () => {
    const m = new THREE.MeshStandardNodeMaterial({ metalness: 0, roughness: 0.4 });
    const bw = 0.21;
    const bh = 0.07;
    const p = positionWorld;
    const row = floor(p.z.div(bh));
    const x = p.x.add(fract(row.mul(0.5)).mul(bw));
    const col = floor(x.div(bw));
    const fx = fract(x.div(bw));
    const fy = fract(p.z.div(bh));
    const edge = min(min(fx, fx.oneMinus()).mul(bw), min(fy, fy.oneMinus()).mul(bh));
    const joint = smoothstep(0.006, 0.003, edge).mul(detail(14));
    const h = hash(row.mul(57).add(col.mul(13)));
    const puddle = smoothstep(0.42, 0.62, noise(p.xz.mul(0.045)).r);
    const brick = mix(color('#3A2019'), color('#6E3D2C'), h);
    m.colorNode = mix(brick, color('#1C1512'), joint.mul(0.8)).mul(mix(float(0.92), float(0.55), puddle));
    m.roughnessNode = mix(mix(float(0.36).add(h.mul(0.16)), float(0.05), puddle), float(0.7), joint.mul(puddle.oneMinus()));
    return m;
  });
}

/** The road: dark asphalt, wet, with the dashed centre line. */
export function asphalt(lineZ: number) {
  return cached(`asphalt-${lineZ}`, () => {
    const m = new THREE.MeshStandardNodeMaterial({ metalness: 0, roughness: 0.32 });
    const p = positionWorld;
    const grit = noise(p.xz.mul(1.6)).g;
    const puddle = smoothstep(0.45, 0.68, noise(p.xz.mul(0.035).add(0.3)).r);
    const dash = smoothstep(0.075, 0.06, abs(p.z.sub(lineZ))).mul(smoothstep(0.55, 0.5, fract(p.x.div(4.5))));
    m.colorNode = mix(mix(color('#0E0C0B'), color('#1A1714'), grit), color('#BDB4A6'), dash.mul(0.85)).mul(mix(float(1), float(0.7), puddle));
    m.roughnessNode = mix(float(0.34).add(grit.mul(0.08)), float(0.05), puddle.mul(dash.oneMinus()));
    return m;
  });
}

export function granite() {
  return cached('granite', () => {
    const m = new THREE.MeshStandardNodeMaterial({ metalness: 0, roughness: 0.5 });
    m.colorNode = mix(color('#3B3936'), color('#5D5A55'), noise(positionWorld.xz.add(positionWorld.y).mul(3)).g);
    return m;
  });
}

/** A plane tree's bark: grey, olive and cream patches. */
export function bark() {
  return cached('bark', () => {
    const m = new THREE.MeshStandardNodeMaterial({ metalness: 0, roughness: 0.85 });
    const p = positionWorld;
    const w = noise(vec2(p.x.add(p.z).mul(0.5), p.y.mul(0.3))).b;
    m.colorNode = mix(mix(color('#57533F'), color('#A49E80'), smoothstep(0.15, 0.45, w)), color('#3A3628'), smoothstep(0.7, 0.95, w).mul(0.6));
    return m;
  });
}

/** Leaves on the quay at the end of October: per cluster (instance colour), a little variation inside. */
export function foliage() {
  return cached('foliage', () => {
    const m = new THREE.MeshStandardNodeMaterial({ metalness: 0, roughness: 0.82 });
    const p = positionWorld;
    m.colorNode = mix(color('#6F6A48'), color('#C7BE8E'), noise(p.xz.add(p.y).mul(0.7)).r);
    return m;
  });
}

export function boxwood() {
  return cached('boxwood', () => {
    const m = new THREE.MeshStandardNodeMaterial({ metalness: 0, roughness: 0.9 });
    m.colorNode = mix(color('#0B120A'), color('#1A2814'), noise(positionWorld.xz.add(positionWorld.y).mul(2)).g);
    return m;
  });
}

// ---------------------------------------------------------------------------------------------------------- glow

/** Light itself: a colour above 1, so the bloom picks it up. Unlit. */
export function glow(hex: string, strength = 3) {
  return cached(`glow-${hex}-${strength}`, () => fx(new THREE.MeshBasicNodeMaterial({ colorNode: color(hex).mul(strength) })));
}

/** An opal globe or an LED strip that breathes very slightly. */
export function breathingGlow(hex: string, strength = 3, speed = 0.6) {
  return cached(`breath-${hex}-${strength}-${speed}`, () => fx(new THREE.MeshBasicNodeMaterial({ colorNode: color(hex).mul(float(strength).mul(sin(time.mul(speed)).mul(0.04).add(0.98))) })));
}

/**
 * Light itself (LED strips, opal globes, the bar's ring, lamp heads, candle flames): one unlit material for all of them,
 * the colour times its strength baked into each geometry's vertex colours with `paintLight`, above 1 for the bloom.
 */
export function lightMaterial() {
  return cached('light', () => fx(new THREE.MeshBasicNodeMaterial({ colorNode: vertexColor().mul(sin(time.mul(0.45)).mul(0.025).add(0.985)) })));
}

/** Bakes a light's colour and strength into a geometry (for `lightMaterial` and `poolMaterial`). */
export function paintLight<G extends THREE.BufferGeometry>(g: G, hex: string, strength: number): G {
  const c = new THREE.Color(hex).multiplyScalar(strength);
  const n = g.getAttribute('position').count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    a[i * 3] = c.r;
    a[i * 3 + 1] = c.g;
    a[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}

const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 } as const;

/**
 * A pool of light laid on a surface (a candle on travertine, a lamp on the bricks): a soft radial falloff, added to
 * what is there. Cheaper than a light and just as convincing from above.
 */
export function pool(hex: string, strength = 1, falloff = 2.2, flicker = 0) {
  return cached(`pool-${hex}-${strength}-${falloff}-${flicker}`, () => {
    const d = uv().sub(0.5).length().mul(2);
    const f = pow(clamp(d.oneMinus(), 0, 1), float(falloff));
    const wobble = flicker > 0 ? noise(vec2(time.mul(0.9), 0.31)).r.sub(0.5).mul(flicker * 2).add(1) : float(1);
    return fx(new THREE.MeshBasicNodeMaterial({ colorNode: color(hex).mul(f.mul(strength).mul(wobble)), ...additive }));
  });
}

/** A pool of light whose colour and strength are painted on its plane (`paintLight`): one material for them all. */
export function poolMaterial(flicker = false) {
  return cached(`pool-shared-${flicker}`, () => {
    const d = uv().sub(0.5).length().mul(2);
    const f = pow(clamp(d.oneMinus(), 0, 1), float(2.2));
    const wobble = flicker ? noise(vec2(time.mul(0.9), 0.31)).r.sub(0.5).mul(0.28).add(1) : float(1);
    return fx(new THREE.MeshBasicNodeMaterial({ colorNode: vertexColor().mul(f.mul(wobble)), ...additive }));
  });
}

/** A soft ring of light (the bar's halo on the floor): bright at radius `r` of the plane (0–0.5). */
export function ringPool(hex: string, strength = 1, r = 0.42, width = 0.07) {
  return cached(`ring-${hex}-${strength}-${r}-${width}`, () => {
    const d = uv().sub(0.5).length();
    const f = smoothstep(width, 0, abs(d.sub(r)));
    return fx(new THREE.MeshBasicNodeMaterial({ colorNode: color(hex).mul(f.mul(f).mul(strength)), ...additive }));
  });
}

/** Fabric for the figures: the colour comes per person (instance colour). */
export function cloth(roughness = 0.68, vertexColors = false) {
  return cached(`cloth-${roughness}-${vertexColors}`, () => {
    const m = new THREE.MeshStandardNodeMaterial({ color: '#ffffff', metalness: 0, roughness });
    m.vertexColors = vertexColors;
    return m;
  });
}

export function skin() {
  return cached('skin', () => new THREE.MeshStandardNodeMaterial({ color: '#ffffff', metalness: 0, roughness: 0.5 }));
}

/** A 2D noise sample that scrolls with time (flames, embers in logs). */
export const flowingNoise = (at: THREE.Node<'vec2'>, speed: number) => noise(at.add(vec2(0, time.mul(-speed))));

