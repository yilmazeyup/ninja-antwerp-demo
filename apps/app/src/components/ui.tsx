import * as Haptics from 'expo-haptics';
import { Image, type ImageSource } from 'expo-image';
import { useEffect, useRef, useState, type PropsWithChildren, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { localize, rtl, tr } from '../i18n';
import { C, FONT, fx, isWeb, MAX_WIDTH, R, shadow, web } from '../theme';
import { Icon, type IconName } from './Icon';

export const nativeDriver = Platform.OS !== 'web';

let reduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled()
  .then((on) => {
    reduceMotion = on;
  })
  .catch(() => {});
export const prefersReducedMotion = () => reduceMotion;

export function tap(kind: 'light' | 'medium' | 'success' | 'select' | 'warning' = 'light') {
  if (isWeb) {
    if (kind !== 'light' && typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(kind === 'success' ? [8, 40, 8] : 10);
    return;
  }
  if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else if (kind === 'warning') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  else if (kind === 'select') Haptics.selectionAsync().catch(() => {});
  else Haptics.impactAsync(kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

// ---------------------------------------------------------------------------------------------------------- text

export type Variant = 'mega' | 'hero' | 'display' | 'title' | 'serif' | 'h2' | 'h3' | 'body' | 'small' | 'label' | 'num' | 'stat' | 'data';

/** Wide caps (labels), the reading width (body), and the sensors' mono (numbers): DESIGN.md. */
const VARIANTS: Record<Variant, TextStyle> = {
  mega: { fontFamily: FONT.sans, fontWeight: '800', fontSize: 46, lineHeight: 44, letterSpacing: -0.6, textTransform: 'uppercase' },
  hero: { fontFamily: FONT.sans, fontWeight: '800', fontSize: 34, lineHeight: 34, letterSpacing: -0.4, textTransform: 'uppercase' },
  display: { fontFamily: FONT.sans, fontWeight: '700', fontSize: 27, lineHeight: 30, letterSpacing: -0.5 },
  title: { fontFamily: FONT.sans, fontWeight: '650' as TextStyle['fontWeight'], fontSize: 20, lineHeight: 25, letterSpacing: -0.3 },
  serif: { fontFamily: FONT.serif, fontStyle: 'italic', fontWeight: '500', fontSize: 23, lineHeight: 27, letterSpacing: -0.1 },
  h2: { fontFamily: FONT.sans, fontWeight: '700', fontSize: 17, lineHeight: 22, letterSpacing: -0.15 },
  h3: { fontFamily: FONT.sans, fontWeight: '600', fontSize: 15, lineHeight: 20 },
  body: { fontFamily: FONT.sans, fontWeight: '400', fontSize: 15, lineHeight: 22.5 },
  small: { fontFamily: FONT.sans, fontWeight: '450' as TextStyle['fontWeight'], fontSize: 13, lineHeight: 18.5 },
  label: { fontFamily: FONT.sans, fontWeight: '750' as TextStyle['fontWeight'], fontSize: 10, lineHeight: 13, letterSpacing: 2, textTransform: 'uppercase' },
  num: { fontFamily: FONT.mono, fontWeight: '500', fontSize: 13, lineHeight: 17, letterSpacing: 0.2 },
  stat: { fontFamily: FONT.mono, fontWeight: '300', fontSize: 30, lineHeight: 32, letterSpacing: -0.8 },
  data: { fontFamily: FONT.mono, fontWeight: '200', fontSize: 60, lineHeight: 60, letterSpacing: -2.5 },
};

/** Labels run wide; the big headlines a little less, so a word like VANAVOND still fits a phone. */
const STRETCH: Partial<Record<Variant, string>> = { mega: 'wider', hero: 'wider', label: 'wide' };

type TxtProps = TextProps & {
  v?: Variant;
  color?: string;
  align?: TextStyle['textAlign'];
  /** Chrome or fire letters on the web. */
  ink?: 'chrome' | 'fire';
  weight?: TextStyle['fontWeight'];
  size?: number;
  /** Shown exactly as written, never translated (names, numbers, dish names). */
  raw?: boolean;
  /** Normal width even for a label (tight spaces such as a row of four readings). */
  narrow?: boolean;
};

/** Arabic letters join up; spacing them out would break the script, and it has no capitals. */
const JOINED: TextStyle = { letterSpacing: 0, textTransform: 'none' };

export function Txt({ v = 'body', color = C.ink, align, ink, weight, size, style, raw, narrow, children, ...rest }: TxtProps) {
  const base = VARIANTS[v];
  const sized: TextStyle | null = size ? { fontSize: size, lineHeight: Math.round(size * ((base.lineHeight as number) / (base.fontSize as number))) } : null;
  const names = [
    ink ? `${ink}-text` : '',
    narrow ? '' : (STRETCH[v] ?? ''),
    v === 'num' || v === 'stat' || v === 'data' ? 'tabular narrow' : '',
    v === 'hero' || v === 'display' || v === 'title' || v === 'mega' ? 'balance' : v === 'body' ? 'pretty' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <Text
      {...rest}
      {...fx(names)}
      style={[base, sized, { color: ink && !isWeb ? C.bone : color }, align ? { textAlign: align } : null, weight ? { fontWeight: weight } : null, style, rtl() && v !== 'num' && v !== 'stat' && v !== 'data' ? JOINED : null]}
    >
      {raw ? children : localize(children)}
    </Text>
  );
}

/** A kicker: wide caps after a short chrome rule, in the colour given. */
export function Kicker({ children, color = C.soft, rule = true }: { children: string; color?: string; rule?: boolean }) {
  return (
    <Row gap={9}>
      {rule ? <View {...fx('chrome')} style={{ width: 18, height: 1, backgroundColor: C.chrome, opacity: 0.8 }} /> : null}
      <Txt v="label" color={color}>
        {children}
      </Txt>
    </Row>
  );
}

// ---------------------------------------------------------------------------------------------------------- press

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PressProps = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  scaleTo?: number;
  haptic?: boolean;
  fxNames?: string;
};

/** Anything tappable: it gives a little under the finger and settles back, without bounce. */
export function Press({ style, children, scaleTo = 0.975, haptic = true, onPressIn, onPressOut, onPress, fxNames = '', disabled, ...rest }: PressProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (value: number) => Animated.timing(scale, { toValue: value, duration: value === 1 ? 260 : 120, useNativeDriver: nativeDriver }).start();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      {...rest}
      {...fx(`pointer nosel ${fxNames}`)}
      disabled={disabled}
      onPressIn={(e) => {
        if (!reduceMotion) to(scaleTo);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        to(1);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) tap();
        onPress?.(e);
      }}
      style={[style, { transform: [{ scale }] }, disabled ? { opacity: 0.4 } : null]}
    >
      {children}
    </AnimatedPressable>
  );
}

// ---------------------------------------------------------------------------------------------------------- surfaces

export type Tone = 'leather' | 'oxblood' | 'cognac' | 'glass' | 'flat' | 'travertine' | 'ember';

type CardProps = PropsWithChildren<{ style?: StyleProp<ViewStyle>; pad?: number; radius?: number; tone?: Tone; stitch?: boolean; onPress?: () => void; label?: string }>;

/**
 * A leather panel with a saddle stitch, the house's card. Oxblood for what is Ninja's own, cognac for the club,
 * travertine (light) for the passport, glass over photos, ember for live heat.
 */
export function Card({ style, pad = 18, radius = R.lg, tone = 'leather', stitch, onPress, label, children }: CardProps) {
  const bg =
    tone === 'travertine' ? C.travertine : tone === 'glass' ? C.glass : tone === 'flat' ? C.bg2 : tone === 'oxblood' ? C.oxblood : tone === 'cognac' ? C.cognac : tone === 'ember' ? C.ember : C.panel;
  const stitched = stitch ?? (tone === 'leather' || tone === 'oxblood' || tone === 'cognac');
  const names = [
    tone === 'leather' ? 'leather' : tone === 'oxblood' ? 'oxblood leather' : tone === 'cognac' ? 'cognac leather' : tone === 'glass' ? 'glass' : tone === 'ember' ? 'ember-btn' : '',
    stitched ? 'stitch' : '',
    onPress ? 'lift' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const box: StyleProp<ViewStyle> = [
    { borderRadius: radius, padding: pad, borderWidth: 1, borderColor: tone === 'travertine' ? 'rgba(11,8,7,0.12)' : C.line, backgroundColor: bg, overflow: 'hidden' },
    tone === 'flat' ? null : shadow(1),
    style,
  ];
  if (onPress)
    return (
      <Press onPress={onPress} accessibilityLabel={label} fxNames={names} style={box}>
        {children}
      </Press>
    );
  return (
    <View {...fx(names)} style={box}>
      {children}
    </View>
  );
}

/** A thin chrome rule. */
export const Rule = ({ style }: { style?: StyleProp<ViewStyle> }) => <View {...fx('chrome')} style={[{ height: 1, backgroundColor: C.line2 }, style]} />;

// ---------------------------------------------------------------------------------------------------------- buttons

type ButtonProps = {
  title: string;
  onPress?: () => void;
  icon?: IconName;
  after?: IconName;
  kind?: 'lacquer' | 'bone' | 'ghost' | 'ember' | 'glass';
  size?: 'lg' | 'md' | 'sm';
  full?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  label?: string;
  sub?: string;
};

/** Ninja's oxblood lacquer with a bone edge; bone for the quiet second choice; ember for live moments. */
export function Button({ title, onPress, icon, after, kind = 'lacquer', size = 'md', full, disabled, style, label, sub }: ButtonProps) {
  const h = size === 'lg' ? 58 : size === 'md' ? 50 : 38;
  const color = kind === 'bone' ? C.black : kind === 'ember' ? '#1A0A04' : C.ink;
  const bg: ViewStyle =
    kind === 'lacquer'
      ? { backgroundColor: C.oxblood, borderWidth: 1, borderColor: 'rgba(244,236,225,0.34)' }
      : kind === 'bone'
        ? { backgroundColor: C.ink }
        : kind === 'ember'
          ? { backgroundColor: C.ember }
          : kind === 'glass'
            ? { backgroundColor: C.glass, borderWidth: 1, borderColor: C.line2 }
            : { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.line2 };
  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label ?? tr(title)}
      fxNames={kind === 'lacquer' ? 'lacquer-btn' : kind === 'bone' ? 'bone-btn' : kind === 'ember' ? 'ember-btn' : kind === 'glass' ? 'glass' : ''}
      style={[
        { height: h, paddingHorizontal: size === 'sm' ? 15 : 24, borderRadius: R.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, alignSelf: full ? 'stretch' : 'flex-start' },
        bg,
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={size === 'sm' ? 15 : 18} color={color} stroke={1.7} /> : null}
      <Txt v="label" color={color} size={size === 'lg' ? 12 : size === 'md' ? 11.5 : 10} weight="800" numberOfLines={1} style={{ letterSpacing: 1.9 }}>
        {title}
      </Txt>
      {sub ? (
        <Txt v="num" color={color} size={size === 'lg' ? 13 : 12} style={{ opacity: 0.75 }} raw>
          {sub}
        </Txt>
      ) : null}
      {after ? (
        <Flip>
          <Icon name={after} size={size === 'sm' ? 14 : 17} color={color} stroke={1.7} />
        </Flip>
      ) : null}
    </Press>
  );
}

/** A round icon button on glass, for headers. */
export function IconButton({ name, onPress, label, size = 44, tint, solid }: { name: IconName; onPress?: () => void; label: string; size?: number; tint?: string; solid?: boolean }) {
  return (
    <Press
      onPress={onPress}
      accessibilityLabel={tr(label)}
      fxNames={solid ? 'leather' : 'glass'}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line2, backgroundColor: solid ? C.panel2 : C.glass }}
    >
      <Icon name={name} size={size * 0.44} color={tint ?? C.ink} />
    </Press>
  );
}

/** A colour given as #RRGGBB, see-through: `alpha('#9C242A', 0.2)`. Other colours pass as they are. */
export function alpha(color: string, a: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(color);
  if (!m) return color;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// ---------------------------------------------------------------------------------------------------------- small parts

export function Chip({ label, on, onPress, icon, small, raw }: { label: string; on?: boolean; onPress?: () => void; icon?: IconName; small?: boolean; raw?: boolean }) {
  return (
    <Press
      onPress={onPress}
      scaleTo={0.95}
      accessibilityState={{ selected: !!on }}
      fxNames={on ? 'bone-btn' : ''}
      style={{
        height: small ? 32 : 38,
        paddingHorizontal: small ? 12 : 15,
        borderRadius: R.pill,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderColor: on ? 'transparent' : C.line2,
        backgroundColor: on ? C.ink : 'transparent',
      }}
    >
      {icon ? <Icon name={icon} size={small ? 13 : 15} color={on ? C.black : C.soft} /> : null}
      <Txt v="small" size={small ? 12 : 13} weight="600" color={on ? C.black : C.soft} raw={raw}>
        {label}
      </Txt>
    </Press>
  );
}

export function Tag({ label, color = C.soft, bg = C.glassLight, icon, style, raw }: { label: string; color?: string; bg?: string; icon?: IconName; style?: StyleProp<ViewStyle>; raw?: boolean }) {
  return (
    <View style={[{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: bg, borderWidth: 1, borderColor: C.line }, style]}>
      {icon ? <Icon name={icon} size={11} color={color} stroke={1.8} /> : null}
      <Txt v="label" color={color} size={8.5} style={{ letterSpacing: 1.4 }} raw={raw}>
        {label}
      </Txt>
    </View>
  );
}

/** A small light: an ember while live, off when closed. */
export function LiveDot({ color, off, size = 7 }: { color?: string; off?: boolean; size?: number }) {
  return <View {...fx(off ? '' : 'live')} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: off ? C.faint : (color ?? C.ember) }} />;
}

export function SectionHead({ kicker, title, action, onAction, serif }: { kicker?: string; title: string; action?: string; onAction?: () => void; serif?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
      <View style={{ flex: 1, gap: 7 }}>
        {kicker ? <Kicker>{kicker}</Kicker> : null}
        <Txt v="title">{title}</Txt>
        {serif ? (
          <Txt v="serif" size={18} color={C.soft}>
            {serif}
          </Txt>
        ) : null}
      </View>
      {action ? (
        <Press onPress={onAction} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6 }}>
          <Txt v="label" size={9.5} color={C.amber}>
            {action}
          </Txt>
          <Flip>
            <Icon name="arrow" size={14} color={C.amber} />
          </Flip>
        </Press>
      ) : null}
    </View>
  );
}

export function Row({ children, gap = 10, style, wrap, align = 'center' }: PropsWithChildren<{ gap?: number; style?: StyleProp<ViewStyle>; wrap?: boolean; align?: ViewStyle['alignItems'] }>) {
  return <View style={[{ flexDirection: 'row', alignItems: align, gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>{children}</View>;
}

export const Divider = ({ style }: { style?: StyleProp<ViewStyle> }) => <View style={[{ height: 1, backgroundColor: C.line, marginVertical: 14 }, style]} />;

/** A labelled reading: the value in the sensors' mono, the unit small and dim. */
export function Stat({ label, value, unit, sub, color = C.ink, size = 28 }: { label: string; value: string; unit?: string; sub?: string; color?: string; size?: number }) {
  return (
    <View style={{ gap: 4, flex: 1 }}>
      <Txt v="label" color={C.muted} size={8.5}>
        {label}
      </Txt>
      <Row gap={3} align="flex-end">
        <Txt v="stat" size={size} color={color} raw>
          {value}
        </Txt>
        {unit ? (
          <Txt v="num" size={Math.max(10, size * 0.36)} color={C.muted} style={{ marginBottom: size * 0.12 }} raw>
            {unit}
          </Txt>
        ) : null}
      </Row>
      {sub ? (
        <Txt v="small" size={11.5} color={C.muted}>
          {sub}
        </Txt>
      ) : null}
    </View>
  );
}

/** A thin bar, filled to `value` (0 to 1), in fire by default. */
export function Bar({ value, height = 4, style, color }: { value: number; height?: number; style?: StyleProp<ViewStyle>; color?: string }) {
  return (
    <View style={[{ height, borderRadius: height, backgroundColor: C.line, overflow: 'hidden' }, style]}>
      <View
        {...fx(color ? '' : 'ember-btn')}
        style={[{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height, borderRadius: height, backgroundColor: color ?? C.ember }, web({ transition: 'width .8s cubic-bezier(.2,.9,.25,1)' })]}
      />
    </View>
  );
}

let ringSeq = 0;

/** A gauge ring, fire running round it; content in the middle. */
export function Ring({ value, size = 64, stroke = 5, from = '#FFB547', to = '#FF6A2A', track, children }: PropsWithChildren<{ value: number; size?: number; stroke?: number; from?: string; to?: string; track?: string }>) {
  const id = useRef(`ring-${++ringSeq}`).current;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track ?? 'rgba(244,236,225,0.09)'} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={`url(#${id})`} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${c * v} ${c}`} />
      </Svg>
      {children}
    </View>
  );
}

/** For what a live installation would really do: here it is the demo. */
export function DemoNote({ text, icon = 'info' }: { text: string; icon?: IconName }) {
  return (
    <Row gap={9} align="flex-start" style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: R.sm, borderWidth: 1, borderColor: C.line, borderStyle: 'dashed' }}>
      <Icon name={icon} size={14} color={C.muted} />
      <Txt v="small" size={12} color={C.muted} style={{ flex: 1 }}>
        {text}
      </Txt>
    </Row>
  );
}

/** Fades its content in once, rising a few points: slow, like everything in the house. */
export function PopIn({ delay = 0, children, style }: PropsWithChildren<{ delay?: number; style?: StyleProp<ViewStyle> }>) {
  const progress = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  useEffect(() => {
    if (reduceMotion) return;
    const animation = Animated.timing(progress, { toValue: 1, delay, duration: 620, useNativeDriver: nativeDriver });
    animation.start();
    return () => animation.stop();
  }, [progress, delay]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** A segmented switch of two to four choices. */
export function Segments<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string; icon?: IconName }[]; onChange: (id: T) => void }) {
  return (
    <Row gap={4} style={{ padding: 4, borderRadius: R.pill, backgroundColor: C.bg2, borderWidth: 1, borderColor: C.line }}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Press
            key={o.id}
            onPress={() => onChange(o.id)}
            scaleTo={0.96}
            accessibilityState={{ selected: on }}
            fxNames={on ? 'leather' : ''}
            style={{ flex: 1, height: 38, borderRadius: R.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: on ? C.panel3 : 'transparent', borderWidth: on ? 1 : 0, borderColor: C.line2 }}
          >
            {o.icon ? <Icon name={o.icon} size={14} color={on ? C.ink : C.muted} /> : null}
            <Txt v="label" size={9.5} color={on ? C.ink : C.muted} numberOfLines={1}>
              {o.label}
            </Txt>
          </Press>
        );
      })}
    </Row>
  );
}

/** A row in a list: an icon or a picture, a title, a line under it, and something on the right. */
export function ListItem({
  icon,
  title,
  sub,
  right,
  onPress,
  left,
  last,
  chevron = !!onPress,
  raw,
}: {
  icon?: IconName;
  title: string;
  sub?: string;
  right?: ReactNode;
  onPress?: () => void;
  left?: ReactNode;
  last?: boolean;
  chevron?: boolean;
  raw?: boolean;
}) {
  const body = (
    <Row gap={14} style={{ paddingVertical: 13, borderBottomWidth: last ? 0 : 1, borderColor: C.line }}>
      {left ??
        (icon ? (
          <View style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line2 }}>
            <Icon name={icon} size={18} color={C.soft} />
          </View>
        ) : null)}
      <View style={{ flex: 1, gap: 2 }}>
        <Txt v="h3" raw={raw}>
          {title}
        </Txt>
        {sub ? (
          <Txt v="small" color={C.muted} numberOfLines={2}>
            {sub}
          </Txt>
        ) : null}
      </View>
      {right}
      {chevron ? (
        <Flip>
          <Icon name="chevron" size={16} color={C.muted} />
        </Flip>
      ) : null}
    </Row>
  );
  return onPress ? (
    <Press onPress={onPress} scaleTo={0.99} accessibilityLabel={tr(title)}>
      {body}
    </Press>
  ) : (
    body
  );
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Switch
      value={value}
      onValueChange={(v) => {
        tap('select');
        onChange(v);
      }}
      accessibilityLabel={tr(label)}
      trackColor={{ false: 'rgba(244,236,225,0.16)', true: '#9C242A' }}
      thumbColor="#F4ECE1"
      {...(isWeb ? ({ activeThumbColor: '#F4ECE1' } as object) : {})}
    />
  );
}

export function Field({ style, ...props }: TextInputProps & { style?: StyleProp<TextStyle> }) {
  return (
    <TextInput
      placeholderTextColor="#5C5047"
      {...props}
      placeholder={props.placeholder ? tr(props.placeholder) : undefined}
      style={[
        { height: 52, borderRadius: R.md, borderWidth: 1, borderColor: C.line2, backgroundColor: C.bg2, paddingHorizontal: 16, color: C.ink, fontFamily: FONT.sans, fontSize: 16 },
        web({ outlineStyle: 'none' }),
        style,
      ]}
    />
  );
}

/** A sheet that rises from the bottom over a darkened screen, in leather. */
export function Sheet({ open, onClose, title, children, tall }: PropsWithChildren<{ open: boolean; onClose: () => void; title?: string; tall?: boolean }>) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable onPress={onClose} accessibilityLabel={tr('Sluiten')} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(5,3,2,0.66)' } as ViewStyle} />
        <View
          {...fx('leather')}
          style={[
            { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', maxHeight: tall ? '92%' : '82%', borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: C.panel, borderWidth: 1, borderColor: C.line2, paddingBottom: insets.bottom + 16 },
            shadow(3),
          ]}
        >
          <View style={{ alignItems: 'center', paddingTop: 10 }}>
            <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: C.line2 }} />
          </View>
          {title ? (
            <Row style={{ paddingHorizontal: 22, paddingTop: 14, paddingBottom: 6, justifyContent: 'space-between' }}>
              <Txt v="title" style={{ flex: 1 }}>
                {title}
              </Txt>
              <IconButton name="close" label="Sluiten" size={38} onPress={onClose} solid />
            </Row>
          ) : null}
          <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 10, paddingBottom: 10, gap: 14 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** Mirrors an arrow-like icon in right-to-left languages. */
export const Flip = ({ children }: PropsWithChildren) => <View style={rtl() ? { transform: [{ scaleX: -1 }] } : null}>{children}</View>;

// ---------------------------------------------------------------------------------------------------------- the house's own parts

/** The seal on every passport: 忍 pressed into oxblood, a little crooked, as if stamped by hand. */
export function Seal({ size = 46, kanji = '忍', rotate = -6 }: { size?: number; kanji?: string; rotate?: number }) {
  return (
    <View
      {...fx('seal')}
      style={{ width: size, height: size, borderRadius: size * 0.22, backgroundColor: C.oxblood, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: `${rotate}deg` }] }}
    >
      <Text style={{ fontFamily: FONT.kanji, fontWeight: '800', fontSize: size * 0.56, color: C.bone, lineHeight: size * 0.7 }}>{kanji}</Text>
    </View>
  );
}

/** "No. 216 875": a serial in the sensors' mono, thin spaces between the thousands. */
export function Serial({ no, size = 12, color = C.soft, prefix = 'No.' }: { no: number; size?: number; color?: string; prefix?: string }) {
  return (
    <Txt v="num" size={size} color={color} style={{ letterSpacing: size * 0.12 }} raw>
      {`${prefix} ${String(no).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`}
    </Txt>
  );
}

/** A number that rolls to its new value instead of jumping: for sensor readings. */
export function Num({ value, digits = 1, v = 'stat', size, color, unit, unitColor }: { value: number; digits?: number; v?: Variant; size?: number; color?: string; unit?: string; unitColor?: string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    if (start === value || reduceMotion) {
      from.current = value;
      setShown(value);
      return;
    }
    const t0 = Date.now();
    const id = setInterval(() => {
      const k = Math.min(1, (Date.now() - t0) / 700);
      const e = 1 - Math.pow(1 - k, 3);
      const now = start + (value - start) * e;
      from.current = now;
      setShown(now);
      if (k >= 1) clearInterval(id);
    }, 33);
    return () => clearInterval(id);
  }, [value]);
  const text = shown.toFixed(digits).replace('.', ',');
  return (
    <Row gap={2} align="flex-start">
      <Txt v={v} size={size} color={color} raw>
        {text}
      </Txt>
      {unit ? (
        <Txt v="num" size={Math.max(9, (size ?? 30) * 0.32)} color={unitColor ?? C.muted} style={{ marginTop: (size ?? 30) * 0.12 }} raw>
          {unit}
        </Txt>
      ) : null}
    </Row>
  );
}

/** One of Ninja's photos with the grain of their flash film and the light falling off at the edges. */
export function Photo({ source, style, radius = 0, position, film = true, children }: PropsWithChildren<{ source?: ImageSource | number; style?: StyleProp<ViewStyle>; radius?: number; position?: { top?: string | number; left?: string | number }; film?: boolean }>) {
  return (
    <View {...fx(film ? 'film' : '')} style={[{ overflow: 'hidden', borderRadius: radius, backgroundColor: C.panel2 }, style]}>
      {source ? <Image source={source} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' } as never} contentFit="cover" contentPosition={position} transition={350} /> : null}
      {children}
    </View>
  );
}
