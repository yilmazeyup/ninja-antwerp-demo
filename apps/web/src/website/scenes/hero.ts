// The hero: Ninja's wordmark in puffy leather, floating over an oak fire. Embers rise past it; the fire lights it
// from below, a soft key from above; bloom on the fire, a little film grain. Turns with the pointer and the scroll.

import * as THREE from 'three/webgpu';
import { emissive, float, floor, fract, hash, mrt, output, pass, screenCoordinate, screenUV, smoothstep, time, uniform, vec2 } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { createRenderer, studioEnvironment, type Backend, type Quality } from '@ninja/shared/three';
import { createOakFire } from '@ninja/shared/three/fire';
import { createLeatherLogo } from '@ninja/shared/three/logo';

export type HeroScene = {
  backend: Backend;
  quality: Quality;
  setPointer(x: number, y: number): void;
  setScroll(p: number): void;
  setActive(on: boolean): void;
  dispose(): void;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TSL's chained node API is typed far stricter than it runs.
const n = (x: unknown): any => x;

export async function createHeroScene(host: HTMLElement, opts: { maskUrl: string; reduced: boolean; onReady?: () => void }): Promise<HeroScene> {
  const { renderer, backend, quality } = await createRenderer({ alpha: false, shadows: false });
  const canvas = renderer.domElement;
  canvas.className = 'hero-canvas';
  // The wordmark is the page's centrepiece: it gets a sharper canvas than the renderer's default for its tier.
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, quality === 'low' ? 1.75 : 2));
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0B0807');
  scene.fog = new THREE.Fog('#0B0807', 7, 16);
  studioEnvironment(renderer, scene, 0.3);
  renderer.toneMappingExposure = 1.05;

  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 60);

  const key = new THREE.DirectionalLight('#ffe9d6', 2.6);
  key.position.set(-3, 4.2, 4.5);
  const rim = new THREE.DirectionalLight('#ffcf9e', 1.5);
  rim.position.set(2.5, 3, -4);
  const fill = new THREE.DirectionalLight('#9fb0d8', 0.25);
  fill.position.set(4, -0.5, 3);
  scene.add(key, rim, fill);

  const logo = await createLeatherLogo({ maskUrl: opts.maskUrl, quality, intro: !opts.reduced });
  const pivot = new THREE.Group();
  pivot.add(logo.group);
  scene.add(pivot);

  const fire = createOakFire({ quality, layout: 'pile', width: 3.4, height: 1.1 });
  fire.group.position.set(0, -1.74, -0.7);
  fire.group.scale.setScalar(1);
  // Under the wordmark the fire stays low: its glow and its sparks, the flames only just showing.
  fire.setIntensity(0.78);
  scene.add(fire.group);
  // A second, broader glow so the underside of the letters warms up as in firelight.
  const under = new THREE.PointLight('#ff8a3c', 3.5, 6, 1.6);
  under.position.set(0, -1.1, 1.0);
  scene.add(under);

  // Post: bloom on what glows (fire, embers), a hint of it on the lacquer's highlights, grain and a vignette.
  const pipeline = new THREE.RenderPipeline(renderer);
  const scenePass = pass(scene, camera, { samples: 4 });
  scenePass.setMRT(mrt({ output, emissive }));
  const colorTex = n(scenePass.getTextureNode('output'));
  const glowTex = n(scenePass.getTextureNode('emissive'));
  const glow = bloom(glowTex as never, 1.25, 0.65, 0.0);
  const sheen = bloom(colorTex as never, 0.14, 0.35, 0.9);
  const aspectU = uniform(1);
  const fromCentre = n(n(n(screenUV).sub(0.5)).mul(vec2(aspectU as never, 1))).length();
  const vignette = n(smoothstep(1.05, 0.25, fromCentre as never)).mul(0.45).add(0.55);
  // Film grain, per pixel and per frame, multiplied in so the blacks stay black.
  const seed = n(screenCoordinate.x).add(n(screenCoordinate.y).mul(4099)).add(n(floor(n(fract(n(time).mul(0.73))).mul(977))).mul(6151));
  const grain = n(n(hash(seed)).sub(0.5)).mul(0.07).add(1);
  const composite = n(n(n(n(colorTex).add(glow)).add(sheen)).mul(vignette)).mul(grain);
  pipeline.outputNode = composite as never;
  void float;

  const pointer = new THREE.Vector2();
  const eased = new THREE.Vector2();
  let scroll = 0;
  let easedScroll = 0;
  let width = 1;
  let height = 1;
  let distance = 6;

  const resize = () => {
    width = Math.max(1, host.clientWidth);
    height = Math.max(1, host.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    aspectU.value = camera.aspect;
    // Fit the wordmark: about 62 % of the width on a wide screen, 88 % on a phone, never taller than 40 % of it.
    const frac = camera.aspect < 0.8 ? 0.9 : camera.aspect < 1.2 ? 0.78 : 0.6;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const byWidth = logo.size.width / (frac * 2 * tan * camera.aspect);
    const byHeight = logo.size.height / (0.4 * 2 * tan);
    distance = Math.max(byWidth, byHeight);
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  let active = true;
  let started = false;
  const clock = new THREE.Timer();
  const frame = () => {
    clock.update();
    const t = clock.getElapsed();
    const dt = Math.min(0.05, clock.getDelta());
    const k = opts.reduced ? 1 : Math.min(1, dt * 3);
    eased.lerp(pointer, k);
    easedScroll += (scroll - easedScroll) * (opts.reduced ? 1 : Math.min(1, dt * 6));
    const drift = opts.reduced ? 0 : 1;
    pivot.rotation.y = Math.sin(t * 0.23) * 0.1 * drift + eased.x * 0.26;
    pivot.rotation.x = -0.04 + eased.y * 0.12 + easedScroll * 0.5;
    pivot.position.y = 0.18 + Math.sin(t * 0.7) * 0.025 * drift + easedScroll * 0.55;
    // On a phone the wordmark sits a little higher, above the text.
    if (camera.aspect < 0.8) pivot.position.y += 0.65;
    camera.position.set(eased.x * 0.25, 0.05 + eased.y * 0.1, distance + easedScroll * 1.2);
    camera.lookAt(0, camera.aspect < 0.8 ? 0.08 : -0.02, 0);
    logo.update(t);
    fire.update(t, dt);
    under.intensity = 3.2 * (0.86 + 0.08 * Math.sin(t * 11.3) + 0.06 * Math.sin(t * 23.9 + 1.7));
    pipeline.render();
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
    setPointer(x: number, y: number) {
      pointer.set(x, y);
      redraw();
    },
    setScroll(p: number) {
      scroll = p;
      redraw();
    },
    setActive(on: boolean) {
      active = on;
      loop();
    },
    dispose() {
      renderer.setAnimationLoop(null);
      document.removeEventListener('visibilitychange', onVisibility);
      ro.disconnect();
      logo.dispose();
      fire.dispose();
      pipeline.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
