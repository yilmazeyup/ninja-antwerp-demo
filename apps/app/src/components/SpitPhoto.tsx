import type { SpitId, SpitReading } from '@ninja/shared';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { PHOTOS } from '../photos';
import { C } from '../theme';
import { Photo } from './ui';

export type SpitPhotoProps = { spit: SpitId; reading: SpitReading; thermal: boolean; style?: StyleProp<ViewStyle> };

/** Ninja’s photo of the spit, with a thermal tint when the camera is switched to heat. */
export function SpitPhoto({ thermal, style }: SpitPhotoProps) {
  return (
    <Photo source={PHOTOS['gal-spit']} style={style}>
      {thermal ? <View style={{ position: 'absolute', inset: 0, backgroundColor: C.oxblood, opacity: 0.35 } as never} /> : null}
    </Photo>
  );
}
