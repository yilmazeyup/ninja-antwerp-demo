import type { SpitReading } from '@ninja/shared';
import { roomEnvironment } from '@ninja/shared/three/room';
import { createSpit, type Spit } from '@ninja/shared/three/spit';
import { useEffect, useRef } from 'react';
import * as THREE from 'three/webgpu';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { pass } from 'three/tsl';

import { tr } from '../i18n';
import { Canvas3D } from '../three/Canvas3D';
import { SpitPhoto, type SpitPhotoProps } from './SpitPhoto';

export type SpitStageProps = SpitPhotoProps;

/**
 * The spit in 3D, live: the layered cone turning before the oak fire, its crust browning as the sensors say, a fresh
 * slice when the spit master cuts, and the infrared camera's view at the flick of a switch. Ninja's photo shows while
 * the GPU starts.
 */
export function SpitStage(props: SpitStageProps) {
  const { spit: kind, reading, thermal, style } = props;
  const latest = useRef({ reading, thermal });
  latest.current = { reading, thermal };
  const api = useRef<Spit | null>(null);
  const cuts = useRef(reading.cuts);

  useEffect(() => {
    api.current?.setThermal(thermal);
  }, [thermal]);

  useEffect(() => {
    const s = api.current;
    if (!s) return;
    s.setReading(reading);
    if (reading.cuts > cuts.current) s.carve();
    cuts.current = reading.cuts;
  }, [reading]);

  return (
    <Canvas3D
      style={style}
      deps={[kind]}
      alpha={false}
      fov={34}
      fallback={<SpitPhoto {...props} style={{ position: 'absolute', inset: 0 } as never} />}
      setup={({ renderer, scene, camera, quality, el }) => {
        scene.background = new THREE.Color('#0B0807');
        scene.environment = roomEnvironment(renderer);
        scene.environmentIntensity = 0.6;
        const s = createSpit({ quality, kind });
        api.current = s;
        s.setReading(latest.current.reading);
        s.setThermal(latest.current.thermal);
        cuts.current = latest.current.reading.cuts;
        scene.add(s.group);
        const key = new THREE.SpotLight('#FFE0C0', 11, 9, Math.PI / 5, 0.6, 1.5);
        key.position.set(1.6, 2.4, 2.2);
        key.target.position.set(0, 0.6, 0);
        scene.add(key, key.target);
        const fill = new THREE.HemisphereLight('#3A2A22', '#0B0807', 0.5);
        scene.add(fill);

        // The spit sits in the upper part of the stage; the live numbers take the lower part.
        const target = new THREE.Vector3(0, 0.3, 0);
        const radius = () => (camera.aspect < 0.8 ? 3.25 : 2.7);
        const frame = () => {
          camera.position.set(Math.sin(0.4) * radius(), 0.95, Math.cos(0.4) * radius());
          camera.lookAt(target);
        };
        frame();

        const pipeline = new THREE.RenderPipeline(renderer);
        const scenePass = pass(scene, camera);
        pipeline.outputNode = quality === 'low' ? scenePass : scenePass.add(bloom(scenePass, 0.42, 0.35, 0.8));

        // Where the four sensors sit, as hairline labels that follow the turning camera.
        const labels = (
          [
            ['probe', 'Sonde'],
            ['camera', 'Infrarood'],
            ['thermocouple', 'Thermokoppel'],
            ['scale', 'Weegschaal'],
          ] as const
        ).map(([key, text]) => {
          const tag = document.createElement('div');
          tag.textContent = tr(text);
          tag.style.cssText =
            "position:absolute;left:0;top:0;pointer-events:none;font:700 8.5px Archivo,sans-serif;font-stretch:125%;letter-spacing:.18em;text-transform:uppercase;color:rgba(244,236,225,.78);padding:4px 7px 4px 14px;border-left:1px solid rgba(255,181,71,.8);background:linear-gradient(90deg,rgba(11,8,7,.55),rgba(11,8,7,0));white-space:nowrap;will-change:transform;transition:opacity .4s";
          el.appendChild(tag);
          return { tag, mark: s.sensors[key] };
        });
        const v = new THREE.Vector3();
        const place = () => {
          for (const { tag, mark } of labels) {
            mark.getWorldPosition(v);
            v.project(camera);
            const x = Math.min((v.x * 0.5 + 0.5) * el.clientWidth, el.clientWidth - tag.offsetWidth - 10);
            const y = (-v.y * 0.5 + 0.5) * el.clientHeight;
            tag.style.transform = `translate(${x.toFixed(1)}px, ${(y - 10).toFixed(1)}px)`;
            tag.style.opacity = v.z < 1 && y < el.clientHeight * 0.62 ? '1' : '0';
          }
        };

        return {
          resize: frame,
          update: (t, dt) => {
            s.update(t, dt);
            // A slow drift around the spit, as a camera operator would.
            const a = Math.sin(t * 0.12) * 0.22;
            camera.position.x = Math.sin(a + 0.4) * radius();
            camera.position.z = Math.cos(a + 0.4) * radius();
            camera.lookAt(target);
            place();
          },
          render: () => pipeline.render(),
          dispose: () => {
            for (const { tag } of labels) tag.remove();
            s.dispose();
            api.current = null;
          },
        };
      }}
    />
  );
}
