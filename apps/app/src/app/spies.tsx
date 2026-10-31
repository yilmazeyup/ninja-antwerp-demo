import { CORE_TARGET, formatNo, clockSeconds, spitSeries, STATUS_LABEL, tableById, type SpitId } from '@ninja/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { Icon, type IconName } from '../components/Icon';
import { sinceText, useSpit } from '../components/live';
import { Backdrop, goBack } from '../components/Screen';
import { SpitStage } from '../components/SpitStage';
import { Bar, Button, Card, DemoNote, Flip, IconButton, Kicker, LiveDot, Num, Row, Segments, SectionHead, Toggle, Txt } from '../components/ui';
import { tr } from '../i18n';
import { useApp } from '../state/app';
import { C, fx, MAX_WIDTH, PAD } from '../theme';

const hm = (minute: number) => `${String(Math.floor(minute / 60) % 24).padStart(2, '0')}:${String(Math.floor(minute % 60)).padStart(2, '0')}`;

/** The last three quarters of an hour of one sensor, as an ember line. */
function Trace({ points, min, max, color, id }: { points: number[]; min: number; max: number; color: string; id: string }) {
  const w = 320;
  const h = 70;
  const d = points.map((v, i) => `${i ? 'L' : 'M'}${((i / Math.max(1, points.length - 1)) * w).toFixed(1)} ${(h - ((v - min) / (max - min)) * h).toFixed(1)}`).join(' ');
  return (
    <Svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.28} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={`${d} L${w} ${h} L0 ${h} Z`} fill={`url(#${id})`} />
      <Path d={d} stroke={color} strokeWidth={1.6} fill="none" />
    </Svg>
  );
}

const SENSORS: { icon: IconName; title: string; line: string }[] = [
  { icon: 'thermo', title: 'Sonde in de snijlaag', line: 'Meet de kerntemperatuur van de volgende plak, elke seconde.' },
  { icon: 'eye', title: 'Infraroodcamera', line: 'Ziet de korst aan de vuurkant: wanneer ze weer krokant is.' },
  { icon: 'fire', title: 'Thermokoppel in het vuur', line: 'Volgt het eikenvuur, ook wanneer er een blok bij gaat.' },
  { icon: 'spit', title: 'Weegschaal onder de spies', line: 'Hoeveel kilo er nog aan hangt, en wanneer de volgende spies klaar moet staan.' },
];

export default function LiveSpit() {
  const insets = useSafeAreaInsets();
  const [spit, setSpit] = useState<SpitId>('rund');
  const [thermal, setThermal] = useState(false);
  const { reading: r, ev, minute, clock } = useSpit(spit);
  const { passports, saved, update } = useApp();
  const series = spitSeries(ev, spit, Math.max(minute - 45, 14 * 60), minute, 1.5);
  const recent = ev.plates.filter((p) => p.carved <= minute && p.spits.includes(spit)).slice(-5).reverse();
  const mine = passports.filter((p) => p.spits.some((s) => (spit === 'rund' ? s.startsWith('Spies 1') : s.startsWith('Spies 2')))).slice(-2).reverse();

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Backdrop />
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' }}>
          <View style={{ height: 520 }}>
            <SpitStage spit={spit} reading={r} thermal={thermal} style={{ position: 'absolute', inset: 0 } as never} />
            <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 220, backgroundImage: 'linear-gradient(180deg,rgba(11,8,7,0),rgba(11,8,7,.96))' } as never} />
            <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 10, left: PAD, right: PAD, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Flip>
                <IconButton name="back" label="Terug" onPress={goBack} />
              </Flip>
              <Row gap={8} {...fx('glass')} style={{ height: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: C.line2, backgroundColor: C.glass }}>
                <Icon name="eye" size={15} color={thermal ? C.amber : C.soft} />
                <Txt v="label" size={8.5} color={thermal ? C.amber : C.soft}>
                  Warmtebeeld
                </Txt>
                <Toggle value={thermal} onChange={setThermal} label="Warmtebeeld" />
              </Row>
            </View>
            <View style={{ position: 'absolute', left: PAD, right: PAD, bottom: 18, gap: 6 }}>
              <Row gap={8}>
                <LiveDot />
                <Txt v="label" size={9} color={C.amber}>
                  {clock.demo ? tr('Herhaling · {t}').replace('{t}', hm(minute)) : tr('Live · {t}').replace('{t}', hm(minute))}
                </Txt>
              </Row>
              <Num value={r.core} digits={1} v="data" size={92} color={C.bone} unit="°C" />
              <Txt v="serif" size={21} color={C.soft}>
                {tr('in de volgende snede · {s}').replace('{s}', tr(STATUS_LABEL[r.status]).toLowerCase())}
              </Txt>
            </View>
          </View>

          <View style={{ paddingHorizontal: PAD, gap: 20, paddingTop: 8 }}>
            <Segments<SpitId>
              value={spit}
              onChange={setSpit}
              options={[
                { id: 'rund', label: 'Spies 1 · rund' },
                { id: 'kip', label: 'Spies 2 · kip' },
              ]}
            />

            <Card pad={18}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Kicker color={C.amber}>De korst</Kicker>
                <Txt v="num" size={12} color={C.soft} raw>
                  {`${Math.round(r.crustIndex * 100)} %`}
                </Txt>
              </Row>
              <Bar value={r.crustIndex} height={5} style={{ marginTop: 12 }} />
              <Txt v="small" color={C.soft} style={{ marginTop: 10 }}>
                {r.crustIndex > 0.82
                  ? tr('De korst is helemaal terug: dit is het moment om te bestellen.')
                  : tr('Na elke snede bouwt de korst zich opnieuw op aan het vuur. Laatste snede {t}.').replace('{t}', sinceText(r.lastCut))}
              </Txt>
            </Card>

            <Row gap={12} wrap>
              {[
                { label: 'Korst', value: String(Math.round(r.crust)), unit: '°C' },
                { label: 'Eikenvuur', value: String(r.fire), unit: '°C' },
                { label: 'Tot het vuur', value: String(r.distance), unit: 'cm' },
                { label: 'Toerental', value: r.rpm.toFixed(1).replace('.', ','), unit: 'tpm' },
                { label: 'Aan het vuur', value: String(Math.floor(r.onFire / 60)), unit: tr('u {m} min').replace('{m}', String(r.onFire % 60)) },
                { label: 'Snedes vanavond', value: String(r.cuts), unit: '' },
                { label: 'Nog aan de spies', value: r.kg.toFixed(1).replace('.', ','), unit: 'kg' },
                { label: 'Doel in het vlees', value: `≥ ${CORE_TARGET}`, unit: '°C' },
              ].map((s) => (
                <Card key={s.label} tone="flat" pad={14} style={{ width: '47.8%' as never }}>
                  <Txt v="label" size={7.5} color={C.muted} narrow>
                    {s.label}
                  </Txt>
                  <Row gap={3} align="flex-end" style={{ marginTop: 6 }}>
                    <Txt v="stat" size={24} raw>
                      {s.value}
                    </Txt>
                    {s.unit ? (
                      <Txt v="num" size={10} color={C.muted} style={{ marginBottom: 3 }} raw>
                        {s.unit}
                      </Txt>
                    ) : null}
                  </Row>
                </Card>
              ))}
            </Row>

            <Card pad={18}>
              <SectionHead kicker="Laatste 45 minuten" title="Korst en kern" />
              <Txt v="label" size={8} color={C.amber}>
                Korst
              </Txt>
              <Trace id="crust" points={series.map((p) => p.crust)} min={70} max={130} color="#FF6A2A" />
              <Txt v="label" size={8} color={C.flame} style={{ marginTop: 10 }}>
                In het vlees
              </Txt>
              <Trace id="core" points={series.map((p) => p.core)} min={70} max={82} color="#FFE6A8" />
              <Txt v="label" size={8} color={C.soft} style={{ marginTop: 10 }}>
                Eikenvuur
              </Txt>
              <Trace id="fire" points={series.map((p) => p.fire)} min={560} max={860} color="#C9CDD3" />
            </Card>

            <View style={{ gap: 6 }}>
              <SectionHead kicker="Van deze spies" title="De laatste snedes" />
              {mine.map((p) => (
                <Row key={`m${p.no}`} gap={12} style={{ paddingVertical: 11, borderBottomWidth: 1, borderColor: C.line }}>
                  <Txt v="num" size={11} color={C.amber} raw>
                    {clockSeconds(p.carved)}
                  </Txt>
                  <Txt v="h3" style={{ flex: 1 }} raw>
                    {`${p.dishName} · ${tr('jij')}`}
                  </Txt>
                  <Txt v="num" size={12} raw>
                    {`${p.core.toFixed(1).replace('.', ',')} °C`}
                  </Txt>
                </Row>
              ))}
              {recent.map((p) => (
                <Row key={p.seq} gap={12} style={{ paddingVertical: 11, borderBottomWidth: 1, borderColor: C.line }}>
                  <Txt v="num" size={11} color={C.muted} raw>
                    {clockSeconds(p.carved)}
                  </Txt>
                  <View style={{ flex: 1 }}>
                    <Txt v="small" color={C.soft} raw>
                      {`No. ${formatNo(ev.firstNo + p.seq)} · ${tableById(p.table)?.label ?? p.table}`}
                    </Txt>
                  </View>
                  <Txt v="num" size={12} color={p.core >= CORE_TARGET ? C.ink : C.alert} raw>
                    {`${p.core.toFixed(1).replace('.', ',')} °C`}
                  </Txt>
                </Row>
              ))}
            </View>

            <Card tone="flat" pad={16}>
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt v="h3">Melding bij een verse spies</Txt>
                  <Txt v="small" size={12} color={C.muted}>
                    Weet als eerste wanneer er een nieuwe spies aan het vuur gaat.
                  </Txt>
                </View>
                <Toggle value={saved.push} onChange={(v) => update({ push: v })} label="Melding bij een verse spies" />
              </Row>
            </Card>

            <View style={{ gap: 4 }}>
              <SectionHead kicker="Hoe het gemeten wordt" title="Vier sensoren, één spies" />
              {SENSORS.map((s) => (
                <Row key={s.title} gap={14} align="flex-start" style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: C.line }}>
                  <View style={{ width: 36, height: 36, borderRadius: 11, borderWidth: 1, borderColor: C.line2, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={s.icon} size={17} color={C.amber} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt v="h3">{s.title}</Txt>
                    <Txt v="small" color={C.muted}>
                      {s.line}
                    </Txt>
                  </View>
                </Row>
              ))}
            </View>
            <DemoNote text="Voorstel voor Ninja: de sensoren en een kleine gateway in de keuken. In de demo zijn de metingen uitgerekend uit de avond, op dezelfde manier op elk scherm." />
            <Button title="Bestel van deze spies" icon="menu" size="lg" full onPress={() => router.push('/menu')} />
          </View>
          <View style={{ height: 50 + insets.bottom }} />
        </View>
      </ScrollView>
    </View>
  );
}

