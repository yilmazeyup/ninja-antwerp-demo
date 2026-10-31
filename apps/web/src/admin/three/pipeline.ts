import * as THREE from 'three/webgpu';
import {
  unpackRGBToNormal,
  packNormalToRGB,
  float,
  luminance,
  max,
  metalness,
  mix,
  mrt,
  normalView,
  output,
  pass,
  renderOutput,
  roughness,
  sample,
  screenUV,
  smoothstep,
  uniform,
  vec2,
  vec3,
  vec4,
  velocity,
} from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { film } from 'three/addons/tsl/display/FilmNode.js';
import { fxaa } from 'three/addons/tsl/display/FXAANode.js';
import { ao } from 'three/addons/tsl/display/GTAONode.js';
import { ssr } from 'three/addons/tsl/display/SSRNode.js';
import { traa } from 'three/addons/tsl/display/TRAANode.js';
import type { Quality } from '@ninja/shared/three';

/*
 * The panel's look, per quality:
 *  high   – G-buffer (normals, metal/rough, velocity), GTAO, screen-space reflections on chrome, lacquer and the wet
 *           floor, bloom on fire and light, TRAA, film grain and a vignette.
 *  medium – GTAO from depth, bloom, FXAA, grain, vignette.
 *  low    – bloom, FXAA, vignette.
 * Everything runs the same on WebGPU and on WebGL 2.
 */

/** Effect nodes are typed loosely in @types/three; they are colours (vec4) all the same. */
const v4 = (n: unknown) => n as THREE.Node<'vec4'>;

export type Pipeline = { pipeline: THREE.RenderPipeline; render(): void; dispose(): void; bloomStrength: THREE.UniformNode<'float', number> };

/** Transparent effects (glass, flames, glow) must not overwrite the G-buffer they are drawn over. */
const keepBlend = (() => {
  const b = new THREE.BlendMode(THREE.CustomBlending);
  b.blendSrc = THREE.ZeroFactor;
  b.blendDst = THREE.OneFactor;
  b.blendSrcAlpha = THREE.ZeroFactor;
  b.blendDstAlpha = THREE.OneFactor;
  return b;
})();

function keepMRT() {
  const m = mrt({ normal: vec4(0), metalrough: vec4(0), velocity: vec4(0) });
  m.setBlendMode('normal', keepBlend);
  m.setBlendMode('metalrough', keepBlend);
  m.setBlendMode('velocity', keepBlend);
  return m;
}

/** Marks the scene's effect materials for (or frees them from) the G-buffer pass. */
export function prepareMaterials(scene: THREE.Scene, gbuffer: boolean) {
  const shared = gbuffer ? keepMRT() : null;
  const seen = new Set<THREE.Material>();
  scene.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    for (const mat of Array.isArray(m) ? m : m ? [m] : []) {
      if (seen.has(mat) || !mat.userData.fx) continue;
      seen.add(mat);
      const node = mat as THREE.NodeMaterial;
      if ((node.mrtNode ?? null) !== shared) {
        node.mrtNode = shared;
        node.needsUpdate = true;
      }
    }
  });
}

export function buildPipeline(renderer: THREE.WebGPURenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, quality: Quality): Pipeline {
  const pipeline = new THREE.RenderPipeline(renderer);
  pipeline.outputColorTransform = false;
  const bloomStrength = uniform(quality === 'low' ? 0.34 : 0.42);
  const disposables: { dispose(): void }[] = [];

  const vignette = (c: THREE.Node<'vec3'>) => {
    const d = screenUV.sub(0.5).mul(vec2(1.0, 0.82)).length();
    return c.mul(smoothstep(0.98, 0.32, d).mul(0.34).add(0.66));
  };
  // Lift the blacks a hair toward warm black: Ninja is black lacquer, never blue.
  const warm = (c: THREE.Node<'vec3'>) => c.mul(0.985).add(vec3(0.012, 0.0085, 0.007));

  if (quality === 'high') {
    prepareMaterials(scene, true);
    const scenePass = pass(scene, camera, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    scenePass.setMRT(mrt({ output, normal: packNormalToRGB(normalView), metalrough: vec2(metalness, roughness), velocity }));
    const color = scenePass.getTextureNode('output');
    const depth = scenePass.getTextureNode('depth');
    const normalTex = scenePass.getTextureNode('normal');
    const mr = scenePass.getTextureNode('metalrough');
    const vel = scenePass.getTextureNode('velocity');
    scenePass.getTexture('normal').type = THREE.UnsignedByteType;
    scenePass.getTexture('metalrough').type = THREE.UnsignedByteType;
    const normal = sample((uv) => unpackRGBToNormal(normalTex.sample(uv)));

    const aoPass = ao(depth, normal, camera);
    aoPass.resolutionScale = 0.5;
    aoPass.radius.value = 0.42;
    aoPass.thickness.value = 0.6;
    aoPass.scale.value = 1.15;
    aoPass.samples.value = 14;
    aoPass.useTemporalFiltering = true;
    const occlusion = aoPass.getTextureNode().r;

    // What mirrors: metal, and anything polished (the floor, the lacquer, glazed tiles, puddles).
    const reflectivity = max(mr.r, smoothstep(0.34, 0.08, mr.g).mul(0.6));
    const ssrPass = ssr(color, depth, normal, { metalnessNode: reflectivity, roughnessNode: mr.g, camera });
    ssrPass.resolutionScale = 0.5;
    ssrPass.maxDistance.value = 6;
    ssrPass.thickness.value = 0.04;
    ssrPass.quality.value = 0.5;
    ssrPass.blurQuality = 2;

    const lum = luminance(color.rgb);
    const ambient = mix(occlusion, float(1), smoothstep(0.7, 2.4, lum));
    const lit = color.rgb.mul(mix(float(1), ambient, 0.92)).add(ssrPass.rgb.mul(0.9));
    const glow = bloom(vec4(lit, 1), 0.42, 0.32, 1.05);
    glow.strength = bloomStrength;
    const composite = vec4(lit.add(glow.rgb), 1);
    const smooth = traa(composite, depth, vel, camera);
    const display = renderOutput(smooth);
    pipeline.outputNode = vec4(warm(vignette(v4(film(display, float(0.07))).rgb)), 1);
    disposables.push(aoPass, ssrPass, glow, scenePass);
  } else {
    prepareMaterials(scene, false);
    const scenePass = pass(scene, camera);
    const color = scenePass.getTextureNode('output');
    let lit: THREE.Node<'vec3'> = color.rgb;
    if (quality === 'medium') {
      const depth = scenePass.getTextureNode('depth');
      const aoPass = ao(depth, null as unknown as THREE.Node, camera);
      aoPass.resolutionScale = 0.5;
      aoPass.radius.value = 0.42;
      aoPass.thickness.value = 0.6;
      aoPass.samples.value = 10;
      const lum = luminance(color.rgb);
      lit = color.rgb.mul(mix(float(1), mix(aoPass.getTextureNode().r, float(1), smoothstep(0.7, 2.4, lum)), 0.85));
      disposables.push(aoPass);
    }
    const glow = bloom(vec4(lit, 1), 0.36, 0.32, 1.05);
    glow.strength = bloomStrength;
    const display = renderOutput(vec4(lit.add(glow.rgb), 1));
    const smooth = fxaa(display);
    const graded = quality === 'medium' ? v4(film(smooth, float(0.06))).rgb : v4(smooth).rgb;
    pipeline.outputNode = vec4(warm(vignette(graded)), 1);
    disposables.push(glow, scenePass);
  }

  return {
    pipeline,
    bloomStrength,
    render: () => pipeline.render(),
    dispose() {
      for (const d of disposables) d.dispose();
      pipeline.dispose();
    },
  };
}
