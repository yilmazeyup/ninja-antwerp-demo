import { daylight, lineAt, seatedAt, TABLES } from '@ninja/shared';
import { createRoom, roomEnvironment, type Room } from '@ninja/shared/three/room';
import { useEffect, useRef } from 'react';
import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { pass } from 'three/tsl';

import { eveningNow } from '../state/app';
import { Canvas3D } from '../three/Canvas3D';
import { SeatPlan, type SeatPlanProps } from './SeatPlan';

/**
 * The room in 3D, the same model as the panel's: the guests who sit there now, the line outside, the free tables that
 * fit the group ringed in light, and a tap on a table to choose it. The plan from above shows while the GPU starts.
 */
export function SeatStage(props: SeatPlanProps & { group: number }) {
  const { taken, selected, onSelect, fits } = props;
  const room = useRef<Room | null>(null);
  const latest = useRef(props);
  latest.current = props;

  const free = TABLES.filter((t) => fits(t) && !taken.has(t.id)).map((t) => t.id);
  const freeKey = free.join(',');

  useEffect(() => {
    const r = room.current;
    if (!r) return;
    r.highlight(selected ? [selected] : free, selected ? '#FF6A2A' : '#E7DCCB');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, freeKey]);

  return (
    <Canvas3D
      style={{ position: 'absolute', inset: 0 } as never}
      alpha={false}
      fov={36}
      fallback={<SeatPlan {...props} />}
      setup={({ renderer, scene, camera, quality, el }) => {
        const r = createRoom({ quality: quality === 'high' ? 'medium' : quality, people: true, outside: true });
        room.current = r;
        scene.add(r.group);
        scene.environment = roomEnvironment(renderer);
        scene.environmentIntensity = 0.7;
        scene.background = r.sky;

        const apply = () => {
          const { ev, minute, clock } = eveningNow();
          r.setMinute(minute);
          r.setDaylight(daylight(clock.now));
          r.setGuests(seatedAt(ev, minute).map((g) => ({ table: g.table ?? '', size: g.size, seed: g.id })));
          r.setLine(lineAt(ev, minute).map((g) => ({ seed: g.id, size: g.size })));
          scene.background = r.sky;
        };
        apply();
        const p = latest.current;
        const sel = p.selected;
        r.highlight(sel ? [sel] : TABLES.filter((t) => p.fits(t) && !p.taken.has(t.id)).map((t) => t.id), sel ? '#FF6A2A' : '#E7DCCB');

        // The whole room from above the quay, a little to the side: the kitchen left, the bar right, the line in front.
        const fit = () => {
          const d = camera.aspect < 1 ? 25 / Math.max(0.62, camera.aspect) : 22;
          camera.position.set(2.2, d * 0.78, d * 0.62);
        };
        fit();
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.target.set(0, 0, 1.2);
        controls.enableDamping = true;
        controls.enablePan = false;
        controls.minDistance = 8;
        controls.maxDistance = 42;
        controls.minPolarAngle = 0.15;
        controls.maxPolarAngle = 1.1;
        controls.update();

        // A tap (not a drag) on a table chooses it.
        const ray = new THREE.Raycaster();
        const ndc = new THREE.Vector2();
        let down: { x: number; y: number } | null = null;
        const onDown = (e: PointerEvent) => {
          down = { x: e.clientX, y: e.clientY };
        };
        const onUp = (e: PointerEvent) => {
          if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
          const rect = renderer.domElement.getBoundingClientRect();
          ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
          ray.setFromCamera(ndc, camera);
          const hit = ray.intersectObjects(r.pickables, false)[0];
          const id = hit?.object.userData.table as string | undefined;
          const t = id ? TABLES.find((x) => x.id === id) : undefined;
          if (t && latest.current.fits(t) && !latest.current.taken.has(t.id)) latest.current.onSelect(t.id);
        };
        el.addEventListener('pointerdown', onDown);
        el.addEventListener('pointerup', onUp);

        const pipeline = new THREE.RenderPipeline(renderer);
        const scenePass = pass(scene, camera);
        pipeline.outputNode = quality === 'low' ? scenePass : scenePass.add(bloom(scenePass, 0.35, 0.3, 0.85));

        let since = 0;
        return {
          resize: () => {
            fit();
            controls.update();
          },
          update: (t, dt) => {
            since += dt;
            if (since > 2) {
              since = 0;
              apply();
            }
            r.update(t, dt);
            controls.update();
          },
          render: () => pipeline.render(),
          dispose: () => {
            el.removeEventListener('pointerdown', onDown);
            el.removeEventListener('pointerup', onUp);
            controls.dispose();
            r.dispose();
            room.current = null;
          },
        };
      }}
    />
  );
}
