import { emit, euro, KI_PER_EURO, ME, ME_GUESTS, NINJA, tableById, type ItemLine } from '@ninja/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { BasketLine } from '../components/Basket';
import { Icon, type IconName } from '../components/Icon';
import { Screen } from '../components/Screen';
import { Button, Card, Chip, Field, Kicker, PopIn, Press, Row, Seal, Segments, tap, Toggle, Txt } from '../components/ui';
import { tr } from '../i18n';
import { lineTotal } from '../lib/order';
import { useApp } from '../state/app';
import { C, fx, R } from '../theme';

type Split = 'alles' | 'gelijk' | 'items';
type Method = 'payconiq' | 'apple' | 'google' | 'bancontact' | 'kaart';

const METHODS: { id: Method; label: string; sub: string; icon: IconName }[] = [
  { id: 'payconiq', label: 'Payconiq by Bancontact', sub: 'Scan of bevestig in je bank-app', icon: 'qr' },
  { id: 'apple', label: 'Apple Pay', sub: 'Met Face ID', icon: 'wallet' },
  { id: 'google', label: 'Google Pay', sub: 'Met je vingerafdruk', icon: 'wallet' },
  { id: 'bancontact', label: 'Bancontact', sub: 'Je Belgische bankkaart', icon: 'card' },
  { id: 'kaart', label: 'Visa · Mastercard', sub: 'Krediet- of debetkaart', icon: 'card' },
];

const TIPS = [
  { id: 'rond', label: 'Rond af' },
  { id: '5', label: '5 %' },
  { id: '10', label: '10 %' },
  { id: '0', label: 'Geen' },
] as const;

function Paid({ amount, ki }: { amount: number; ki: number }) {
  return (
    <PopIn>
      <View style={{ alignItems: 'center', gap: 16, paddingTop: 20 }}>
        <Seal size={86} />
        <Txt v="hero" align="center">
          Merci, Margaux
        </Txt>
        <Txt v="serif" size={21} color={C.soft} align="center">
          {tr('{amount} betaald. Tot de volgende keer aan het vuur.').replace('{amount}', euro(amount))}
        </Txt>
        <Card tone="cognac" pad={18} style={{ alignSelf: 'stretch' }}>
          <Row gap={14}>
            <Icon name="sparkle" size={22} color={C.flame} />
            <View style={{ flex: 1 }}>
              <Txt v="h3">{tr('+ {ki} Ki voor je clan').replace('{ki}', ki.toLocaleString('nl-BE'))}</Txt>
              <Txt v="small" color={C.soft}>
                {tr('Bezoek {n}: nog dichter bij Kage.').replace('{n}', String(ME.visits + 1))}
              </Txt>
            </View>
          </Row>
        </Card>
        <View style={{ alignSelf: 'stretch', gap: 10 }}>
          <Button title="Hoe was het?" icon="star" size="lg" full onPress={() => router.replace('/feedback')} />
          <Button title="Deel je avond" icon="flash" kind="ghost" full onPress={() => router.push('/flash')} />
          <Button title="Terug naar vanavond" kind="ghost" full onPress={() => router.replace('/')} />
        </View>
      </View>
    </PopIn>
  );
}

export default function Pay() {
  const { orders, table, update } = useApp();
  const items: ItemLine[] = orders.flatMap((o) => o.items);
  const total = orders.reduce((s, o) => s + o.total, 0);
  const people = 1 + ME_GUESTS.length;
  const [split, setSplit] = useState<Split>('gelijk');
  const [picked, setPicked] = useState<number[]>([]);
  const [tip, setTip] = useState<(typeof TIPS)[number]['id']>('rond');
  const [method, setMethod] = useState<Method>('payconiq');
  const [invoice, setInvoice] = useState(false);
  const [vat, setVat] = useState('');
  const [paid, setPaid] = useState<{ amount: number; ki: number } | null>(null);

  const share = split === 'alles' ? total : split === 'gelijk' ? total / people : picked.reduce((s, i) => s + lineTotal(items[i]), 0);
  const tipAmount = tip === 'rond' ? Math.ceil(share / 5) * 5 - share : tip === '0' ? 0 : share * (Number(tip) / 100);
  const amount = Math.round((share + tipAmount) * 100) / 100;

  if (paid)
    return (
      <Screen back>
        <Paid amount={paid.amount} ki={paid.ki} />
      </Screen>
    );

  return (
    <Screen
      back
      title="Betalen"
      kicker={table ? tableById(table)?.label ?? table : 'Je rekening'}
      serif="Splits zoals jullie willen. Geen wachten op de kaartlezer."
      footer={
        <Button
          title={tr('Betaal {amount}').replace('{amount}', euro(amount))}
          label={tr('Betalen')}
          icon={METHODS.find((m) => m.id === method)!.icon}
          size="lg"
          full
          disabled={!amount}
          onPress={() => {
            const ki = Math.round(amount * KI_PER_EURO);
            emit({ kind: 'pay', ref: `p${Date.now().toString(36)}`, table: table ?? '', total: amount, tip: Math.round(tipAmount * 100) / 100, method, split: split === 'gelijk' ? people : 1, invoice: invoice ? vat || 'BE0…' : undefined });
            update((s) => ({ ki: s.ki + ki }));
            tap('success');
            setPaid({ amount, ki });
          }}
        />
      }
    >
      <Card pad={18}>
        <Kicker>De rekening</Kicker>
        <View style={{ marginTop: 6 }}>
          {items.length ? items.map((l, i) => <BasketLine key={i} line={l} />) : <Txt color={C.muted}>Nog niets besteld.</Txt>}
        </View>
        <Row style={{ justifyContent: 'space-between', marginTop: 12 }}>
          <Txt v="label" color={C.muted}>
            Totaal tafel
          </Txt>
          <Txt v="stat" size={24} raw>
            {euro(total)}
          </Txt>
        </Row>
      </Card>

      <View style={{ gap: 10 }}>
        <Kicker>Hoe splitsen jullie?</Kicker>
        <Segments<Split>
          value={split}
          onChange={setSplit}
          options={[
            { id: 'alles', label: 'Alles' },
            { id: 'gelijk', label: tr('Door {n}').replace('{n}', String(people)) },
            { id: 'items', label: 'Per bord' },
          ]}
        />
        {split === 'items' ? (
          <View style={{ gap: 6, marginTop: 4 }}>
            {items.map((l, i) => {
              const on = picked.includes(i);
              return (
                <Press key={i} onPress={() => setPicked((p) => (on ? p.filter((x) => x !== i) : [...p, i]))} accessibilityLabel={tr('Kies')}>
                  <Row gap={12} style={{ padding: 12, borderRadius: R.md, borderWidth: 1, borderColor: on ? C.amber : C.line }}>
                    <View style={{ width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: on ? C.amber : C.line2, backgroundColor: on ? C.amber : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                      {on ? <Icon name="check" size={13} color={C.black} stroke={2.4} /> : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <BasketLineMini line={l} />
                    </View>
                  </Row>
                </Press>
              );
            })}
          </View>
        ) : null}
      </View>

      <View style={{ gap: 10 }}>
        <Kicker>Fooi</Kicker>
        <Row gap={8} wrap>
          {TIPS.map((t) => (
            <Chip key={t.id} label={t.label} on={tip === t.id} onPress={() => setTip(t.id)} small />
          ))}
        </Row>
        <Txt v="small" size={11.5} color={C.muted}>
          In België zit de bediening in de prijs; een fooi is een merci voor de zaal en de keuken.
        </Txt>
      </View>

      <View style={{ gap: 10 }}>
        <Kicker>Betalen met</Kicker>
        {METHODS.map((m) => {
          const on = method === m.id;
          return (
            <Press key={m.id} onPress={() => setMethod(m.id)} accessibilityLabel={m.label}>
              <Row gap={14} {...fx(on ? 'leather' : '')} style={{ padding: 14, borderRadius: R.lg, borderWidth: 1, borderColor: on ? C.line2 : C.line, backgroundColor: on ? C.panel2 : 'transparent' }}>
                <Icon name={m.icon} size={20} color={on ? C.amber : C.soft} />
                <View style={{ flex: 1 }}>
                  <Txt v="h3" raw={m.id !== 'kaart'}>
                    {m.label}
                  </Txt>
                  <Txt v="small" size={12} color={C.muted}>
                    {m.sub}
                  </Txt>
                </View>
                <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: on ? C.amber : C.line2, alignItems: 'center', justifyContent: 'center' }}>
                  {on ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.amber }} /> : null}
                </View>
              </Row>
            </Press>
          );
        })}
      </View>

      <Card tone="flat" pad={16}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt v="h3">Factuur voor je zaak</Txt>
            <Txt v="small" size={12} color={C.muted}>
              Via Peppol, rechtstreeks in je boekhouding.
            </Txt>
          </View>
          <Toggle value={invoice} onChange={setInvoice} label="Factuur voor je zaak" />
        </Row>
        {invoice ? <Field value={vat} onChangeText={setVat} placeholder="Ondernemingsnummer, bv. BE0…" autoCapitalize="characters" style={{ marginTop: 12 }} /> : null}
        {invoice ? (
          <Txt v="small" size={11} color={C.muted} style={{ marginTop: 8 }}>
            {tr('Uitgereikt door {name}, {vat}.').replace('{name}', NINJA.fullName).replace('{vat}', NINJA.vat)}
          </Txt>
        ) : null}
      </Card>

      <Row style={{ justifyContent: 'space-between' }}>
        <Txt v="small" color={C.muted}>
          {tr('Jouw deel {share} + fooi {tip}').replace('{share}', euro(Math.round(share * 100) / 100)).replace('{tip}', euro(Math.round(tipAmount * 100) / 100))}
        </Txt>
      </Row>
      <Txt v="small" size={11} color={C.faint}>
        Demo: er wordt niets afgeschreven.
      </Txt>
    </Screen>
  );
}

function BasketLineMini({ line }: { line: ItemLine }) {
  return <BasketLine line={line} />;
}
