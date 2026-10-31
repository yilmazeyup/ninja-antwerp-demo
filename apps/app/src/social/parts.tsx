import { useEffect, useRef, type PropsWithChildren, type ReactNode } from 'react';
import { Animated, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '../components/Icon';
import { tr } from '../i18n';
import { nativeDriver, Photo, prefersReducedMotion, Press, Row, Txt } from '../components/ui';
import { C, fx, R, web } from '../theme';

/** Faces sit in the upper third of a portrait. */
const TOP_THIRD = { top: '28%', left: '50%' };

/** A portrait as Ninja's film would print it, with a deep shade at the bottom for the words on top. */
export function Portrait({ source, style, radius = R.xl, shade = 0.85, children, position = TOP_THIRD, film = true }: PropsWithChildren<{ source?: number | { uri: string }; style?: StyleProp<ViewStyle>; radius?: number; shade?: number; position?: { top?: string | number; left?: string | number }; film?: boolean }>) {
  return (
    <Photo source={source} radius={radius} style={style} position={position} film={film}>
      {shade > 0 ? (
        <View
          pointerEvents="none"
          style={[
            { position: 'absolute', left: 0, right: 0, bottom: 0, height: '62%' },
            web({ backgroundImage: `linear-gradient(180deg, rgba(11,8,7,0) 0%, rgba(11,8,7,${shade * 0.55}) 42%, rgba(11,8,7,${shade}) 100%)` }),
          ]}
        />
      ) : null}
      {children}
    </Photo>
  );
}

/** A round portrait in a chrome bezel. */
export function Avatar({ source, size = 44, ring = true, dot }: { source?: number | { uri: string }; size?: number; ring?: boolean; dot?: boolean }) {
  return (
    <View style={{ width: size, height: size }}>
      {ring ? <View {...fx('chrome-ring')} style={{ position: 'absolute', inset: -1.5, borderRadius: size, opacity: 0.7 } as ViewStyle} /> : null}
      <Photo source={source} radius={size / 2} film={false} style={{ position: 'absolute', inset: ring ? 1 : 0, borderRadius: size / 2 } as ViewStyle} />
      {dot ? <View {...fx('live')} style={{ position: 'absolute', right: 0, top: 0, width: size * 0.24, height: size * 0.24, borderRadius: size, backgroundColor: C.ember, borderWidth: 2, borderColor: C.bg }} /> : null}
    </View>
  );
}

/** Three embers that breathe while someone types. */
export function Typing({ color = C.soft }: { color?: string }) {
  const v = useRef([0, 1, 2].map(() => new Animated.Value(0.25))).current;
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const loops = v.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(d, { toValue: 1, duration: 380, useNativeDriver: nativeDriver }),
          Animated.timing(d, { toValue: 0.25, duration: 420, useNativeDriver: nativeDriver }),
          Animated.delay((2 - i) * 160),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [v]);
  return (
    <Row gap={5} style={{ height: 14 }}>
      {v.map((d, i) => (
        <Animated.View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, opacity: d }} />
      ))}
    </Row>
  );
}

/** A chat bubble: hers in oxblood lacquer on the end side, theirs in leather. */
export function Bubble({ mine, text, time, raw = true }: { mine: boolean; text: string; time?: string; raw?: boolean }) {
  return (
    <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '82%', gap: 4, alignItems: mine ? 'flex-end' : 'flex-start' }}>
      <View
        {...fx(mine ? 'oxblood' : 'leather')}
        style={{
          paddingHorizontal: 15,
          paddingVertical: 11,
          borderRadius: 20,
          borderBottomRightRadius: mine ? 6 : 20,
          borderBottomLeftRadius: mine ? 20 : 6,
          backgroundColor: mine ? C.oxblood : C.panel2,
          borderWidth: 1,
          borderColor: mine ? 'rgba(244,236,225,0.18)' : C.line2,
        }}
      >
        <Txt v="body" size={15} raw={raw}>
          {text}
        </Txt>
      </View>
      {time ? (
        <Txt v="num" size={9.5} color={C.faint} raw>
          {time}
        </Txt>
      ) : null}
    </View>
  );
}

/** A short line from the floor inside a chat, centred, like a note on the table. */
export function FloorNote({ icon = 'table', children }: { icon?: IconName; children: ReactNode }) {
  return (
    <Row gap={10} align="flex-start" style={{ alignSelf: 'stretch', padding: 13, borderRadius: R.md, borderWidth: 1, borderColor: C.line2, borderStyle: 'dashed', backgroundColor: 'rgba(244,236,225,0.03)' }}>
      <Icon name={icon} size={16} color={C.amber} />
      <View style={{ flex: 1 }}>{children}</View>
    </Row>
  );
}

/** A reading in a small tile: label in wide caps, the number in the sensors' mono. */
export function Reading({ label, value, unit, tone = C.ink, style }: { label: string; value: string; unit?: string; tone?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flex: 1, gap: 6, paddingVertical: 12, paddingHorizontal: 12, borderRadius: R.md, borderWidth: 1, borderColor: C.line, backgroundColor: 'rgba(244,236,225,0.025)' }, style]}>
      <Txt v="label" size={8} color={C.muted} numberOfLines={1}>
        {label}
      </Txt>
      <Row gap={3} align="flex-end">
        <Txt v="stat" size={22} color={tone} raw numberOfLines={1}>
          {value}
        </Txt>
        {unit ? (
          <Txt v="num" size={10} color={C.muted} style={{ marginBottom: 3 }} raw>
            {unit}
          </Txt>
        ) : null}
      </Row>
    </View>
  );
}

/** A round button for the Match deck: pass, a drink, like. */
export function RoundAction({ icon, label, onPress, size = 60, kind = 'ghost' }: { icon: IconName; label: string; onPress: () => void; size?: number; kind?: 'ghost' | 'bone' | 'lacquer' }) {
  const color = kind === 'bone' ? C.black : C.ink;
  return (
    <View style={{ alignItems: 'center', gap: 7 }}>
      <Press
        onPress={onPress}
        scaleTo={0.92}
        accessibilityLabel={tr(label)}
        fxNames={kind === 'lacquer' ? 'lacquer-btn' : kind === 'bone' ? 'bone-btn' : 'glass'}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: kind === 'lacquer' ? C.oxblood : kind === 'bone' ? C.ink : C.glass,
          borderWidth: 1,
          borderColor: kind === 'lacquer' ? 'rgba(244,236,225,0.34)' : kind === 'bone' ? 'transparent' : C.line2,
        }}
      >
        <Icon name={icon} size={size * 0.38} color={color} stroke={1.6} />
      </Press>
      <Txt v="label" size={8} color={C.muted}>
        {label}
      </Txt>
    </View>
  );
}

/** A thin chrome frame with a caption, for the objects the app shows off (the card, the plate, the screen). */
export function Plinth({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return (
    <View style={[{ alignItems: 'center', paddingVertical: 8 }, style]}>
      {children}
      <View style={[{ width: '70%', height: 18, marginTop: -4, opacity: 0.6 }, web({ backgroundImage: 'radial-gradient(50% 50% at 50% 0%, rgba(0,0,0,.65), rgba(0,0,0,0))' })]} />
    </View>
  );
}
