import { createLeatherLogo, type LeatherLogo } from '@ninja/shared/three/logo';
import { studioEnvironment } from '@ninja/shared/three';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import * as THREE from 'three/webgpu';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { pass } from 'three/tsl';

import { Canvas3D } from '../three/Canvas3D';
import { tr } from '../i18n';
import { publicUrl } from '../lib/publicUrl';
import { C } from '../theme';
import { Txt } from './ui';

const LENGTH = 3600;

/**
 * The opening: Ninja's own puffy leather wordmark, generated in 3D from the logo, inflating out of the dark in the
 * warm light of the fire, with a few embers rising. Tap to skip; it plays once each time the app starts.
 */
export function Intro({ onDone }: { onDone: () => void }) {
  const fade = useRef(new Animated.Value(1)).current;
  const words = useRef(new Animated.Value(0)).current;
  const [leaving, setLeaving] = useState(false);
  const done = useRef(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    setLeaving(true);
    Animated.timing(fade, { toValue: 0, duration: 650, useNativeDriver: false }).start(() => onDone());
  };

  useEffect(() => {
    const a = setTimeout(() => Animated.timing(words, { toValue: 1, duration: 900, useNativeDriver: false }).start(), 1500);
    const b = setTimeout(finish, LENGTH);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={{ position: 'absolute', inset: 0, zIndex: 500, backgroundColor: C.black, opacity: fade } as never} pointerEvents={leaving ? 'none' : 'auto'}>
      <Pressable onPress={finish} accessibilityLabel={tr('Overslaan')} style={{ flex: 1 }}>
        <Canvas3D
          style={{ position: 'absolute', inset: 0 } as never}
          alpha={false}
          fov={30}
          setup={async ({ renderer, scene, camera, quality }) => {
            scene.background = new THREE.Color('#0B0807');
            studioEnvironment(renderer, scene, 0.32);
            const key = new THREE.DirectionalLight('#FFD2A6', 1.35);
            key.position.set(-2.5, 3, 4);
            scene.add(key);
            const fire = new THREE.PointLight('#FF6A2A', 12, 9, 2);
            fire.position.set(0.4, -1.4, 1.6);
            scene.add(fire);
            const rim = new THREE.DirectionalLight('#9C242A', 0.9);
            rim.position.set(3, 1, -3);
            scene.add(rim);

            let logo: LeatherLogo | null = null;
            try {
              logo = await createLeatherLogo({ maskUrl: publicUrl('brand/logo-mask.png'), quality, intro: true });
              scene.add(logo.group);
            } catch (e) {
              console.warn('logo', e);
            }
            const fit = () => {
              const w = logo?.size.width ?? 2.4;
              const dist = Math.max(3.2, (w * 1.25) / (2 * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect));
              camera.position.set(0, 0.05, dist);
              camera.lookAt(0, 0, 0);
            };
            fit();

            // Embers: small hot points rising from below and fading.
            const count = quality === 'low' ? 60 : 160;
            const geo = new THREE.BufferGeometry();
            const pos = new Float32Array(count * 3);
            const seeds = new Float32Array(count);
            for (let i = 0; i < count; i++) {
              pos[i * 3] = (Math.random() - 0.5) * 4;
              pos[i * 3 + 1] = -1.6 - Math.random() * 2;
              pos[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
              seeds[i] = Math.random();
            }
            geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            const embers = new THREE.Points(geo, new THREE.PointsNodeMaterial({ color: '#FFB060', size: 0.035, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
            scene.add(embers);

            const pipeline = new THREE.RenderPipeline(renderer);
            const scenePass = pass(scene, camera);
            pipeline.outputNode = scenePass.add(bloom(scenePass, 0.28, 0.3, 0.86));

            return {
              resize: fit,
              update: (t, dt) => {
                logo?.update(t);
                if (logo) {
                  logo.group.rotation.y = Math.sin(t * 0.6) * 0.16 + (1 - Math.min(1, t / 1.8)) * 0.5;
                  logo.group.rotation.x = Math.sin(t * 0.4) * 0.04;
                }
                fire.intensity = 11 + Math.sin(t * 13) * 1.5 + Math.sin(t * 7.3) * 2;
                const p = geo.attributes.position as THREE.BufferAttribute;
                for (let i = 0; i < count; i++) {
                  let y = p.getY(i) + dt * (0.35 + seeds[i] * 0.5);
                  if (y > 2) y = -1.8;
                  p.setY(i, y);
                  p.setX(i, p.getX(i) + Math.sin(t * 2 + seeds[i] * 10) * dt * 0.05);
                }
                p.needsUpdate = true;
              },
              render: () => pipeline.render(),
              dispose: () => {
                logo?.dispose();
                geo.dispose();
              },
            };
          }}
        />
        <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: '16%', alignItems: 'center', gap: 10, opacity: words } as never}>
          <View style={{ width: 28, height: 1, backgroundColor: C.chrome, opacity: 0.6 }} />
          <Txt v="label" size={10} color={C.soft} style={{ letterSpacing: 4 }}>
            Vlaamsekaai 52 · Antwerpen
          </Txt>
          <Txt v="serif" size={19} color={C.muted}>
            van het vuur, op je telefoon
          </Txt>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}
