import { View } from 'react-native';

import type { Canvas3DProps } from './types';

export type { Scene3D, Stage } from './types';

/** Natively the 3D scenes are not drawn; the box keeps its place and shows the fallback. */
export function Canvas3D({ style, fallback }: Canvas3DProps) {
  return <View style={style}>{fallback}</View>;
}
