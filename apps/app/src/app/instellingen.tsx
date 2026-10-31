import { getLocale, LOCALE_NAMES, LOCALE_TAGS, LOCALES, resetBridge, type Locale } from '@ninja/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { Button, Card, DemoNote, Kicker, Press, Row, Sheet, Toggle, Txt } from '../components/ui';
import { chooseLocale, rtl } from '../i18n';
import { resetSaved, useApp, type Diet } from '../state/app';
import { C, isWeb, R } from '../theme';
import { resetSocial, setSocial } from '../social/store';

const DIET: { key: keyof Diet; label: string; line: string }[] = [
  { key: 'veg', label: 'Vegetarisch', line: 'Falafel en dips voorop; de frieten in rundvet vallen weg.' },
  { key: 'gluten', label: 'Zonder gluten', line: 'Lavash, desembrood en de durum krijgen een waarschuwing.' },
  { key: 'melk', label: 'Zonder melk', line: 'Yoghurt, schapenboter en de rijstpudding.' },
  { key: 'sesam', label: 'Zonder sesam', line: 'Hummus, tahin en za’atar.' },
  { key: 'noten', label: 'Zonder noten', line: 'De pistache op de rijstpudding.' },
];

/** The quiet settings: language, diet, notifications, Match, and starting the demo over. */
export default function Instellingen() {
  const { saved, update } = useApp();
  const [reset, setReset] = useState(false);
  const current = getLocale();

  const startOver = () => {
    resetBridge();
    resetSaved();
    resetSocial();
    if (isWeb && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.pathname = url.pathname.replace(/\/instellingen$/, '/');
      url.searchParams.set('intro', '0');
      window.location.replace(url.toString());
    } else router.replace('/');
  };

  return (
    <Screen back kicker="Instellingen" title="Zoals jij het wil" gap={22}>
      <View style={{ gap: 10 }}>
        <Kicker>Taal</Kicker>
        <Card tone="leather" pad={6}>
          {LOCALES.map((l: Locale, i) => {
            const on = l === current;
            return (
              <Press key={l} onPress={() => !on && chooseLocale(l)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={LOCALE_NAMES[l]} scaleTo={0.99}>
                <Row style={{ paddingVertical: 13, paddingHorizontal: 12, borderBottomWidth: i < LOCALES.length - 1 ? 1 : 0, borderColor: C.line }}>
                  <Txt v="h3" raw style={{ flex: 1, textAlign: rtl() ? 'right' : 'left' }}>
                    {LOCALE_NAMES[l]}
                  </Txt>
                  <Txt v="num" size={10} color={C.faint} raw>
                    {LOCALE_TAGS[l]}
                  </Txt>
                  <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: on ? C.amber : C.line2, alignItems: 'center', justifyContent: 'center' }}>
                    {on ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.amber }} /> : null}
                  </View>
                </Row>
              </Press>
            );
          })}
        </Card>
      </View>

      <View style={{ gap: 10 }}>
        <Kicker>Dieet en allergieën</Kicker>
        <Card tone="leather" pad={6}>
          {DIET.map((d, i) => (
            <Row key={d.key} gap={12} style={{ paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: i < DIET.length - 1 ? 1 : 0, borderColor: C.line }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt v="h3">{d.label}</Txt>
                <Txt v="small" size={12} color={C.muted}>
                  {d.line}
                </Txt>
              </View>
              <Toggle value={saved.diet[d.key]} label={d.label} onChange={(v) => update((s) => ({ diet: { ...s.diet, [d.key]: v } }))} />
            </Row>
          ))}
        </Card>
        <Txt v="small" size={11.5} color={C.faint}>
          De menukaart en Sensei houden er rekening mee. De keuken bevestigt allergenen altijd.
        </Txt>
      </View>

      <View style={{ gap: 10 }}>
        <Kicker>Meldingen en Match</Kicker>
        <Card tone="leather" pad={6}>
          <Row gap={12} style={{ paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderColor: C.line }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt v="h3">Meldingen</Txt>
              <Txt v="small" size={12} color={C.muted}>
                Je tafel, je bord van de spies, drops voor je rang.
              </Txt>
            </View>
            <Toggle value={saved.push} label="Meldingen" onChange={(v) => update({ push: v })} />
          </Row>
          <Row gap={12} style={{ paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderColor: C.line }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt v="h3">Ninja Match</Txt>
              <Txt v="small" size={12} color={C.muted}>
                Zichtbaar voor wie hier nu is, tot 22:00.
              </Txt>
            </View>
            <Toggle value={saved.match.on} label="Ninja Match" onChange={(v) => (v ? router.push('/match') : update((s) => ({ match: { ...s.match, on: false } })))} />
          </Row>
          <Press
            onPress={() => {
              setSocial({ selfie: null, selfieFrom: null });
              update((s) => ({ match: { ...s.match, on: false, photo: '' } }));
            }}
            scaleTo={0.99}
          >
            <Row gap={12} style={{ paddingVertical: 14, paddingHorizontal: 12 }}>
              <Icon name="eyeOff" size={18} color={C.soft} />
              <Txt v="h3" style={{ flex: 1 }}>
                Wis mijn Match-foto
              </Txt>
            </Row>
          </Press>
        </Card>
      </View>

      <Card tone="flat" pad={18}>
        <Row gap={12} align="flex-start">
          <Icon name="lock" size={18} color={C.soft} />
          <View style={{ flex: 1, gap: 4 }}>
            <Txt v="h3">Je gegevens</Txt>
            <Txt v="small" color={C.muted}>
              In deze demo blijft alles op dit toestel. Niets gaat naar een server.
            </Txt>
          </View>
        </Row>
      </Card>

      <View style={{ gap: 10 }}>
        <Button title="Demo opnieuw" kind="ghost" full icon="refresh" onPress={() => setReset(true)} />
        <Txt v="small" size={11.5} color={C.faint} align="center">
          Wist je bestellingen, Match, foto’s, boekingen en alles wat het panel deed.
        </Txt>
      </View>
      <View style={{ alignItems: 'center', gap: 2, paddingTop: 6, borderRadius: R.md }}>
        <Txt v="label" size={8} color={C.faint}>
          Ninja Antwerp · demo
        </Txt>
        <Txt v="num" size={9} color={C.faint} raw>
          Vlaamsekaai 52 · BE0648796376
        </Txt>
      </View>
      <DemoNote text="Een voorstel voor Ninja. Het menu, de prijzen, het adres en de foto’s zijn echt; gasten, team en sensoren zijn demo." />

      <Sheet open={reset} onClose={() => setReset(false)} title="Demo opnieuw?">
        <Txt v="body" color={C.soft}>
          Alles begint opnieuw: de rij, je bestellingen, paspoorten, Match, de Wall, je spies en wat het panel deed.
        </Txt>
        <Button title="Begin opnieuw" kind="lacquer" full icon="refresh" onPress={startOver} />
      </Sheet>
    </Screen>
  );
}
