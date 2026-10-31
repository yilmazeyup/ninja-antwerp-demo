import { createRenderer } from '@ninja/shared/three';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { View } from 'react-native';
import * as THREE from 'three/webgpu';

import type { Canvas3DProps, Scene3D, Stage } from './types';

export type { Scene3D, Stage } from './types';

/**
 * A three.js WebGPU canvas that fills its box: WebGPU where the browser has it, WebGL 2 otherwise (the same scene).
 * It sizes itself to the box, pauses while the tab is hidden or the canvas is off screen, and frees the GPU when it
 * goes away. The fallback shows until the first frame is drawn.
 */
export function Canvas3D({ setup, style, deps = [], alpha = true, fov = 38, fallback }: Canvas3DProps) {
  const box = useRef<ComponentRef<typeof View>>(null);
  const setupRef = useRef(setup);
  setupRef.current = setup;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = box.current as unknown as HTMLElement | null;
    if (!el) return;
    let alive = true;
    let cleanup = () => {};
    (async () => {
      let made;
      try {
        made = await createRenderer({ alpha });
      } catch {
        return;
      }
      if (!alive) {
        made.renderer.dispose();
        return;
      }
      const { renderer, backend, quality } = made;
      const canvas = renderer.domElement;
      canvas.style.position = 'absolute';
      canvas.style.inset = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.touchAction = 'pan-y';
      el.appendChild(canvas);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(fov, 1, 0.05, 400);
      const stage: Stage = { renderer, scene, camera, el, width: 1, height: 1, backend, quality };
      let scene3d: Scene3D = {};
      const size = () => {
        const w = Math.max(1, el.clientWidth);
        const h = Math.max(1, el.clientHeight);
        stage.width = w;
        stage.height = h;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        scene3d.resize?.(w, h);
      };
      size();
      try {
        scene3d = (await setupRef.current(stage)) || {};
      } catch (e) {
        console.warn('3D setup failed', e);
      }
      if (!alive) {
        scene3d.dispose?.();
        renderer.dispose();
        canvas.remove();
        return;
      }
      size();
      const observer = new ResizeObserver(size);
      observer.observe(el);
      let visible = true;
      const io = new IntersectionObserver((entries) => {
        visible = entries.some((e) => e.isIntersecting);
      });
      io.observe(el);
      let last = performance.now();
      const start = last;
      let first = true;
      renderer.setAnimationLoop((now: number) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (!visible || document.hidden) return;
        scene3d.update?.((now - start) / 1000, dt);
        if (scene3d.render) scene3d.render();
        else renderer.render(scene, camera);
        if (first) {
          first = false;
          setReady(true);
        }
      });
      cleanup = () => {
        renderer.setAnimationLoop(null);
        observer.disconnect();
        io.disconnect();
        scene3d.dispose?.();
        scene.traverse((o) => {
          const mesh = o as THREE.Mesh;
          mesh.geometry?.dispose?.();
          const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
          for (const m of mats) m.dispose();
        });
        renderer.dispose();
        canvas.remove();
      };
    })();
    return () => {
      alive = false;
      setReady(false);
      cleanup();
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View ref={box} style={[{ position: 'relative', overflow: 'hidden' }, style]}>
      {!ready && fallback ? <View style={{ position: 'absolute', inset: 0 } as never}>{fallback}</View> : null}
    </View>
  );
}
