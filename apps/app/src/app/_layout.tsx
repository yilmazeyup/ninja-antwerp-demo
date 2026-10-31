import { router, Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Intro } from '../components/Intro';
import { ToastProvider, useToast } from '../components/Toast';
import { installLocale, tr } from '../i18n';
import { AppProvider, useApp } from '../state/app';
import { useAutopilot } from '../state/autopilot';
import { C } from '../theme';
import { installWebStyles } from '../web/css';
import { dishById, formatNo, personaById, tableById } from '@ninja/shared';

installLocale();
installWebStyles();
SplashScreen.preventAutoHideAsync().catch(() => {});

/** What the floor does arrives here as a notification, like a push message would. */
function FloorNotes() {
  const { bridge, passports } = useApp();
  const toast = useToast();
  const path = usePathname();
  const here = useRef(path);
  here.current = path;
  const seen = useRef<number>(Date.now());
  useAutopilot();
  useEffect(() => {
    const fresh = bridge.events.filter((e) => e.at > seen.current);
    if (!fresh.length) return;
    seen.current = Math.max(...fresh.map((e) => e.at));
    for (const e of fresh) {
      if (e.kind === 'line-call') toast(tr('Je tafel is klaar'), { text: tr('Noor houdt {table} voor je vrij. Kom maar binnen.').replace('{table}', tr(tableById(e.table)?.label ?? e.table)), icon: 'table', onPress: () => router.push('/rij') });
      if (e.kind === 'carve') {
        const p = passports.find((x) => x.carved === e.minute && x.dish === e.dish);
        toast(tr('Vers gesneden: {dish}').replace('{dish}', dishById(e.dish).name), {
          text: tr('Paspoort No. {no} · {core} °C').replace('{no}', p ? formatNo(p.no) : '…').replace('{core}', e.core.toFixed(1).replace('.', ',')),
          icon: 'knife',
          onPress: () => (p ? router.push(`/paspoort/${p.no}`) : router.push('/paspoorten')),
        });
      }
      if (e.kind === 'call-ok') toast(tr('{by} komt eraan').replace('{by}', e.by), { icon: 'hand' });
      if (e.kind === 'cay-done') {
        const sent = bridge.events.find((x) => x.id === e.ref);
        const what = sent && sent.kind === 'cay' ? dishById(sent.dish).name : 'Çay';
        toast(tr('{drink} is gebracht').replace('{drink}', tr(what)), { text: tr('Met jouw kaartje erbij.'), icon: 'cay' });
      }
      if (e.kind === 'match-chat' && !e.mine && here.current !== `/match/${e.persona}`) {
        const p = personaById(e.persona);
        toast(tr('{name} stuurt je een bericht').replace('{name}', p?.name ?? ''), { text: tr(e.text), icon: 'chat', onPress: () => router.push(`/match/${e.persona}`) });
      }
      if (e.kind === 'match-mutual') {
        const p = personaById(e.persona);
        toast(tr('Het is wederzijds'), { text: tr('{name} vindt jou ook leuk. Zeg iets.').replace('{name}', p?.name ?? ''), icon: 'match', onPress: () => router.push(`/match/${e.persona}`) });
      }
      if (e.kind === 'wall' && e.ok) toast(tr('Je foto staat op de Wall'), { text: tr('Op het scherm in de zaal en op de website.'), icon: 'flash' });
      if (e.kind === 'fresh-spit') toast(tr('Verse spies aan het vuur'), { text: tr('De eerste snede over ongeveer veertig minuten.'), icon: 'fire', onPress: () => router.push('/spies') });
      if (e.kind === 'feedback-reply') toast(tr('Antwoord van {by}').replace('{by}', e.by), { text: tr(e.text), icon: 'chat', onPress: () => router.push('/feedback') });
      if (e.kind === 'spit-step') toast(tr('Je eigen spies: een stap verder'), { icon: 'spit', onPress: () => router.push('/eigen-spies') });
    }
  }, [bridge, toast, passports]);
  return null;
}

export default function RootLayout() {
  // The opening plays each time the app starts; on the web ?intro=0 skips it (for screenshots and deep links).
  const [intro, setIntro] = useState(() => !(Platform.OS === 'web' && new URLSearchParams(globalThis.location?.search ?? '').get('intro') === '0'));
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);
  return (
    <SafeAreaProvider>
      <AppProvider>
        <ToastProvider>
          <View style={{ flex: 1, backgroundColor: C.bg }}>
            <StatusBar style="light" />
            <FloorNotes />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'fade_from_bottom' }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="flash" options={{ animation: 'fade' }} />
              <Stack.Screen name="spies" options={{ animation: 'fade' }} />
            </Stack>
            {intro ? <Intro onDone={() => setIntro(false)} /> : null}
          </View>
        </ToastProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}
