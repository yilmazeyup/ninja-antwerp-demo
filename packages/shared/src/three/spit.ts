// The spit: a vertical döner on its steel skewer, turning slowly before Ninja's open oak fire. The meat is a layered
// cone (beef with veal and lamb, or chicken), browned and crisp on the side the fire has just passed, with fat that
// catches the light; carving leaves a pale, glistening face that browns again as it turns back past the fire. The
// sensors drive it: the scale sets the size, the crust and core set the colour, the fire sets the flames.
// `setThermal(true)` turns the stage into the infrared camera's view.
//
//   const spit = createSpit({ quality, kind: 'rund' });
//   scene.add(spit.group); spit.setReading(spitAt(ev, 'rund', minute));  …  spit.update(t, dt);  …  spit.dispose();

import * as THREE from 'three/webgpu';
import {
  abs,
  attribute,
  clamp,
  color,
  dot,
  float,
  floor,
  fract,
  int,
  max,
  mix,
  mx_noise_float,
  mx_noise_vec3,
  normalize,
  normalLocal,
  normalWorld,
  positionLocal,
  pow,
  sin,
  smoothstep,
  transformNormalToView,
  uniform,
  uniformArray,
  vec2,
  vec3,
} from 'three/tsl';

import type { SpitId } from '../evening';
import type { SpitReading } from '../telemetry';
import { createOakFire, floatUniform, inferno, scanlines, type FloatUniform } from './fire';
import type { Quality } from './renderer';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TSL's chained node API is typed far stricter than it runs.
const n = (x: unknown): any => x;

export type SpitOptions = {
  quality: Quality;
  /** Beef with veal and lamb (spit 1), or chicken (spit 2). */
  kind?: SpitId;
};

export type Spit = {
  group: THREE.Group;
  /** The infrared camera's view: inferno colours, scanlines; hot crust towards the fire, cooler away from it. */
  setThermal(on: boolean): void;
  /** Live sensor values: kg sets the cone, crust and core its colour (and the thermal map), fire the flames. */
  setReading(r: SpitReading): void;
  /** A slice is cut: the knife passes, the face turns pale and wet, shavings fall into the tray. */
  carve(): void;
  update(t: number, dt: number): void;
  dispose(): void;
  /** Where the four sensors sit, for labels: probe in the carving layer, infrared camera spot, thermocouple, scale. */
  sensors: { probe: THREE.Object3D; camera: THREE.Object3D; thermocouple: THREE.Object3D; scale: THREE.Object3D };
};

const DETAIL: Record<Quality, { rings: number; around: number }> = {
  high: { rings: 170, around: 132 },
  medium: { rings: 120, around: 96 },
  low: { rings: 80, around: 64 },
};

/** The cone, in scene units (about metres). */
const BOTTOM = 0.17;
const HEIGHT = 0.94;
const BUCKETS = 32;

const MEAT = {
  rund: { crustLight: '#8a4419', crustDark: '#3b1406', char: '#130604', fresh: '#9c5c45', fat: '#d8b08c', raw: '#7a2420', rawFat: '#d09a8c' },
  kip: { crustLight: '#c27a2c', crustDark: '#6e3410', char: '#26120a', fresh: '#dfb985', fat: '#f2dcae', raw: '#d9a690', rawFat: '#ecd0c2' },
} as const;

export function createSpit(opts: SpitOptions): Spit {
  const kind: SpitId = opts.kind ?? 'rund';
  const tone = MEAT[kind];
  const detail = DETAIL[opts.quality] ?? DETAIL.medium;
  const group = new THREE.Group();
  group.name = `ninja-spit-${kind}`;
  const disposables: { dispose(): void }[] = [];

  // Shared state for every material on the stage.
  const thermal = floatUniform(0);
  const crustU = floatUniform(0.8); // how browned (0 pale … 1 deep)
  const rawU = floatUniform(0); // 1 before the fire is lit
  const coreT = floatUniform(76);
  const crustT = floatUniform(110);
  const fireU = floatUniform(1);
  const fireDir = uniform(new THREE.Vector3(0, 0, -1));
  const freshValues = new Array<number>(BUCKETS).fill(0);
  const fresh = uniformArray(freshValues, 'float');

  // ------------------------------------------------------------------------------------------------- the cone
  const meatGeo = coneGeometry(detail.rings, detail.around, kind);
  const meatMat = new THREE.MeshPhysicalNodeMaterial();
  {
    const aTheta = n(attribute('aTheta', 'float'));
    const ridge = n(attribute('aRidge', 'float'));
    const layer = n(attribute('aLayer', 'float'));
    const slot = n(n(aTheta).mul(BUCKETS));
    const i0 = n(int(floor(slot as never) as never));
    const i1 = n(int(floor(n(n(fract(n(n(slot).add(1)).div(BUCKETS) as never)).mul(BUCKETS)) as never) as never));
    const freshAt = n(mix(n(fresh.element(i0 as never)) as never, n(fresh.element(i1 as never)) as never, fract(slot as never) as never));
    const radial = n(normalize(vec3(positionLocal.x, 0, positionLocal.z) as never));
    // The knife leaves a flatter, slightly sunken face.
    meatMat.positionNode = n(positionLocal).sub(n(radial).mul(n(freshAt).mul(0.014)));

    // Noise at three scales: fibres, lumps, and the patches the fire browned unevenly.
    const fine = n(mx_noise_float(n(positionLocal).mul(26))).mul(0.5).add(0.5);
    const coarse = n(mx_noise_float(n(positionLocal).mul(vec3(7, 2.5, 7)))).mul(0.5).add(0.5);
    const spots = n(mx_noise_float(n(positionLocal).mul(vec3(38, 64, 38)).add(5.7))).mul(0.5).add(0.5);
    const groove = n(float(1)).sub(ridge);
    const browning = n(clamp(n(crustU).mul(0.7).add(0.28).add(n(fine).sub(0.5).mul(0.3)), 0, 1));

    // The crust: caramel to mahogany, layer by layer; the tip of each layer charred; dark seams between them.
    const depth = n(clamp(n(browning).mul(0.62).add(n(layer).mul(0.26)).add(n(coarse).sub(0.5).mul(0.5)), 0, 1));
    let col = n(mix(color(tone.crustLight), color(tone.crustDark), depth));
    const charMask = n(smoothstep(0.62, 0.98, n(ridge).mul(0.55).add(n(coarse).mul(0.45)).add(n(fine).mul(0.25)).sub(0.2))).mul(browning);
    col = n(mix(col, color(tone.char), n(charMask).mul(0.88)));
    col = n(col).mul(n(mix(float(0.42), float(1), smoothstep(0.0, 0.4, ridge))));
    // Fat: small glistening spots, more of them in the seams.
    const fat = n(smoothstep(0.7, 0.92, n(spots).add(n(groove).mul(0.1))));
    col = n(mix(col, color(tone.fat), n(fat).mul(0.2)));

    // A fresh cut: paler and wet, the layers showing as streaks of fat.
    const streak = n(smoothstep(0.55, 0.95, n(sin(n(positionLocal.y).mul(150).add(n(coarse).mul(4)))).mul(0.5).add(0.5)));
    const inside = n(mix(color(tone.fresh), color(tone.fat), n(n(streak).mul(n(coarse).mul(0.5).add(0.1))).add(n(fine).mul(0.1))));
    const cut = n(smoothstep(0.05, 0.8, freshAt));
    col = n(mix(col, inside, cut));
    const raw = n(mix(color(tone.raw), color(tone.rawFat), n(streak).mul(0.4).add(n(groove).mul(0.2))));
    col = n(mix(col, raw, n(rawU)));

    const facing = n(dot(normalWorld, fireDir));
    const towardFire = n(pow(max(facing, 0), 3));
    const off = n(float(1)).sub(thermal);
    meatMat.colorNode = n(col).mul(off);
    // Dry crust is matt; fat and the fresh cut shine, most on the side the fire just left.
    const shine = n(clamp(n(fat).add(n(towardFire).mul(n(groove).mul(0.5).add(0.25))), 0, 1));
    meatMat.roughnessNode = n(mix(n(mix(float(0.66), float(0.24), shine)), float(0.27), cut));
    meatMat.clearcoatNode = n(clamp(n(fat).mul(0.75).add(n(cut).mul(0.6)), 0, 1)).mul(n(float(1)).sub(rawU)).mul(off);
    meatMat.clearcoatRoughnessNode = float(0.1);
    meatMat.specularColor = new THREE.Color(kind === 'rund' ? '#ffd2a6' : '#ffe0b0');
    meatMat.specularIntensityNode = off;
    meatMat.sheen = 0;

    // Normals: the layers catch the light one by one (each tilted a little), with fibres and lumps on the crust;
    // the cut face is smooth.
    const smooth = n(normalize(vec3(positionLocal.x, -0.04, positionLocal.z)));
    const fibre = n(mx_noise_vec3(n(positionLocal).mul(vec3(46, 150, 46))));
    const chunk = n(mx_noise_vec3(n(positionLocal).mul(vec3(14, 34, 14)).add(3.1)));
    const tilt = vec3(0, n(layer).sub(0.5).mul(0.42), 0);
    const crustBump = n(n(fibre).mul(0.13).add(n(chunk).mul(0.12)).add(tilt)).mul(n(float(1)).sub(n(cut).mul(0.85)));
    const bent = n(normalize(n(mix(normalLocal, smooth, n(cut).mul(0.85))).add(crustBump)));
    meatMat.normalNode = transformNormalToView(bent);

    // Sizzle: fat glowing on the edge that faces the fire.
    const sizzle = n(color('#ff6a1c')).mul(n(towardFire).mul(n(fat).mul(0.55).add(n(groove).mul(0.25)).add(0.06))).mul(fireU).mul(n(float(1)).sub(rawU)).mul(0.9);
    // Thermal: crust temperature towards the fire, core temperature on the cut and away from it.
    const side = n(pow(n(facing).mul(0.5).add(0.5), 1.5));
    const tempC = n(mix(n(coreT), n(crustT), side)).sub(n(freshAt).mul(n(crustT).sub(coreT)).mul(0.75)).add(n(fine).mul(4)).add(n(ridge).mul(3));
    // The camera's range is 50–140 °C: the side away from the fire reads violet, the crust towards it orange.
    const heat = n(clamp(n(tempC).sub(50).div(90), 0, 1));
    meatMat.emissiveNode = n(mix(sizzle, n(inferno(heat)).mul(scanlines()).mul(1.15), n(thermal)));
  }
  const meat = new THREE.Mesh(meatGeo, meatMat);
  meat.name = 'meat';
  meat.castShadow = true;
  meat.receiveShadow = true;
  group.add(meat);
  disposables.push(meatGeo, meatMat);

  // ----------------------------------------------------------------------------------------------- the steel
  const steel = steelMaterial(thermal, 0.24, '#b8bcc2');
  const darkSteel = steelMaterial(thermal, 0.4, '#5d5f63');
  disposables.push(steel, darkSteel);
  const part = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    disposables.push(geo);
    return m;
  };
  part(new THREE.CylinderGeometry(0.011, 0.011, 1.42, 16), steel, 0, 0.75, 0); // the skewer
  const top = part(new THREE.CylinderGeometry(0.15, 0.15, 0.012, 48), steel, 0, BOTTOM + HEIGHT + 0.012, 0); // top plate
  part(new THREE.CylinderGeometry(0.13, 0.13, 0.012, 48), steel, 0, BOTTOM - 0.006, 0); // the plate it stands on
  part(trayGeometry(), steel, 0, 0.06, 0); // drip tray
  part(new THREE.BoxGeometry(0.34, 0.06, 0.34), darkSteel, 0, 0.03, 0); // motor housing and the scale under it
  part(new THREE.BoxGeometry(0.03, 0.03, 0.5), darkSteel, 0, 1.45, -0.25); // the bracket from the grate to the bearing
  part(new THREE.CylinderGeometry(0.028, 0.028, 0.05, 20), steel, 0, 1.44, 0); // the bearing

  // ------------------------------------------------------------------------------------------------- the fire
  const fire = createOakFire({ quality: opts.quality, layout: 'wall', width: 0.95, height: 1.2, thermal });
  fire.group.position.set(0, 0.04, -0.5);
  group.add(fire.group);
  // A wall of dark tiles behind the fire catches its glow, as the red tiles do behind Ninja's spits.
  const wallGeo = new THREE.PlaneGeometry(2.6, 2.2);
  const wallMat = new THREE.MeshPhysicalNodeMaterial({ roughness: 0.3, metalness: 0 });
  {
    const tile = n(n(positionLocal.xy).mul(vec2(1 / 0.075, 1 / 0.075)));
    const gx = n(abs(n(fract(tile.x as never)).sub(0.5) as never));
    const gy = n(abs(n(fract(tile.y as never)).sub(0.5) as never));
    const joint = n(smoothstep(0.43, 0.5, max(gx as never, gy as never) as never));
    const tint = n(mx_noise_float(n(floor(tile as never)).mul(0.71) as never)).mul(0.5).add(0.5);
    const glaze = n(mix(color('#1d0605'), color('#3a0d09'), tint as never));
    // Darker away from the fire: the wall is only seen where the fire lights it.
    const near = n(smoothstep(1.5, 0.2, n(n(positionLocal.xy).sub(vec2(0, -0.4))).length() as never));
    wallMat.colorNode = n(n(mix(glaze as never, color('#050303'), joint as never)).mul(n(near).mul(0.8).add(0.2))).mul(n(float(1)).sub(thermal));
    wallMat.roughnessNode = float(0.3);
    wallMat.specularIntensityNode = n(float(1)).sub(thermal);
    wallMat.emissiveNode = n(n(inferno(n(n(near).mul(0.34)).add(0.03))).mul(thermal)).mul(scanlines());
  }
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.position.set(0, 1.0, -0.78);
  wall.receiveShadow = true;
  group.add(wall);
  disposables.push(wallGeo, wallMat);

  // -------------------------------------------------------------------------------------- knife and shavings
  const knife = new THREE.Group();
  {
    const bladeGeo = new THREE.BoxGeometry(0.004, 0.36, 0.05);
    bladeGeo.translate(0, -0.18, 0);
    const blade = new THREE.Mesh(bladeGeo, steel);
    const handleGeo = new THREE.CylinderGeometry(0.014, 0.016, 0.13, 16);
    handleGeo.translate(0, 0.065, 0);
    const handleMat = new THREE.MeshPhysicalNodeMaterial({ color: '#141010', roughness: 0.5, clearcoat: 0.6 });
    handleMat.colorNode = n(color('#141010')).mul(n(float(1)).sub(thermal));
    handleMat.emissiveNode = n(n(inferno(float(0.22))).mul(thermal)).mul(scanlines());
    const handle = new THREE.Mesh(handleGeo, handleMat);
    knife.add(blade, handle);
    knife.visible = false;
    group.add(knife);
    disposables.push(bladeGeo, handleGeo, handleMat);
  }
  const SHAVINGS = 24;
  const shavingGeo = new THREE.BoxGeometry(0.038, 0.003, 0.016, 3, 1, 1);
  {
    const p = shavingGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + 6 * p.getX(i) * p.getX(i)); // a slight curl
    shavingGeo.computeVertexNormals();
  }
  const shavingMat = new THREE.MeshPhysicalNodeMaterial({ roughness: 0.4, clearcoat: 0.5 });
  shavingMat.colorNode = n(mix(color(tone.crustDark), color(tone.crustLight), 0.6)).mul(n(float(1)).sub(thermal));
  shavingMat.emissiveNode = n(n(inferno(float(0.42))).mul(thermal)).mul(scanlines());
  const shavings = new THREE.InstancedMesh(shavingGeo, shavingMat, SHAVINGS);
  shavings.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  shavings.frustumCulled = false;
  group.add(shavings);
  disposables.push(shavingGeo, shavingMat);
  type Shaving = { alive: number; p: THREE.Vector3; v: THREE.Vector3; r: THREE.Euler; w: THREE.Vector3; landed: boolean };
  const pool: Shaving[] = Array.from({ length: SHAVINGS }, () => ({ alive: -1, p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3(), landed: false }));
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < SHAVINGS; i++) shavings.setMatrixAt(i, hidden);

  // ---------------------------------------------------------------------------------------------- sensors
  const marker = (name: string, x: number, y: number, z: number) => {
    const o = new THREE.Object3D();
    o.name = name;
    o.position.set(x, y, z);
    group.add(o);
    return o;
  };
  const sensors = {
    probe: marker('probe', 0.16, BOTTOM + HEIGHT * 0.52, 0.12),
    camera: marker('camera', -0.2, BOTTOM + HEIGHT * 0.72, -0.08),
    thermocouple: marker('thermocouple', 0.28, 0.75, -0.48),
    scale: marker('scale', 0, 0.03, 0.17),
  };

  // ------------------------------------------------------------------------------------------------- state
  let angle = 0;
  let rpm = 2.2;
  let radius = 1;
  let radiusTarget = 1;
  let thermalTarget = 0;
  let lastCuts = -1;
  let carveStart = -1;
  let now = 0;
  const local = (worldAngle: number) => (((worldAngle + angle) / (Math.PI * 2)) % 1 + 1) % 1;

  /** Marks the face towards the carver (+z) as freshly cut; `amount` below 1 for a cut a while ago. */
  const cutFace = (amount: number) => {
    const centre = local(Math.PI / 2);
    for (let i = 0; i < BUCKETS; i++) {
      let d = Math.abs(i / BUCKETS - centre);
      d = Math.min(d, 1 - d) * 360; // degrees away from the knife
      const v = amount * Math.max(0, 1 - Math.pow(d / 38, 2));
      freshValues[i] = Math.max(freshValues[i], v);
    }
  };

  const spawnShavings = () => {
    let spawned = 0;
    for (const s of pool) {
      if (s.alive >= 0 || spawned >= 9) continue;
      spawned++;
      const y = BOTTOM + HEIGHT * (0.15 + Math.random() * 0.8);
      const r = (0.1 + 0.14 * ((y - BOTTOM) / HEIGHT)) * radius;
      s.alive = 0;
      s.landed = false;
      s.p.set((Math.random() - 0.5) * 0.12, y, r + 0.02);
      s.v.set((Math.random() - 0.5) * 0.25, 0.1 + Math.random() * 0.2, 0.15 + Math.random() * 0.25);
      s.r.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      s.w.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
    }
  };

  const api: Spit = {
    group,
    sensors,
    setThermal(on: boolean) {
      thermalTarget = on ? 1 : 0;
    },
    setReading(r: SpitReading) {
      rpm = r.status === 'koud' ? 0 : r.rpm;
      radiusTarget = 0.4 + 0.6 * Math.sqrt(Math.max(0.02, r.kg / Math.max(1, r.kgStart)));
      crustU.value = Math.max(0.05, Math.min(1, r.crustIndex));
      rawU.value = r.status === 'koud' ? 1 : r.status === 'opwarmen' ? Math.max(0, 1 - r.onFire / 30) * 0.8 : 0;
      coreT.value = r.core;
      crustT.value = r.crust;
      const fireLevel = r.status === 'koud' ? 0.12 : Math.max(0.55, Math.min(1.45, 0.55 + (r.fire - 600) / 220));
      fire.setIntensity(fireLevel);
      fireU.value = fireLevel;
      if (lastCuts < 0) {
        // First reading: show the last cut where it would be by now.
        if (r.cuts > 0 && r.lastCut < 240) cutFace(Math.exp(-r.lastCut / 80));
        radius = radiusTarget;
      } else if (r.cuts > lastCuts) api.carve();
      lastCuts = r.cuts;
    },
    carve() {
      carveStart = now;
      knife.visible = true;
      cutFace(1);
      spawnShavings();
    },
    update(t: number, dt: number) {
      now = t;
      const step = Math.min(0.1, Math.max(0, dt));
      angle += step * (rpm / 60) * Math.PI * 2;
      meat.rotation.y = angle;
      radius += (radiusTarget - radius) * Math.min(1, step * 0.8);
      meat.scale.set(radius, 1, radius);
      top.scale.set(Math.max(0.75, radius), 1, Math.max(0.75, radius));
      thermal.value += (thermalTarget - thermal.value) * Math.min(1, step * 4);
      if (Math.abs(thermal.value - thermalTarget) < 0.002) thermal.value = thermalTarget;

      // The fresh face browns again, fastest while it faces the fire (behind, −z).
      for (let i = 0; i < BUCKETS; i++) {
        if (freshValues[i] <= 0) continue;
        const world = (i / BUCKETS) * Math.PI * 2 - angle;
        const toward = Math.max(0, -Math.sin(world));
        freshValues[i] = Math.max(0, freshValues[i] - step * (0.004 + 0.022 * toward * toward));
      }

      // The knife: down the face in a second, then gone.
      if (carveStart >= 0) {
        const k = (t - carveStart) / 1.1;
        if (k >= 1 || k < 0) {
          knife.visible = false;
          carveStart = -1;
        } else {
          const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          const y = BOTTOM + HEIGHT * (0.98 - 0.85 * e);
          const r = (0.1 + 0.14 * ((y - BOTTOM) / HEIGHT)) * radius + 0.012;
          knife.position.set(0.02, y + 0.05, r);
          knife.rotation.set(-0.12, 0.25, 0.05);
        }
      }

      // Shavings fall into the tray and fade.
      const m = new THREE.Matrix4();
      const qq = new THREE.Quaternion();
      for (let i = 0; i < SHAVINGS; i++) {
        const s = pool[i];
        if (s.alive < 0) continue;
        s.alive += step;
        if (!s.landed) {
          s.v.y -= 9.8 * step * 0.5;
          s.p.addScaledVector(s.v, step);
          s.r.x += s.w.x * step;
          s.r.y += s.w.y * step;
          s.r.z += s.w.z * step;
          const rr = Math.hypot(s.p.x, s.p.z);
          if (s.p.y < 0.075 && rr < 0.28) {
            s.p.y = 0.075;
            s.landed = true;
          } else if (s.p.y < -0.2) s.alive = 99;
        }
        const life = s.alive < 2.6 ? 1 : Math.max(0, 1 - (s.alive - 2.6) / 0.8);
        if (life <= 0) {
          s.alive = -1;
          shavings.setMatrixAt(i, hidden);
          continue;
        }
        qq.setFromEuler(s.landed ? new THREE.Euler(0, s.r.y, 0) : s.r);
        m.compose(s.p, qq, new THREE.Vector3(life, life, life));
        shavings.setMatrixAt(i, m);
      }
      shavings.instanceMatrix.needsUpdate = true;
      fire.update(t, step);
    },
    dispose() {
      fire.dispose();
      for (const d of disposables) d.dispose();
      shavings.dispose();
      group.removeFromParent();
    },
  };
  return api;
}

/** Brushed steel that warms up in the thermal view (a little more towards the fire). */
function steelMaterial(thermal: FloatUniform, roughness: number, tint: string) {
  const m = new THREE.MeshPhysicalNodeMaterial({ metalness: 1, roughness });
  const brushed = n(n(mx_noise_float(n(positionLocal).mul(vec3(2, 120, 2)) as never)).mul(0.08));
  m.metalnessNode = n(float(1)).sub(thermal);
  m.specularIntensityNode = n(float(1)).sub(thermal);
  m.colorNode = n(color(tint)).mul(n(float(1)).sub(thermal));
  m.roughnessNode = n(float(roughness)).add(brushed);
  const warm = n(smoothstep(0.4, -0.5, positionLocal.z as never));
  m.emissiveNode = n(n(inferno(n(n(warm).mul(0.25)).add(0.12))).mul(thermal)).mul(scanlines());
  return m;
}

/** A shallow round drip tray. */
function trayGeometry(): THREE.BufferGeometry {
  const pts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.26, 0.0),
    new THREE.Vector2(0.3, 0.035),
    new THREE.Vector2(0.305, 0.04),
    new THREE.Vector2(0.295, 0.04),
    new THREE.Vector2(0.255, 0.008),
    new THREE.Vector2(0.0, 0.008),
  ];
  return new THREE.LatheGeometry(pts, 64);
}

/**
 * The meat: a lathe from the profile of a döner (narrow at the bottom, wide at the top, rounded shoulders), its
 * surface built from stacked layers of different thickness, each a little uneven, with the grooves between them.
 */
function coneGeometry(rings: number, around: number, kind: SpitId): THREE.BufferGeometry {
  const pos = new Float32Array((rings + 1) * around * 3);
  const theta = new Float32Array((rings + 1) * around);
  const ridgeA = new Float32Array((rings + 1) * around);
  const layerA = new Float32Array((rings + 1) * around);
  const layers = kind === 'kip' ? 44 : 56;
  const rnd = (k: number) => {
    const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  for (let j = 0; j <= rings; j++) {
    const v = j / rings;
    let r = 0.1 + 0.14 * Math.pow(v, 0.85);
    if (v > 0.93) r *= 0.12 + 0.88 * Math.sqrt(Math.max(0, 1 - Math.pow((v - 0.93) / 0.07, 2)));
    if (v < 0.05) r *= 0.55 + 0.45 * Math.sqrt(v / 0.05);
    const lc = v * layers + 0.45 * Math.sin(v * 13.7) + 0.3 * Math.sin(v * 31.1) + 0.18 * Math.sin(v * 71.3);
    const li = Math.floor(lc);
    const ridge = Math.pow(Math.sin(Math.PI * (lc - li)), 0.55);
    const h = rnd(li);
    const f = lc - li;
    const blend = f * f * (3 - 2 * f);
    const offset = (rnd(li) * (1 - blend) + rnd(li + 1) * blend - 0.5) * 0.0045;
    for (let i = 0; i < around; i++) {
      const a = (i / around) * Math.PI * 2;
      const wobble = 0.006 * Math.sin(a * 2 + h * 6.28) + 0.004 * Math.sin(a * 5 + h * 11.3) + 0.0025 * Math.sin(a * 11 + h * 3.1);
      const lump = 0.0032 * Math.sin(a * 7 + v * 23) * Math.sin(v * 41 + a * 3) + 0.0018 * Math.sin(a * 17 + v * 67 + h * 9) * Math.sin(v * 97 - a * 5);
      const edge = v > 0.93 || v < 0.05 ? 0.3 : v > 0.8 ? 1 - (v - 0.8) * 3.5 : 1;
      const rr = Math.max(0.012, r + edge * (0.0034 * (ridge - 0.55) * (0.6 + h * 0.8) + offset + wobble + lump));
      const k = j * around + i;
      pos[k * 3] = Math.cos(a) * rr;
      pos[k * 3 + 1] = BOTTOM + v * HEIGHT;
      pos[k * 3 + 2] = Math.sin(a) * rr;
      theta[k] = i / around;
      ridgeA[k] = ridge;
      layerA[k] = h;
    }
  }
  const index: number[] = [];
  for (let j = 0; j < rings; j++) {
    for (let i = 0; i < around; i++) {
      const i2 = (i + 1) % around;
      const a = j * around + i;
      const b = j * around + i2;
      const c = (j + 1) * around + i2;
      const d = (j + 1) * around + i;
      index.push(a, d, b, b, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aTheta', new THREE.BufferAttribute(theta, 1));
  geo.setAttribute('aRidge', new THREE.BufferAttribute(ridgeA, 1));
  geo.setAttribute('aLayer', new THREE.BufferAttribute(layerA, 1));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}
