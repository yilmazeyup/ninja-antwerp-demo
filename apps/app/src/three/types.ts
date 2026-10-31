import type { StyleProp, ViewStyle } from 'react-native';
import type * as THREE from 'three/webgpu';

export type Stage = {
  renderer: THREE.WebGPURenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  el: HTMLElement;
  width: number;
  height: number;
  backend: 'webgpu' | 'webgl';
  quality: 'low' | 'medium' | 'high';
};

export type Scene3D = {
  /** Called every frame with the time in seconds and the step since the last frame. */
  update?: (t: number, dt: number) => void;
  /** Draws the frame itself (a RenderPipeline with effects); otherwise the stage renders scene and camera. */
  render?: () => void;
  resize?: (width: number, height: number) => void;
  dispose?: () => void;
};

export type Canvas3DProps = {
  /** Builds the scene once the GPU is ready; may be async (loading a mask or a model). */
  setup: (stage: Stage) => Scene3D | void | Promise<Scene3D | void>;
  style?: StyleProp<ViewStyle>;
  /** Re-runs setup when this changes. */
  deps?: unknown[];
  alpha?: boolean;
  fov?: number;
  /** Shown while the GPU starts, or when there is none. */
  fallback?: React.ReactNode;
};
