import { AREAS, dishById, emit, euro, eventsOf, formatNo, fromSpit, ME_GUESTS, tableById, type CallKind } from '@ninja/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { lineDetail } from '../components/Basket';
import { Icon, type IconName } from '../components/Icon';
import { Screen } from '../components/Screen';
import { useToast } from '../components/Toast';
import { Button, Card, DemoNote, Kicker, Press, Row, Seal, SectionHead, Serial, tap, Txt } from '../components/ui';
import { tr } from '../i18n';
import { basketCount, lineTotal } from '../lib/order';
import { freeTable } from '../state/autopilot';
import { useApp } from '../state/app';
import { C, fx, R } from '../theme';

const CALLS: { call: CallKind; label: string; icon: IconName }[] = [
  { call: 'ober', label: 'Ober', icon: 'hand' },
  { call: 'lavash', label: 'Meer lavash', icon: 'bread' },
  { call: 'water', label: 'Water', icon: 'drop' },
  { call: 'saus', label: 'Saus', icon: 'drop' },
  { call: 'rekening', label: 'De rekening', icon: 'receipt' },
];

/** The QR code on the table, scanned: a viewfinder that finds the code and seats her at that table. */
function Scan() {
  const { saved, minute } = useApp();
  const [found, setFound] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFound(true), 1600);
    return () => clearTimeout(t);
  }, []);
  const table = freeTable(saved.seat, saved.size, minute);
  return (
    <View style={{ gap: 20 }}>
      <View style={{ height: 340, borderRadius: R.xl, overflow: 'hidden', backgroundColor: '#070505', borderWidth: 1, borderColor: C.line2, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 200, height: 200, alignItems: 'center', justifyContent: 'center' }}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                width: 44,
                height: 44,
                borderColor: found ? C.ok : C.ink,
                [i < 2 ? 'top' : 'bottom']: 0,
                [i % 2 ? 'right' : 'left']: 0,
                borderTopWidth: i < 2 ? 2 : 0,
                borderBottomWidth: i >= 2 ? 2 : 0,
                borderLeftWidth: i % 2 ? 0 : 2,
                borderRightWidth: i % 2 ? 2 : 0,
              }}
            />
          ))}
          <View style={{ width: 120, height: 120, opacity: found ? 1 : 0.35, flexDirection: 'row', flexWrap: 'wrap' }}>
            {Array.from({ length: 144 }, (_, i) => (
              <View key={i} style={{ width: 10, height: 10, backgroundColor: (i * 37 + (i % 7) * 11) % 3 === 0 || [0, 1, 2, 12, 24, 13, 14, 26, 9, 10, 11, 21, 23, 33, 34, 35, 108, 109, 110, 120, 132, 133, 134, 122].includes(i) ? C.ink : 'transparent' }} />
            ))}
          </View>
          {!found ? <View {...fx('shimmer')} style={{ position: 'absolute', inset: 0 } as never} /> : null}
        </View>
        <Txt v="label" size={9} color={found ? C.ok : C.soft} style={{ position: 'absolute', bottom: 20 }}>
          {found ? 'Gevonden' : 'Zoekt de code op je tafel'}
        </Txt>
      </View>
      {found ? (
        <Card pad={20}>
          <Kicker color={C.amber}>Je tafel</Kicker>
          <Txt v="display" style={{ marginTop: 8 }}>
            {tableById(table)?.label ?? table}
          </Txt>
          <Txt v="small" color={C.soft} style={{ marginTop: 4 }}>
            {tableById(table) ? tr(AREAS[tableById(table)!.area].line) : ''}
          </Txt>
          <Button
            title="Aan deze tafel"
            icon="check"
            size="lg"
            full
            style={{ marginTop: 16 }}
            onPress={() => {
              emit({ kind: 'line-seat', ref: `scan-${Date.now().toString(36)}`, table, minute });
              tap('success');
              router.replace('/tafel');
            }}
          />
        </Card>
      ) : null}
      <DemoNote text="In de demo zoekt de camera niet echt: hij kiest een vrije tafel in je favoriete zone. In de zaak staat op elke tafel een QR-code." />
    </View>
  );
}

export default function TableScreen() {
  const params = useLocalSearchParams<{ scan?: string }>();
  const { table, orders, passports, bridge, saved } = useApp();
  const toast = useToast();
  if (!table || params.scan === '1') {
    return (
      <Screen back title="Scan je tafel" kicker="Al binnen?" serif="Bestel en betaal vanaf je telefoon, met je hele tafel.">
        <Scan />
      </Screen>
    );
  }
  const t = tableById(table);
  const calls = eventsOf(bridge, 'call').filter((c) => c.table === table);
  const oks = eventsOf(bridge, 'call-ok').filter((c) => c.table === table);
  const open = (call: CallKind) => calls.filter((c) => c.call === call).length > oks.filter((o) => o.call === call).length;
  const carvedRefs = new Set(eventsOf(bridge, 'carve').map((c) => c.ref));
  const mine = passports.filter((p) => p.table === table);
  const total = orders.reduce((s, o) => s + o.total, 0);
  const who = ['Margaux', ...ME_GUESTS];

  return (
    <Screen
      back
      title={t?.label ?? table}
      kicker="Jullie tafel"
      serif={t ? AREAS[t.area].line : undefined}
      footer={
        <Row gap={10}>
          <Button title="Menu" icon="menu" kind="ghost" onPress={() => router.push('/menu')} style={{ flex: 1 }} sub={basketCount(saved.basket) ? String(basketCount(saved.basket)) : undefined} />
          <Button title="Betalen" icon="card" onPress={() => router.push('/betalen')} style={{ flex: 1.4 }} sub={total ? euro(total) : undefined} disabled={!orders.length} />
        </Row>
      }
    >
      <Card pad={18}>
        <SectionHead kicker="Samen bestellen" title="Eén ticket, ieder z’n telefoon" />
        <Row gap={10}>
          {who.map((name, i) => (
            <View key={name} style={{ alignItems: 'center', gap: 6 }}>
              <View {...fx(i === 0 ? 'oxblood' : 'leather')} style={{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: i === 0 ? C.oxblood : C.panel3, borderWidth: 1, borderColor: C.line2 }}>
                <Txt v="h3" raw>
                  {name.charAt(0)}
                </Txt>
              </View>
              <Txt v="small" size={11} color={i === 0 ? C.ink : C.muted} raw>
                {name}
              </Txt>
            </View>
          ))}
        </Row>
        <Txt v="small" size={12} color={C.muted} style={{ marginTop: 12 }}>
          Je vrienden scannen dezelfde code en bestellen op hetzelfde ticket.
        </Txt>
      </Card>

      <View style={{ gap: 10 }}>
        <Kicker>Even roepen</Kicker>
        <Row gap={8} wrap>
          {CALLS.map((c) => {
            const waiting = open(c.call);
            return (
              <Press
                key={c.call}
                onPress={() => {
                  if (waiting) return;
                  emit({ kind: 'call', table, call: c.call });
                  tap('medium');
                  toast(tr('{what}: we komen eraan').replace('{what}', tr(c.label)), { icon: c.icon });
                }}
                accessibilityLabel={tr(c.label)}
                fxNames={waiting ? 'ember-btn' : ''}
                style={{ height: 42, paddingHorizontal: 14, borderRadius: 21, flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: waiting ? 'transparent' : C.line2, backgroundColor: waiting ? C.ember : 'transparent' }}
              >
                <Icon name={c.icon} size={15} color={waiting ? '#1A0A04' : C.soft} />
                <Txt v="small" weight="600" color={waiting ? '#1A0A04' : C.soft}>
                  {waiting ? tr('{what} · onderweg').replace('{what}', tr(c.label)) : c.label}
                </Txt>
              </Press>
            );
          })}
        </Row>
      </View>

      <View style={{ gap: 4 }}>
        <SectionHead kicker="Het ticket" title={orders.length ? tr('{n} bestellingen').replace('{n}', String(orders.length)) : tr('Nog niets besteld')} action={orders.length ? undefined : 'Naar het menu'} onAction={() => router.push('/menu')} />
        {orders.map((o) => {
          let k = 0;
          return (
            <Card key={o.id} tone="flat" pad={16} style={{ marginBottom: 10 }}>
              <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                <Txt v="label" size={8.5} color={C.muted}>
                  {o.from === 'rij' ? 'Besteld vanuit de rij' : 'Besteld aan tafel'}
                </Txt>
                <Txt v="num" size={12} raw>
                  {euro(o.total)}
                </Txt>
              </Row>
              {o.items.map((l, i) => {
                const spit = fromSpit(dishById(l.dish)) && l.meat !== 'falafel';
                const refs = spit ? Array.from({ length: l.qty }, () => `${o.ref}-${k++}`) : [];
                const cut = refs.filter((r) => carvedRefs.has(r)).length;
                return (
                  <Row key={i} gap={10} style={{ paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderColor: C.line }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Txt v="h3" raw>
                        {`${l.qty}× ${dishById(l.dish).name}`}
                      </Txt>
                      {lineDetail(l) ? (
                        <Txt v="small" size={11.5} color={C.muted} raw>
                          {lineDetail(l)}
                        </Txt>
                      ) : null}
                    </View>
                    {spit ? (
                      <Row gap={6}>
                        <Icon name={cut === refs.length ? 'knife' : 'fire'} size={14} color={cut === refs.length ? C.ok : C.amber} />
                        <Txt v="label" size={8} color={cut === refs.length ? C.ok : C.amber}>
                          {cut === refs.length ? 'Gesneden' : 'Aan het vuur'}
                        </Txt>
                      </Row>
                    ) : (
                      <Txt v="num" size={11.5} color={C.muted} raw>
                        {euro(lineTotal(l))}
                      </Txt>
                    )}
                  </Row>
                );
              })}
            </Card>
          );
        })}
      </View>

      {mine.length ? (
        <View style={{ gap: 10 }}>
          <Kicker color={C.amber}>Paspoorten aan deze tafel</Kicker>
          {mine.map((p) => (
            <Card key={p.no} tone="travertine" pad={14} onPress={() => router.push(`/paspoort/${p.no}`)} label={tr('Paspoort')}>
              <Row gap={14}>
                <Seal size={38} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Serial no={p.no} color="#7B151A" size={10.5} />
                  <Txt v="h3" color={C.black} raw>
                    {p.dishName}
                  </Txt>
                </View>
                <Txt v="num" size={13} color={C.black} raw>
                  {`${p.core.toFixed(1).replace('.', ',')} °C`}
                </Txt>
              </Row>
            </Card>
          ))}
          <Txt v="small" size={11.5} color={C.muted}>
            {tr('{n} borden sinds je zit. Nummers lopen door sinds 2024: No. {no} is het jouwe.').replace('{n}', String(mine.length)).replace('{no}', formatNo(mine.at(-1)!.no))}
          </Txt>
        </View>
      ) : null}
    </Screen>
  );
}
