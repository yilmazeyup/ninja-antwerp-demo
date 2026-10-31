import { dishById, euro, MEATS, tableById, type ItemLine } from '@ninja/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { tr } from '../i18n';
import { basketCount, basketTotal, changeQty, lineTotal, sendOrder } from '../lib/order';
import { useApp } from '../state/app';
import { C } from '../theme';
import { useToast } from './Toast';
import { Button, DemoNote, Press, Row, Sheet, tap, Txt } from './ui';
import { Icon } from './Icon';

/** "Rund · kalf · lam · 1,5×" */
export function lineDetail(l: ItemLine): string {
  const parts: string[] = [];
  if (l.meat) parts.push(tr(MEATS[l.meat].label));
  if (l.portion === '1,5x') parts.push('1,5×');
  if (l.iskender) parts.push(tr('met Iskender'));
  return parts.join(' · ');
}

/** One line of the basket, with − and + . */
export function BasketLine({ line, onChange }: { line: ItemLine; onChange?: (delta: number) => void }) {
  const d = dishById(line.dish);
  return (
    <Row gap={12} style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: C.line }}>
      <View style={{ flex: 1, gap: 3 }}>
        <Txt v="h3" raw>
          {d.name}
        </Txt>
        {lineDetail(line) ? (
          <Txt v="small" size={12} color={C.muted} raw>
            {lineDetail(line)}
          </Txt>
        ) : null}
      </View>
      {onChange ? (
        <Row gap={10}>
          <Press onPress={() => onChange(-1)} accessibilityLabel={tr('Eén minder')} style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: C.line2, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="minus" size={14} color={C.soft} />
          </Press>
          <Txt v="num" size={14} raw>
            {String(line.qty)}
          </Txt>
          <Press onPress={() => onChange(1)} accessibilityLabel={tr('Eén meer')} style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: C.line2, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="plus" size={14} color={C.soft} />
          </Press>
        </Row>
      ) : (
        <Txt v="num" size={12} color={C.muted} raw>
          {`${line.qty}×`}
        </Txt>
      )}
      <Txt v="num" size={13} style={{ minWidth: 64, textAlign: 'right' }} raw>
        {euro(lineTotal(line))}
      </Txt>
    </Row>
  );
}

/**
 * The basket: a bar at the bottom while something is in it, a sheet to check it, and the send. At her table it goes
 * to the kitchen at once; in the line it is cut when she is called in; otherwise she joins the line first.
 */
export function BasketBar() {
  const { saved, update, table, line, dayKey, minute } = useApp();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const count = basketCount(saved.basket);
  if (!count) return null;
  const total = basketTotal(saved.basket);
  const where = table ? 'tafel' : line ? 'rij' : null;
  const send = () => {
    if (!where) {
      setOpen(false);
      router.push('/rij');
      return;
    }
    sendOrder(saved, where, table, dayKey, minute);
    update({ basket: [] });
    setOpen(false);
    tap('success');
    toast(where === 'tafel' ? tr('Naar de keuken') : tr('Klaar voor als je binnenkomt'), {
      text: where === 'tafel' ? tr('Baran snijdt je vlees zodra de korst klopt. Je paspoort volgt.') : tr('We snijden het zodra Noor je binnenroept.'),
      icon: 'knife',
    });
  };
  return (
    <>
      <Press onPress={() => setOpen(true)} accessibilityLabel={tr('Bekijk je bestelling')} fxNames="lacquer-btn" style={{ height: 56, borderRadius: 28, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.oxblood, borderWidth: 1, borderColor: 'rgba(244,236,225,0.34)' }}>
        <Row gap={10}>
          <View style={{ minWidth: 26, height: 26, borderRadius: 13, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
            <Txt v="num" size={12} color={C.black} raw>
              {String(count)}
            </Txt>
          </View>
          <Txt v="label" size={10.5} color={C.ink}>
            {where === 'tafel' ? 'Bekijk en bestel' : where === 'rij' ? 'Bestel vanuit de rij' : 'Je bestelling'}
          </Txt>
        </Row>
        <Txt v="num" size={14} color={C.ink} raw>
          {euro(total)}
        </Txt>
      </Press>
      <Sheet open={open} onClose={() => setOpen(false)} title={tr('Je bestelling')}>
        <View>
          {saved.basket.map((l, i) => (
            <BasketLine key={`${l.dish}-${l.meat}-${l.portion}-${i}`} line={l} onChange={(delta) => update((s) => ({ basket: changeQty(s.basket, l, delta) }))} />
          ))}
        </View>
        <Row style={{ justifyContent: 'space-between', paddingTop: 4 }}>
          <Txt v="label" color={C.muted}>
            Totaal
          </Txt>
          <Txt v="stat" size={24} raw>
            {euro(total)}
          </Txt>
        </Row>
        {where === 'tafel' ? (
          <Txt v="small" color={C.soft}>
            {tr('Aan {table}. Baran snijdt je vlees op het moment dat je bestelt; je krijgt voor elk bord een paspoort.').replace('{table}', tableById(table!)?.label ?? table!)}
          </Txt>
        ) : where === 'rij' ? (
          <Txt v="small" color={C.soft}>
            Je bestelt vanuit de rij: we snijden je bord zodra Noor je binnenroept, zodat het op tafel staat als je gaat zitten.
          </Txt>
        ) : (
          <DemoNote icon="line" text="Ninja werkt zonder reservaties: schuif eerst digitaal aan, of scan de QR-code op je tafel als je al binnen zit." />
        )}
        <Button title={where === 'tafel' ? 'Naar de keuken' : where === 'rij' ? 'Bestel vanuit de rij' : 'Schuif eerst aan'} icon={where ? 'knife' : 'line'} size="lg" full onPress={send} />
        {!where ? <Button title="Ik zit al binnen" icon="qr" kind="ghost" full onPress={() => { setOpen(false); router.push('/tafel?scan=1'); }} /> : null}
        <Txt v="small" size={11.5} color={C.muted} align="center">
          Prijzen zoals op Ninja’s kaart. Afhalen kan niet.
        </Txt>
      </Sheet>
    </>
  );
}
