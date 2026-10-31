// The fire stage: one of Ninja's spits before the oak fire, driven by the live readings, with the infrared view and
// four sensor marks the page draws its labels on.

import * as THREE from 'three/webgpu';
import { emissive, floor as tslFloor, fract, hash, mrt, output, pass, screenCoordinate, screenUV, smoothstep, time, uniform, vec2 } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import type { SpitId, SpitReading } from '@ninja/shared';
import { createRenderer, studioEnvironment, type Backend, type Quality } from '@ninja/shared/three';
import { createSpit, type Spit } from '@ninja/shared/three/spit';

export type SensorName = 'probe' | 'camera' | 'thermocouple' | 'scale';
export type StageHud = Partial<Record<SensorName, HTMLElement | null>>;

export type SpitStage = {
  backend: Backend;
  quality: Quality;
  setKind(kind: SpitId): void;
  setReading(r: SpitReading): void;
  setThermal(on: boolean): void;
  carve(): void;
  setPointer(x: number, y: number): void;
  setActive(on: boolean): void;
  setHud(hud: StageHud): void;
  dispose(): void;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TSL's chained node API is typed far stricter than it runs.
const n = (x: unknown): any => x;

export async function createSpitStage(host: HTMLElement, opts: { kind: SpitId; reduced: boolean; onReady?: () => void }): Promise<SpitStage> {
  const { renderer, backend, quality } = await createRenderer({ alpha: false, shadows: false });
  const canvas = renderer.domElement;
  canvas.className = 'stage-canvas';
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const normalBg = new THREE.Color('#0B0807');
  const thermalBg = new THREE.Color('#05030c');
  scene.background = normalBg.clone();
  studioEnvironment(renderer, scene, 0.14);
  renderer.toneMappingExposure = 1.0;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 40);
  const key = new THREE.DirectionalLight('#ffe9d6', 1.6);
  key.position.set(1.6, 2.4, 2.8);
  const fill = new THREE.DirectionalLight('#a9b6d6', 0.18);
  fill.position.set(-2.5, 1, 1.5);
  scene.add(key, fill);

  // Floor: black steel, so the fire has something to fall on.
  const floor = new THREE.Mesh(new THREE.CircleGeometry(3, 64), new THREE.MeshPhysicalNodeMaterial({ color: '#0e0b0a', metalness: 0.6, roughness: 0.42 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const spits = new Map<SpitId, Spit>();
  let kind: SpitId = opts.kind;
  const spitFor = (k: SpitId) => {
    let s = spits.get(k);
    if (!s) {
      s = createSpit({ quality, kind: k });
      spits.set(k, s);
      scene.add(s.group);
    }
    return s;
  };
  spitFor(kind);

  const pipeline = new THREE.RenderPipeline(renderer);
  const scenePass = pass(scene, camera, { samples: quality === 'low' ? 0 : 4 });
  scenePass.setMRT(mrt({ output, emissive }));
  const colorTex = n(scenePass.getTextureNode('output'));
  const glowTex = n(scenePass.getTextureNode('emissive'));
  const glow = bloom(glowTex as never, 0.62, 0.42, 0.0);
  const sheen = bloom(colorTex as never, 0.08, 0.3, 0.95);
  const aspectU = uniform(1);
  const fromCentre = n(n(n(screenUV).sub(0.5)).mul(vec2(aspectU as never, 1))).length();
  const vignette = n(smoothstep(0.95, 0.2, fromCentre as never)).mul(0.5).add(0.5);
  // Film grain, per pixel and per frame, multiplied in so the blacks stay black.
  const seed = n(screenCoordinate.x).add(n(screenCoordinate.y).mul(4099)).add(n(tslFloor(n(fract(n(time).mul(0.73))).mul(977))).mul(6151));
  const grain = n(n(hash(seed)).sub(0.5)).mul(0.06).add(1);
  pipeline.outputNode = n(n(n(n(colorTex).add(glow)).add(sheen)).mul(vignette)).mul(grain) as never;

  let width = 1;
  let height = 1;
  let distance = 3;
  const resize = () => {
    width = Math.max(1, host.clientWidth);
    height = Math.max(1, host.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    aspectU.value = camera.aspect;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    distance = Math.max(1.62 / (2 * tan), 1.35 / (2 * tan * camera.aspect));
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  let hud: StageHud = {};
  const pointer = new THREE.Vector2();
  const eased = new THREE.Vector2();
  let thermal = false;
  let thermalMix = 0;
  let active = true;
  let started = false;
  const v = new THREE.Vector3();
  const timer = new THREE.Timer();

  const frame = () => {
    timer.update();
    const t = timer.getElapsed();
    const dt = Math.min(0.05, timer.getDelta());
    eased.lerp(pointer, opts.reduced ? 1 : Math.min(1, dt * 2.5));
    const yaw = 0.3 + eased.x * 0.32 + (opts.reduced ? 0 : Math.sin(t * 0.11) * 0.05);
    const pitch = 0.12 - eased.y * 0.08;
    camera.position.set(Math.sin(yaw) * distance, 0.72 + Math.sin(pitch) * distance, Math.cos(yaw) * distance - 0.18);
    camera.lookAt(0, 0.7, -0.18);

    thermalMix += ((thermal ? 1 : 0) - thermalMix) * Math.min(1, dt * 4);
    (scene.background as THREE.Color).copy(normalBg).lerp(thermalBg, thermalMix);
    key.intensity = 1.6 * (1 - thermalMix);
    fill.intensity = 0.18 * (1 - thermalMix);
    scene.environmentIntensity = 0.14 * (1 - thermalMix);
    (glow as unknown as { strength: { value: number } }).strength.value = 0.62 - 0.4 * thermalMix;
    floor.visible = thermalMix < 0.98;

    for (const [k, s] of spits) {
      s.group.visible = k === kind;
      if (k === kind) s.update(t, dt);
    }
    pipeline.render();

    // The labels follow their sensors on screen.
    const s = spits.get(kind);
    if (s) {
      for (const name of ['probe', 'camera', 'thermocouple', 'scale'] as SensorName[]) {
        const el = hud[name];
        if (!el) continue;
        s.sensors[name].getWorldPosition(v).project(camera);
        const x = (v.x * 0.5 + 0.5) * width;
        const y = (-v.y * 0.5 + 0.5) * height;
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        el.dataset.visible = v.z < 1 && x > 0 && x < width && y > 0 && y < height ? '1' : '0';
        // Labels open towards the middle, so they never run off the frame.
        el.dataset.side = x > width * 0.58 ? 'l' : 'r';
      }
    }
    if (!started) {
      started = true;
      opts.onReady?.();
    }
  };
  // With reduced motion the scene settles, then stands still: one frame on demand instead of a loop.
  let frames = 0;
  let still = false;
  const tick = () => {
    frame();
    frames += 1;
    if (opts.reduced && frames > 90 && !still) {
      still = true;
      renderer.setAnimationLoop(null);
    }
  };
  const loop = () => renderer.setAnimationLoop(active && !document.hidden && !still ? tick : null);
  const redraw = () => {
    if (still && active) requestAnimationFrame(() => frame());
  };
  const onVisibility = () => loop();
  document.addEventListener('visibilitychange', onVisibility);
  loop();

  return {
    backend,
    quality,
    setKind(k: SpitId) {
      kind = k;
      spitFor(k).setThermal(thermal);
      if (still) {
        still = false;
        frames = 0;
        loop();
      }
    },
    setReading(r: SpitReading) {
      spitFor(r.spit).setReading(r);
      redraw();
    },
    setThermal(on: boolean) {
      thermal = on;
      for (const s of spits.values()) s.setThermal(on);
      if (still) {
        // Let the switch play out, then stand still again.
        still = false;
        frames = 0;
        loop();
      }
    },
    carve() {
      spits.get(kind)?.carve();
    },
    setPointer(x: number, y: number) {
      pointer.set(x, y);
      redraw();
    },
    setActive(on: boolean) {
      active = on;
      loop();
    },
    setHud(next: StageHud) {
      hud = next;
    },
    dispose() {
      renderer.setAnimationLoop(null);
      document.removeEventListener('visibilitychange', onVisibility);
      ro.disconnect();
      for (const s of spits.values()) s.dispose();
      floor.geometry.dispose();
      (floor.material as THREE.Material).dispose();
      pipeline.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
