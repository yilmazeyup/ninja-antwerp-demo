import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tr } from '../i18n';
import { BRAND } from '../photos';
import { C, fx, MAX_WIDTH } from '../theme';
import { Icon, type IconName } from './Icon';
import { Press, Txt } from './ui';

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Vanavond', icon: 'fire' },
  menu: { label: 'Menu', icon: 'menu' },
  match: { label: 'Match', icon: 'match' },
  clan: { label: 'Clan', icon: 'clan' },
};

/**
 * A floating bar of black glass with a chrome edge; in the middle, Ninja's own puffy leather N, raised: it opens the
 * Flash camera, because what happens at Ninja is meant to be shared.
 */
export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const routes = state.routes.filter((r) => TABS[r.name]);
  const left = routes.slice(0, 2);
  const right = routes.slice(2);
  const item = (route: (typeof routes)[number]) => {
    const tab = TABS[route.name];
    const index = state.routes.indexOf(route);
    const focused = state.index === index;
    return (
      <Press
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={tr(tab.label)}
        scaleTo={0.92}
        onPress={() => {
          if (!focused) navigateToTab(route.key);
        }}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5, height: 62 }}
      >
        <Icon name={tab.icon} size={21} color={focused ? C.ink : C.muted} stroke={focused ? 1.7 : 1.4} />
        <Txt v="small" size={9} weight="700" numberOfLines={1} color={focused ? C.ink : C.muted} style={{ letterSpacing: 1.2, textTransform: 'uppercase' }}>
          {tab.label}
        </Txt>
        <View style={{ position: 'absolute', bottom: 4, width: 14, height: 1.5, borderRadius: 1, backgroundColor: focused ? C.ember : 'transparent' }} />
      </Press>
    );
  };
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: Math.max(insets.bottom, 12) + 4, alignItems: 'center' }}>
      <View
        {...fx('glass-strong')}
        style={{ width: '92%', maxWidth: MAX_WIDTH - 36, height: 66, borderRadius: 33, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, borderWidth: 1, borderColor: C.line2, backgroundColor: C.glass }}
      >
        {left.map(item)}
        <Press
          accessibilityLabel={tr('Flash-camera')}
          scaleTo={0.9}
          onPress={() => router.push('/flash')}
          fxNames="leather"
          style={{ width: 66, height: 66, borderRadius: 33, marginHorizontal: 4, marginTop: -30, backgroundColor: C.panel2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line2 }}
        >
          <View {...fx('chrome-ring')} style={{ position: 'absolute', inset: -2, borderRadius: 35, opacity: 0.55 } as never} />
          <View style={{ position: 'absolute', inset: 1, borderRadius: 32, backgroundColor: C.bg2 } as never} />
          <Image source={BRAND.n} style={{ width: 40, height: 37 }} contentFit="contain" />
        </Press>
        {right.map(item)}
      </View>
    </View>
  );
}
