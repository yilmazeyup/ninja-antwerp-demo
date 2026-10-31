import { useEffect, type Ref } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

export type Facing = 'user' | 'environment';
export type CameraState = 'idle' | 'starting' | 'live' | 'denied' | 'missing' | 'error';
export type CameraHandle = {
  /** The frame on screen as a canvas (web only). */
  capture: () => HTMLCanvasElement | null;
};

export const LIVE_GRADE = '';

type Props = { ref?: Ref<CameraHandle>; facing: Facing; active: boolean; onState?: (s: CameraState) => void; grade?: boolean; style?: StyleProp<ViewStyle> };

/** Natively the demo has no live camera (it would use expo-camera); the screens offer a picture instead. */
export function LiveCamera({ active, onState, style }: Props) {
  useEffect(() => {
    onState?.(active ? 'missing' : 'idle');
  }, [active, onState]);
  return <View style={[{ backgroundColor: '#050302' }, style]} />;
}

export const pickImage = async (): Promise<string | null> => null;
