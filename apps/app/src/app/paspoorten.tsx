import { addDays, clockSeconds, dateShort, evening, formatNo, isOpenDay, passportOf, startOfDay, type Passport } from '@ninja/shared';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { Screen } from '../components/Screen';
import { Card, Kicker, Press, Row, Seal, Txt } from '../components/ui';
import { tr } from '../i18n';
import { useApp } from '../state/app';
import { C } from '../theme';

/** Her earlier visits, for the demo: one of the evening's Iskenders on each of her last open evenings. */
function earlier(today: Date): Passport[] {
  const out: Passport[] = [];
  for (let back = 3; out.length < 6 && back < 60; back += 4) {
    const day = startOfDay(addDays(today, -back));
    if (!isOpenDay(day)) continue;
    const ev = evening(day);
    const plate = ev.plates.find((p) => p.dish === 'iskender' && p.meat === 'mix') ?? ev.plates[Math.floor(ev.plates.length / 2)];
    if (plate) out.push(passportOf(ev, plate));
  }
  return out;
}

function Stamp({ p }: { p: Passport }) {
  return (
    <Press onPress={() => router.push(`/paspoort/${p.no}`)} accessibilityLabel={tr('Paspoort')} style={{ width: '48%' as never }}>
      <Card tone="travertine" pad={14}>
        <Row style={{ justifyContent: 'space-between' }} align="flex-start">
          <Seal size={34} rotate={(p.no % 13) - 6} />
          <Txt v="num" size={9} color="#4A3B31" raw>
            {dateShort(new Date(Number(p.dayKey.slice(0, 4)), Number(p.dayKey.slice(5, 7)) - 1, Number(p.dayKey.slice(8, 10))))}
          </Txt>
        </Row>
        <Txt v="num" size={10} color="#7B151A" style={{ marginTop: 12, letterSpacing: 1.4 }} raw>
          {`No. ${formatNo(p.no)}`}
        </Txt>
        <Txt v="h3" color="#0B0807" numberOfLines={1} raw>
          {p.dishName}
        </Txt>
        <Txt v="num" size={10.5} color="#4A3B31" raw>
          {`${clockSeconds(p.carved)} · ${p.core.toFixed(1).replace('.', ',')} °C`}
        </Txt>
      </Card>
    </Press>
  );
}

export default function Passports() {
  const { passports, now } = useApp();
  const past = useMemo(() => earlier(now), [now]);
  const mine = [...passports].reverse();
  return (
    <Screen back title="Mijn paspoorten" kicker="Een verzameling" serif="Elk bord van de spies, met zijn eigen nummer.">
      {mine.length ? (
        <View style={{ gap: 12 }}>
          <Kicker color={C.amber}>Vanavond</Kicker>
          <Row gap={12} wrap>
            {mine.map((p) => (
              <Stamp key={p.no} p={p} />
            ))}
          </Row>
        </View>
      ) : (
        <Card pad={18}>
          <Txt v="h3">Nog geen paspoort vanavond</Txt>
          <Txt v="small" color={C.soft} style={{ marginTop: 4 }}>
            Bestel iets van de spies: Baran snijdt het, en je krijgt het paspoort meteen in de app.
          </Txt>
        </Card>
      )}
      <View style={{ gap: 12 }}>
        <Kicker>Eerdere bezoeken</Kicker>
        <Row gap={12} wrap>
          {past.map((p) => (
            <Stamp key={p.no} p={p} />
          ))}
        </Row>
        <Txt v="small" size={11.5} color={C.muted}>
          De eerdere bezoeken zijn voor de demo samengesteld uit vorige avonden.
        </Txt>
      </View>
    </Screen>
  );
}
