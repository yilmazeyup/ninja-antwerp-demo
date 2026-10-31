import {
  AREAS,
  dishById,
  emit,
  lineAt,
  ME,
  RANK_PRIORITY,
  rankInfo,
  tableById,
  waitForecast,
  type AreaId,
} from '@ninja/shared';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { lineDetail } from '../components/Basket';
import { Icon } from '../components/Icon';
import { useWait } from '../components/live';
import { Screen } from '../components/Screen';
import { useToast } from '../components/Toast';
import { Button, Card, Chip, DemoNote, Kicker, PopIn, Press, Ring, Row, SectionHead, tap, Txt } from '../components/ui';
import { tr } from '../i18n';
import { useApp, useTick } from '../state/app';
import { C, fx } from '../theme';

const hm = (minute: number) => `${String(Math.floor(minute / 60) % 24).padStart(2, '0')}:${String(Math.floor(minute % 60)).padStart(2, '0')}`;

const AREA_ORDER: (AreaId | 'any')[] = ['any', 'fire', 'banquette', 'center', 'bar', 'window', 'terrace'];

/** The people ahead of her as figures, herself in ember, and a few who came after her. */
function Queue({ ahead }: { ahead: number }) {
  const figures = [...Array.from({ length: Math.min(9, ahead) }, () => 'ahead' as const), 'me' as const, 'behind' as const, 'behind' as const];
  return (
    <Row gap={8} wrap style={{ justifyContent: 'center' }}>
      {figures.map((kind, i) => {
        const me = kind === 'me';
        const tone = me ? C.ember : kind === 'ahead' ? C.soft : C.faint;
        return (
          <View key={i} style={{ alignItems: 'center', gap: 3 }}>
            <View {...fx(me ? 'live' : '')} style={{ width: me ? 14 : 10, height: me ? 14 : 10, borderRadius: 7, backgroundColor: tone }} />
            <View style={{ width: me ? 20 : 14, height: me ? 18 : 13, borderTopLeftRadius: 10, borderTopRightRadius: 10, backgroundColor: tone, opacity: 0.9 }} />
          </View>
        );
      })}
    </Row>
  );
}

function Waiting() {
  const { line, ev, minute, orders } = useApp();
  const toast = useToast();
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  if (!line) return null;
  const j = line.joined;
  const prio = RANK_PRIORITY[ME.rank];
  const before = lineAt(ev, j.minute).filter((g) => (g.rank ? RANK_PRIORITY[g.rank] : -1) >= prio).length;
  // The demo runs the line faster than life: about 45 seconds from joining to being called in.
  const progress = Math.min(1, (Date.now() - j.at) / 45000);
  const ahead = line.call ? 0 : Math.max(0, Math.round(before * (1 - progress)));
  const pre = orders.filter((o) => o.from === 'rij');

  if (line.call) {
    const t = tableById(line.call.table);
    return (
      <PopIn>
        <Card tone="ember" pad={22}>
          <Kicker color="#1A0A04">Je tafel is klaar</Kicker>
          <Txt v="hero" color="#1A0A04" style={{ marginTop: 10 }}>
            {t?.label ?? line.call.table}
          </Txt>
          <Txt v="body" color="#3A1606" style={{ marginTop: 6 }}>
            {t ? tr(AREAS[t.area].line) : ''}
          </Txt>
          <Txt v="small" color="#3A1606" style={{ marginTop: 10 }}>
            Noor houdt je tafel tien minuten vrij. Meld je aan de deur of tik hieronder als je binnen bent.
          </Txt>
          <View style={{ gap: 10, marginTop: 18 }}>
            <Button
              title="Ik ben er"
              icon="check"
              size="lg"
              full
              onPress={() => {
                emit({ kind: 'line-seat', ref: j.ref, table: line.call!.table, minute });
                tap('success');
                router.replace('/tafel');
              }}
            />
            <Button title="Bekijk je plaats in 3D" icon="seat" kind="ghost" full onPress={() => router.push(`/plaats?table=${line.call!.table}`)} />
          </View>
        </Card>
      </PopIn>
    );
  }

  return (
    <View style={{ gap: 18 }}>
      <Card pad={22}>
        <Row style={{ justifyContent: 'space-between' }} align="flex-start">
          <View style={{ gap: 6, flex: 1 }}>
            <Kicker color={C.amber}>Je staat in de rij</Kicker>
            <Txt v="display">{ahead === 0 ? tr('Jij bent de volgende') : tr('Nog {n} voor jou').replace('{n}', String(ahead))}</Txt>
            <Txt v="small" color={C.soft}>
              {tr('{size} personen · {area}').replace('{size}', String(j.size)).replace('{area}', j.area === 'any' ? tr('om het even waar') : tr(AREAS[j.area].label))}
            </Txt>
          </View>
          <Ring value={progress} size={74} stroke={4}>
            <Txt v="stat" size={22} raw>
              {String(ahead + 1)}
            </Txt>
          </Ring>
        </Row>
        <View style={{ marginTop: 20 }}>
          <Queue ahead={ahead} />
        </View>
        <Txt v="small" size={12} color={C.muted} style={{ marginTop: 16 }}>
          {tr('Als {rank} sta je vooraan bij wie even lang wacht.').replace('{rank}', rankInfo(ME.rank).name)}
        </Txt>
      </Card>

      <Card tone="flat" pad={18}>
        <SectionHead kicker="Terwijl je wacht" title="Bestel alvast" serif="Het staat op tafel als je gaat zitten." />
        {pre.length ? (
          <View style={{ gap: 6 }}>
            {pre.flatMap((o) => o.items).map((l, i) => (
              <Row key={i} style={{ justifyContent: 'space-between' }}>
                <Txt v="h3" raw>
                  {`${l.qty}× ${dishById(l.dish).name}`}
                </Txt>
                <Txt v="small" size={12} color={C.muted} raw>
                  {lineDetail(l)}
                </Txt>
              </Row>
            ))}
          </View>
        ) : null}
        <Button title={pre.length ? 'Nog iets bestellen' : 'Naar het menu'} icon="menu" kind="bone" size="sm" onPress={() => router.push('/menu')} style={{ marginTop: 12 }} />
      </Card>

      <DemoNote text="In de demo loopt de rij versneld: binnen een minuut roept Noor je binnen. Staat het paneel open, dan doet de gastvrouw het daar." />
      <Button
        title="Uit de rij stappen"
        kind="ghost"
        full
        onPress={() => {
          emit({ kind: 'line-leave', ref: j.ref });
          toast(tr('Je bent uit de rij'), { icon: 'line' });
        }}
      />
    </View>
  );
}

function Join() {
  const { saved, update, dayKey, minute } = useApp();
  const { wait, guests } = useWait(saved.size);
  const { ev } = useTick(15000);
  const { calm } = waitForecast(ev, minute);
  const rank = rankInfo(ME.rank);
  return (
    <View style={{ gap: 18 }}>
      <Card pad={22}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ gap: 6 }}>
            <Kicker color={C.amber}>Nu wachten</Kicker>
            <Row gap={6} align="flex-end">
              <Txt v="data" size={64} raw>
                {String(wait)}
              </Txt>
              <Txt v="num" size={14} color={C.muted} style={{ marginBottom: 10 }} raw>
                min
              </Txt>
            </Row>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <Txt v="small" color={C.soft}>
              {tr('{n} in de rij').replace('{n}', String(guests.linePeople))}
            </Txt>
            <Txt v="small" color={C.soft}>
              {tr('{n} aan tafel').replace('{n}', String(guests.seated))}
            </Txt>
            {calm ? (
              <Txt v="small" color={C.ok}>
                {tr('Rustigst rond {t}').replace('{t}', hm(calm.minute))}
              </Txt>
            ) : null}
          </View>
        </Row>
      </Card>

      <View style={{ gap: 10 }}>
        <Kicker>Met hoeveel?</Kicker>
        <Row gap={8} wrap>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <Chip key={n} label={String(n)} on={saved.size === n} onPress={() => update({ size: n })} raw />
          ))}
        </Row>
      </View>

      <View style={{ gap: 10 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Kicker>Waar zit je het liefst?</Kicker>
          <Press onPress={() => router.push('/plaats')} accessibilityLabel={tr('Bekijk in 3D')}>
            <Row gap={6}>
              <Icon name="seat" size={14} color={C.amber} />
              <Txt v="label" size={9} color={C.amber}>
                Bekijk in 3D
              </Txt>
            </Row>
          </Press>
        </Row>
        <Row gap={8} wrap>
          {AREA_ORDER.map((a) => (
            <Chip key={a} label={a === 'any' ? 'Om het even' : AREAS[a].label} on={saved.seat === a} onPress={() => update({ seat: a })} small />
          ))}
        </Row>
        {saved.seat !== 'any' ? (
          <Txt v="small" color={C.muted}>
            {AREAS[saved.seat].line}
          </Txt>
        ) : null}
      </View>

      <Card tone="cognac" pad={18}>
        <Row gap={14}>
          <Txt style={{ fontFamily: 'Shippori Mincho B1', fontWeight: '800', fontSize: 26, color: C.flame }} raw>
            {rank.kanji}
          </Txt>
          <View style={{ flex: 1, gap: 3 }}>
            <Txt v="h3">{tr('{rank}: vooraan in de rij').replace('{rank}', rank.name)}</Txt>
            <Txt v="small" color={C.soft}>
              Je clan-rang telt mee: wie vaker komt, wacht korter.
            </Txt>
          </View>
        </Row>
      </Card>

      <Button
        title="Schuif digitaal aan"
        icon="line"
        size="lg"
        full
        onPress={() => {
          emit({ kind: 'line-join', ref: `l${Date.now().toString(36)}`, name: 'Margaux D.', size: saved.size, rank: ME.rank, area: saved.seat, day: dayKey, minute });
          tap('success');
        }}
      />
      <Txt v="small" size={11.5} color={C.muted} align="center">
        Ninja werkt zonder reservaties. Met de digitale rij hoef je niet buiten te staan.
      </Txt>
    </View>
  );
}

export default function Line() {
  const { line, table } = useApp();
  useEffect(() => {
    if (table && !line) router.replace('/tafel');
  }, [table, line]);
  return (
    <Screen back title={line ? 'De rij' : 'Schuif digitaal aan'} kicker="Ninja · Vlaamsekaai 52" serif={line ? 'We sturen een bericht als je tafel vrijkomt.' : 'Zonder buiten in de kou te staan.'}>
      {line ? <Waiting /> : <Join />}
    </Screen>
  );
}
