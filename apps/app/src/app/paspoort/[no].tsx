import {
  clockSeconds,
  COUNTRY_NAMES,
  dayLong,
  dayOfPassport,
  findAnyPassport,
  formatNo,
  INGREDIENTS,
  tableById,
  type Passport,
} from '@ninja/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { Platform, Share, View } from 'react-native';
import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg';

import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { Button, Card, Kicker, PopIn, Row, Seal, Txt } from '../../components/ui';
import { tr } from '../../i18n';
import { useApp } from '../../state/app';
import { C, FONT } from '../../theme';

const INK = '#0B0807';
const INK_SOFT = '#4A3B31';
const RED = '#7B151A';

/** The ingredients on a log scale of distance: from the stone oven at 0 km to the salt mine at 5 800 km. */
function Distances({ p }: { p: Passport }) {
  const w = 320;
  const h = 150;
  const x = (km: number) => 18 + (Math.log10(Math.max(1, km) + 1) / Math.log10(10000)) * (w - 36);
  const marks = [1, 10, 100, 1000, 6000];
  return (
    <Svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
      <Line x1={18} x2={w - 18} y1={h - 34} y2={h - 34} stroke={INK} strokeOpacity={0.25} strokeWidth={1} />
      {marks.map((m) => (
        <SvgText key={m} x={x(m)} y={h - 14} fill={INK_SOFT} fontSize={8} fontFamily={FONT.mono} textAnchor="middle">
          {m >= 1000 ? `${(m / 1000).toFixed(0)}k km` : `${m} km`}
        </SvgText>
      ))}
      {(() => {
        // Labels go in the first lane where they do not touch the previous one; crowded ones keep only their dot.
        const lanes = [-999, -999, -999, -999, -999];
        return [...p.lines]
          .sort((a, b) => a.km - b.km)
          .map((l) => {
            const cx = x(l.km);
            const label = tr(l.name);
            const width = label.length * 4.6 + 10;
            const lane = lanes.findIndex((end) => end < cx - 2);
            const shown = lane >= 0 && cx + width < w + 30;
            if (shown) lanes[lane] = cx + width;
            const cy = h - 44 - (shown ? lane : 0) * 19;
            const tone = l.country === 'BE' ? RED : INK;
            return (
              <G key={l.id}>
                <Line x1={cx} x2={cx} y1={cy} y2={h - 34} stroke={tone} strokeOpacity={0.3} strokeWidth={1} />
                <Circle cx={cx} cy={shown ? cy : h - 34} r={3.2} fill={tone} />
                {shown ? (
                  <SvgText x={cx + 5} y={cy + 3} fill={INK} fontSize={8.5} fontFamily={FONT.sans}>
                    {label}
                  </SvgText>
                ) : null}
              </G>
            );
          });
      })()}
    </Svg>
  );
}

/**
 * The plate passport: a certificate on travertine, like a watch's. The number counts every plate since Ninja opened;
 * the seal is 忍; the seconds, the temperatures and the carver are the plate's own; every ingredient has its place,
 * its distance, its lot and when it was picked or baked.
 */
export default function PassportScreen() {
  const { no } = useLocalSearchParams<{ no: string }>();
  const { bridge, now } = useApp();
  const p = findAnyPassport(Number(no), now, bridge);

  if (!p)
    return (
      <Screen back title="Paspoort niet gevonden" serif="Controleer het nummer op je bonnetje.">
        <Button title="Mijn paspoorten" onPress={() => router.replace('/paspoorten')} />
      </Screen>
    );

  const day = dayOfPassport(p);
  const share = async () => {
    const url = `https://yilmazeyup.github.io/ninja-antwerp-demo/website/#paspoort-${p.no}`;
    const text = tr('Mijn {dish} bij Ninja: gesneden om {time} op {c} °C. Paspoort No. {no}.')
      .replace('{dish}', p.dishName)
      .replace('{time}', clockSeconds(p.carved))
      .replace('{c}', p.core.toFixed(1).replace('.', ','))
      .replace('{no}', formatNo(p.no));
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) await navigator.share({ title: 'Ninja', text, url });
      else await Share.share({ message: `${text} ${url}` });
    } catch {
      // Closed without sharing.
    }
  };

  return (
    <Screen back>
      <PopIn>
        <Card tone="travertine" pad={0} radius={26} style={{ overflow: 'hidden' }}>
          <View style={{ padding: 22, gap: 18 }}>
            <Row style={{ justifyContent: 'space-between' }} align="flex-start">
              <View style={{ gap: 6 }}>
                <Txt v="label" size={9} color={RED}>
                  Bordpaspoort
                </Txt>
                <Txt v="num" size={18} color={INK} style={{ letterSpacing: 2.4 }} raw>
                  {`No. ${formatNo(p.no)}`}
                </Txt>
                <Txt v="num" size={9.5} color={INK_SOFT} raw>
                  {p.code}
                </Txt>
              </View>
              <Seal size={58} rotate={-8} />
            </Row>

            <View style={{ gap: 6 }}>
              <Txt v="hero" color={INK} raw>
                {p.dishName}
              </Txt>
              <Txt v="small" color={INK_SOFT}>
                {[p.meatLabel ? tr(p.meatLabel) : null, p.portion === '1,5x' ? '1,5×' : null, tableById(p.table)?.label ? tr(tableById(p.table)!.label) : p.table].filter(Boolean).join(' · ')}
              </Txt>
            </View>

            <View style={{ height: 1, backgroundColor: 'rgba(11,8,7,0.18)' }} />

            <Row style={{ justifyContent: 'space-between' }} align="flex-end">
              <View style={{ gap: 4 }}>
                <Txt v="label" size={8} color={INK_SOFT}>
                  Gesneden om
                </Txt>
                <Txt v="data" size={40} color={INK} raw>
                  {clockSeconds(p.carved)}
                </Txt>
                <Txt v="small" size={12} color={INK_SOFT}>
                  {dayLong(day)}
                </Txt>
              </View>
            </Row>

            <Row gap={0} style={{ justifyContent: 'space-between' }}>
              {[
                { label: 'In het vlees', value: p.core.toFixed(1).replace('.', ','), unit: '°C' },
                { label: 'Op je tafel', value: p.tableTemp.toFixed(1).replace('.', ','), unit: '°C' },
                { label: 'Mes tot tafel', value: String(p.secondsToTable), unit: 's' },
              ].map((s) => (
                <View key={s.label} style={{ gap: 4, flex: 1 }}>
                  <Txt v="label" size={7.5} color={INK_SOFT} narrow numberOfLines={1}>
                    {s.label}
                  </Txt>
                  <Row gap={2} align="flex-end">
                    <Txt v="stat" size={26} color={INK} raw>
                      {s.value}
                    </Txt>
                    <Txt v="num" size={10} color={INK_SOFT} style={{ marginBottom: 4 }} raw>
                      {s.unit}
                    </Txt>
                  </Row>
                </View>
              ))}
            </Row>

            <Row gap={0} style={{ justifyContent: 'space-between' }}>
              {[
                { label: 'Korst', value: `${Math.round(p.crust)} °C` },
                { label: 'Eikenvuur', value: `${p.fire} °C` },
                { label: 'Gesneden door', value: p.carver },
              ].map((s) => (
                <View key={s.label} style={{ gap: 3, flex: 1 }}>
                  <Txt v="label" size={7.5} color={INK_SOFT} narrow>
                    {s.label}
                  </Txt>
                  <Txt v="num" size={12.5} color={INK} raw>
                    {s.value}
                  </Txt>
                </View>
              ))}
            </Row>
            <Txt v="small" size={11.5} color={INK_SOFT}>
              {p.spits.map((s) => tr(s)).join(' · ')}
            </Txt>
          </View>

          <View style={{ backgroundColor: '#DCD0BD', padding: 22, gap: 4, borderTopWidth: 1, borderColor: 'rgba(11,8,7,0.12)' }}>
            <Txt v="label" size={9} color={RED}>
              Waar elk ingrediënt vandaan komt
            </Txt>
            <Txt v="small" size={12} color={INK_SOFT} style={{ marginBottom: 8 }}>
              {tr('{n} ingrediënten · {be} uit België · samen {km} km').replace('{n}', String(p.lines.length)).replace('{be}', String(p.local)).replace('{km}', p.km.toLocaleString('nl-BE'))}
            </Txt>
            <Distances p={p} />
            {p.lines.map((l) => (
              <Row key={l.id} gap={10} align="flex-start" style={{ paddingVertical: 10, borderTopWidth: 1, borderColor: 'rgba(11,8,7,0.1)' }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, marginTop: 6, backgroundColor: l.country === 'BE' ? RED : INK }} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt v="h3" color={INK}>
                    {l.name}
                  </Txt>
                  <Txt v="small" size={12} color={INK_SOFT} raw>
                    {`${l.producer} · ${l.place}, ${tr(COUNTRY_NAMES[l.country as keyof typeof COUNTRY_NAMES])}`}
                  </Txt>
                  <Txt v="small" size={12} color={INK_SOFT}>
                    {l.when}
                  </Txt>
                  {INGREDIENTS[l.id].real ? (
                    <Txt v="small" size={11.5} color={RED}>
                      {INGREDIENTS[l.id].real!}
                    </Txt>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Txt v="num" size={12} color={INK} raw>
                    {`${l.km.toLocaleString('nl-BE')} km`}
                  </Txt>
                  <Txt v="num" size={9.5} color={INK_SOFT} raw>
                    {l.lot}
                  </Txt>
                </View>
              </Row>
            ))}
            <Txt v="small" size={10.5} color={INK_SOFT} style={{ marginTop: 10 }}>
              Producenten, plaatsen en lotnummers zijn voorbeelden voor de demo; in de zaak komen ze uit Ninja’s eigen leveringen. In rood: zoals Ninja het zelf op de kaart zet.
            </Txt>
          </View>
        </Card>
      </PopIn>

      <View style={{ gap: 10 }}>
        <Button title="Deel je paspoort" icon="share" size="lg" full onPress={share} />
        <Button title="Op je story" icon="flash" kind="ghost" full onPress={() => router.push('/flash')} />
        <Row gap={8} style={{ justifyContent: 'center', paddingTop: 6 }}>
          <Icon name="globe" size={14} color={C.muted} />
          <Txt v="small" size={12} color={C.muted}>
            Iedereen kan het nummer nakijken op de website.
          </Txt>
        </Row>
      </View>
      <Kicker color={C.faint} rule={false}>
        {tr('Nummer {no} van alle borden sinds 2024').replace('{no}', formatNo(p.no))}
      </Kicker>
    </Screen>
  );
}
