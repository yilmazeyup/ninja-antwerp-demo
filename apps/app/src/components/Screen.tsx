import { router } from 'expo-router';
import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, fx, MAX_WIDTH, PAD } from '../theme';
import { Flip, IconButton, Kicker, Txt } from './ui';

/** The ground behind every screen: black lacquer with the fire's glow drifting low. */
export function Backdrop({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View pointerEvents="none" {...fx('lacquer')} style={[StyleSheet.absoluteFill, { backgroundColor: C.bg }, style]} />;
}

type ScreenProps = PropsWithChildren<{
  title?: string;
  kicker?: string;
  serif?: string;
  /** Shows a back button; on a fresh deep link with no history it goes home. */
  back?: boolean;
  right?: ReactNode;
  /** Inside the tabs: room at the bottom for the tab bar. */
  tabs?: boolean;
  /** Full-bleed content above the padded column. */
  hero?: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  footer?: ReactNode;
  gap?: number;
  /** The title in the big wide caps instead of the display face. */
  loud?: boolean;
}>;

export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export function Screen({ title, kicker, serif, back, right, tabs, hero, scroll = true, contentStyle, footer, gap = 18, loud, children }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const header =
    title || back || right ? (
      <View style={{ paddingTop: insets.top + 10, paddingHorizontal: PAD, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
          {back ? (
            <Flip>
              <IconButton name="back" label="Terug" onPress={goBack} />
            </Flip>
          ) : (
            <View />
          )}
          {right ?? <View />}
        </View>
        {title ? (
          <View style={{ gap: 9, marginTop: 4 }}>
            {kicker ? <Kicker color={C.amber}>{kicker}</Kicker> : null}
            <Txt v={loud ? 'hero' : 'display'}>{title}</Txt>
            {serif ? (
              <Txt v="serif" size={20} color={C.soft}>
                {serif}
              </Txt>
            ) : null}
          </View>
        ) : null}
      </View>
    ) : null;

  const body = (
    <View style={{ width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' }}>
      {header}
      {hero}
      <View style={[{ paddingHorizontal: PAD, paddingTop: 20, gap }, contentStyle]}>{children}</View>
      <View style={{ height: (tabs ? 136 : 52) + insets.bottom + (footer ? 92 : 0) }} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Backdrop />
      {scroll ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {body}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{body}</View>
      )}
      {footer ? (
        <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom + 14, paddingTop: 14, paddingHorizontal: PAD, alignItems: 'center' }}>
          <View {...fx('glass-strong')} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: C.glass, borderTopWidth: 1, borderColor: C.line }} />
          <View style={{ width: '100%', maxWidth: MAX_WIDTH - PAD * 2 }}>{footer}</View>
        </View>
      ) : null}
    </View>
  );
}
