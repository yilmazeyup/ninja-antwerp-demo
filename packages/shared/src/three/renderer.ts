import * as THREE from 'three/webgpu';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/**
 * Every 3D view in the demo draws with three.js's WebGPURenderer: WebGPU where the browser has it (Chrome, Edge,
 * Safari 26), and the same scene, materials and effects on WebGL 2 everywhere else. `?gl=webgl` forces WebGL 2, to
 * compare; `?q=low|medium|high` overrides the quality the device gets.
 */

export type Backend = 'webgpu' | 'webgl';
export type Quality = 'low' | 'medium' | 'high';

const query = (name: string) => {
  try {
    return new URLSearchParams(globalThis.location?.search ?? '').get(name);
  } catch {
    return null;
  }
};

export const wantsWebGL = () => query('gl') === 'webgl';

export type RendererOptions = {
  canvas?: HTMLCanvasElement;
  alpha?: boolean;
  antialias?: boolean;
  forceWebGL?: boolean;
  /** Pixel ratio cap; phones get less. */
  maxPixelRatio?: number;
  shadows?: boolean;
};

export type Renderer = { renderer: THREE.WebGPURenderer; backend: Backend; quality: Quality };

/** A renderer, initialised: AgX tone mapping, sRGB output, filtered shadows. Resolves once the GPU is ready. */
export async function createRenderer(opts: RendererOptions = {}): Promise<Renderer> {
  const renderer = new THREE.WebGPURenderer({
    canvas: opts.canvas,
    antialias: opts.antialias ?? true,
    alpha: opts.alpha ?? false,
    forceWebGL: opts.forceWebGL ?? wantsWebGL(),
    powerPreference: 'high-performance',
  });
  await renderer.init();
  const backend: Backend = (renderer.backend as unknown as { isWebGPUBackend?: boolean }).isWebGPUBackend ? 'webgpu' : 'webgl';
  const quality = pickQuality(backend);
  const ratio = Math.min(globalThis.devicePixelRatio || 1, opts.maxPixelRatio ?? (quality === 'high' ? 2 : quality === 'medium' ? 1.5 : 1.25));
  renderer.setPixelRatio(ratio);
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  if (opts.shadows ?? true) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
  }
  return { renderer, backend, quality };
}

/** High on a desktop with WebGPU, medium on WebGL 2 or a tablet, low on a phone; `?q=` decides when given. */
export function pickQuality(backend: Backend): Quality {
  const forced = query('q');
  if (forced === 'low' || forced === 'medium' || forced === 'high') return forced;
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const small = typeof innerWidth === 'number' && innerWidth < 700;
  if (coarse && small) return 'low';
  if (coarse || backend === 'webgl') return 'medium';
  return 'high';
}

/** Soft studio reflections for leather, lacquer and chrome: a room environment, prefiltered once. */
export function studioEnvironment(renderer: THREE.WebGPURenderer, scene: THREE.Scene, intensity = 1) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = intensity;
  pmrem.dispose();
  return env;
}

export const prefersReducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
