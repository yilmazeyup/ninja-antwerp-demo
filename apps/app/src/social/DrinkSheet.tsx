import { dishById, emit, euro, SENDABLE, type Tonight } from '@ninja/shared';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Icon, type IconName } from '../components/Icon';
import { Button, Chip, Field, Press, Row, Sheet, tap, Txt } from '../components/ui';
import { useToast } from '../components/Toast';
import { useApp } from '../state/app';
import { C, fx, R } from '../theme';
import { portraitOf } from './match';
import { Avatar } from './parts';
import { t } from './util';

const ICON: Record<string, IconName> = { cay: 'cay', ayran: 'drop', raki: 'wine', cava: 'wine', aperol: 'wine', 'rice-pudding': 'sparkle' };

const NOTES = ['Op je gezondheid.', 'Van de tafel aan het vuur.', 'Voor de beste smaak van de zaal.'];

/**
 * "Stuur een drankje": a çay, an ayran, a rakı to another table, at the menu's price, with a short card. Seppe brings
 * it; her table stays hidden until it is mutual, the floor knows where it goes.
 */
export function DrinkSheet({ target, onClose }: { target: Tonight | null; onClose: () => void }) {
  const { table, line } = useApp();
  const toast = useToast();
  const [pick, setPick] = useState<string>('cay');
  const [note, setNote] = useState('');
  useEffect(() => {
    if (target) {
      setPick('cay');
      setNote('');
    }
  }, [target]);
  if (!target) return <Sheet open={false} onClose={onClose} />;
  const p = target.persona;
  const chosen = SENDABLE.find((s) => s.dish === pick) ?? SENDABLE[0];
  const price = dishById(chosen.dish).price;
  const from = table ?? (line ? 'rij' : 'F2');

  const send = () => {
    emit({ kind: 'cay', persona: p.id, table: target.table, dish: chosen.dish, note: note.trim(), fromTable: from });
    tap('success');
    toast(t('{drink} is onderweg', { drink: t(chosen.label) }), { text: t('Seppe brengt het naar {name}, met jouw kaartje.', { name: p.name }), icon: 'cay' });
    onClose();
  };

  return (
    <Sheet open={!!target} onClose={onClose} title={t('Een drankje voor {name}', { name: p.name })} tall>
      <Row gap={12}>
        <Avatar source={portraitOf(p)} size={46} />
        <Txt v="small" color={C.soft} style={{ flex: 1 }}>
          Seppe brengt het naar de tafel, met jouw kaartje. Je betaalt het met je eigen rekening.
        </Txt>
      </Row>
      <View style={{ gap: 8 }}>
        {SENDABLE.map((s) => {
          const on = s.dish === pick;
          return (
            <Press key={s.dish} onPress={() => setPick(s.dish)} scaleTo={0.985} accessibilityState={{ selected: on }}>
              <Row
                gap={14}
                style={{ paddingVertical: 12, paddingHorizontal: 14, borderRadius: R.md, borderWidth: 1, borderColor: on ? 'rgba(255,181,71,0.55)' : C.line, backgroundColor: on ? 'rgba(255,181,71,0.07)' : 'transparent' }}
              >
                <View {...fx(on ? 'oxblood' : '')} style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line2, backgroundColor: on ? C.oxblood : 'transparent' }}>
                  <Icon name={ICON[s.dish] ?? 'wine'} size={19} color={on ? C.flame : C.soft} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt v="h3">{s.label}</Txt>
                  <Txt v="serif" size={15} color={C.muted}>
                    {s.line}
                  </Txt>
                </View>
                <Txt v="num" size={13} color={on ? C.amber : C.soft} raw>
                  {euro(dishById(s.dish).price)}
                </Txt>
              </Row>
            </Press>
          );
        })}
      </View>
      <View style={{ gap: 8 }}>
        <Txt v="label" size={9} color={C.muted}>
          Een kaartje erbij
        </Txt>
        <Field value={note} onChangeText={(v) => setNote(v.slice(0, 80))} placeholder="Kort en goed (mag leeg blijven)" maxLength={80} />
        <Row gap={6} wrap>
          {NOTES.map((n) => (
            <Chip key={n} label={n} small onPress={() => setNote(n)} />
          ))}
        </Row>
      </View>
      <Button title="Stuur" sub={euro(price)} kind="lacquer" size="lg" full icon="send" onPress={send} />
      <Txt v="small" size={11.5} color={C.faint} align="center">
        {from === 'rij' ? 'Je staat nog in de rij: Seppe zegt van wie het komt.' : t('Van tafel {table}. {name} ziet je tafel pas als het wederzijds is.', { table: from, name: p.name })}
      </Txt>
    </Sheet>
  );
}
