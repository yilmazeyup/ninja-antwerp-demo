import { emit, euro, eventsOf, GIFTS, hash, ME } from '@ninja/shared';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { useToast } from '../components/Toast';
import { Button, Card, Chip, DemoNote, Field, Kicker, PopIn, Press, Row, SectionHead, Segments, Sheet, tap, Txt } from '../components/ui';
import { tr } from '../i18n';
import { useApp } from '../state/app';
import { C } from '../theme';
import { GiftCard } from '../social/objects';
import { Plinth } from '../social/parts';
import { appLink, newRef, shareLink, t } from '../social/util';

type Method = 'payconiq' | 'apple';
type GiftId = (typeof GIFTS)[number]['id'];

const NOTES = ['Op jou, deze keer.', 'Voor de beste avond van het jaar.', 'Omdat je het verdient. Smakelijk.'];

const codeOf = (ref: string) => {
  const h = hash(ref).toString(36).toUpperCase().padStart(8, '0');
  return `NJ-${h.slice(0, 4)}-${h.slice(4, 8)}`;
};

/**
 * Ninja Gift: treat someone to a çay, a durum or Iskender for two. Choose, write a line, pay (in the demo: Payconiq by
 * Bancontact or Apple Pay), and send it as a link. Ninja has no gift cards today; this is a proposal.
 */
export default function Gift() {
  const { bridge } = useApp();
  const toast = useToast();
  const [gift, setGift] = useState<GiftId>('iskender');
  const [to, setTo] = useState('Lien');
  const [note, setNote] = useState(NOTES[0]);
  const [method, setMethod] = useState<Method>('payconiq');
  const [paying, setPaying] = useState<'idle' | 'busy' | 'done'>('idle');
  const [ref, setRef] = useState(() => newRef('gift'));
  const chosen = GIFTS.find((g) => g.id === gift) ?? GIFTS[0];
  const sent = eventsOf(bridge, 'gift').slice().reverse();
  const paid = paying === 'done';

  useEffect(() => {
    if (paying !== 'busy') return;
    const id = setTimeout(() => {
      emit({ kind: 'gift', ref, gift: chosen.id, to: to.trim() || 'Lien', amount: chosen.amount, note: note.trim() });
      setPaying('done');
      tap('success');
    }, 1600);
    return () => clearTimeout(id);
  }, [paying, ref, chosen, to, note]);

  const share = async () => {
    const r = await shareLink(appLink(`/gift?cadeau=${codeOf(ref)}`), t('{from} trakteert je op {gift} bij Ninja, Vlaamsekaai 52.', { from: ME.first, gift: tr(chosen.label).toLowerCase() }), 'Ninja Gift');
    if (r === 'copied') toast(tr('Link gekopieerd'), { text: tr('Plak hem in een bericht.'), icon: 'share' });
  };
  const again = () => {
    setPaying('idle');
    setRef(newRef('gift'));
  };

  return (
    <Screen back kicker="Ninja Gift" title="Trakteer iemand" serif="een avond bij Ninja, als cadeau" gap={22}>
      <Plinth>
        <GiftCard label={tr(chosen.label)} amount={chosen.amount} to={to} note={note} from={ME.first} code={codeOf(ref)} width={330} />
      </Plinth>

      {paid ? (
        <PopIn style={{ gap: 14 }}>
          <Card tone="leather" pad={18}>
            <Row gap={12}>
              <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(154,216,168,0.12)', borderWidth: 1, borderColor: 'rgba(154,216,168,0.4)' }}>
                <Icon name="check" size={20} color={C.ok} stroke={2.2} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt v="h3">Betaald. Het cadeau is klaar.</Txt>
                <Txt v="small" color={C.muted}>
                  {t('{to} toont de link aan de deur. Geldig een jaar.', { to: to.trim() || 'Lien' })}
                </Txt>
              </View>
            </Row>
          </Card>
          <Button title="Stuur de link" kind="lacquer" size="lg" full icon="share" onPress={share} />
          <Button title="Nog een cadeau" kind="ghost" full onPress={again} />
        </PopIn>
      ) : (
        <>
          <View style={{ gap: 12 }}>
            <SectionHead kicker="Het cadeau" title="Wat geef je?" />
            <Row gap={10} wrap>
              {GIFTS.map((g) => {
                const on = g.id === gift;
                return (
                  <Card key={g.id} tone={on ? 'oxblood' : 'leather'} pad={16} onPress={() => setGift(g.id)} label={g.label} style={{ width: '48%', flexGrow: 1 }}>
                    <View style={{ gap: 6 }}>
                      <Txt v="h3" numberOfLines={2} style={{ minHeight: 40 }}>
                        {g.label}
                      </Txt>
                      <Txt v="serif" size={15} color={on ? 'rgba(244,236,225,0.8)' : C.muted} numberOfLines={2}>
                        {g.line}
                      </Txt>
                      <Txt v="stat" size={20} color={on ? C.flame : C.ink} raw>
                        {euro(g.amount)}
                      </Txt>
                    </View>
                  </Card>
                );
              })}
            </Row>
          </View>
          <View style={{ gap: 10 }}>
            <SectionHead kicker="Voor wie" title="Naam en een woordje" />
            <Field value={to} onChangeText={(v) => setTo(v.slice(0, 24))} placeholder="Voornaam" maxLength={24} />
            <Field value={note} onChangeText={(v) => setNote(v.slice(0, 90))} placeholder="Een woordje op de kaart" maxLength={90} />
            <Row gap={6} wrap>
              {NOTES.map((n) => (
                <Chip key={n} label={n} small onPress={() => setNote(tr(n))} />
              ))}
            </Row>
          </View>
          <View style={{ gap: 12 }}>
            <SectionHead kicker="Betalen" title={euro(chosen.amount)} />
            <Segments<Method>
              value={method}
              onChange={setMethod}
              options={[
                { id: 'payconiq', label: 'Payconiq', icon: 'qr' },
                { id: 'apple', label: 'Apple Pay', icon: 'apple' },
              ]}
            />
            <Button title={method === 'apple' ? 'Betaal met Apple Pay' : 'Betaal met Payconiq'} sub={euro(chosen.amount)} kind={method === 'apple' ? 'bone' : 'lacquer'} size="lg" full icon={method === 'apple' ? 'apple' : 'qr'} onPress={() => setPaying('busy')} />
            <Txt v="small" size={11.5} color={C.faint} align="center">
              Payconiq by Bancontact of Apple Pay. In de demo wordt er niets betaald.
            </Txt>
          </View>
        </>
      )}

      {sent.length ? (
        <View style={{ gap: 4 }}>
          <Kicker>Verstuurd</Kicker>
          {sent.slice(0, 4).map((g) => (
            <Row key={g.id} gap={12} style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: C.line }}>
              <Icon name="gift" size={18} color={C.amber} />
              <Txt v="small" style={{ flex: 1 }}>
                {t('Voor {to} · {gift}', { to: g.to, gift: tr(GIFTS.find((x) => x.id === g.gift)?.label ?? g.gift) })}
              </Txt>
              <Txt v="num" size={12} color={C.soft} raw>
                {euro(g.amount)}
              </Txt>
            </Row>
          ))}
        </View>
      ) : null}
      <DemoNote text="Ninja verkoopt vandaag geen cadeaubonnen (zie de FAQ). Ninja Gift is een voorstel." />

      <Sheet open={paying === 'busy'} onClose={() => {}} title={method === 'apple' ? 'Apple Pay' : 'Payconiq by Bancontact'}>
        <View style={{ alignItems: 'center', gap: 16, paddingVertical: 20 }}>
          <View style={{ width: 84, height: 84, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line2 }}>
            <Icon name={method === 'apple' ? 'apple' : 'qr'} size={38} color={C.ink} />
          </View>
          <Txt v="stat" size={34} raw>
            {euro(chosen.amount)}
          </Txt>
          <Row gap={10}>
            <ActivityIndicator color="#FFB547" />
            <Txt v="small" color={C.soft}>
              {method === 'apple' ? 'Bevestig met Face ID' : 'Bevestig in je bank-app'}
            </Txt>
          </Row>
          <Press onPress={() => setPaying('idle')} style={{ paddingVertical: 8 }}>
            <Txt v="label" size={9} color={C.muted}>
              Annuleren
            </Txt>
          </Press>
        </View>
      </Sheet>
    </Screen>
  );
}
