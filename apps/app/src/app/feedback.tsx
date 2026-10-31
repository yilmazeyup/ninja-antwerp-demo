import { emit, euro, eventsOf, ME, NINJA, tableById } from '@ninja/shared';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { Button, Card, DemoNote, Field, Kicker, PopIn, Press, Row, tap, Txt } from '../components/ui';
import { tr } from '../i18n';
import { useApp } from '../state/app';
import { C, fx, R } from '../theme';
import { awaitReply } from '../social/feedback';
import { ninjaTime } from '../social/match';
import { Typing } from '../social/parts';
import { setSocial, useSocial } from '../social/store';
import { newRef, openLink, t } from '../social/util';

const ROWS = [
  { id: 'taste', label: 'Smaak', hint: 'De spies, de lavash, de dips' },
  { id: 'service', label: 'Service', hint: 'Snel, warm, attent' },
  { id: 'vibe', label: 'Sfeer', hint: 'Het licht, de muziek, de zaal' },
] as const;

type Scores = { taste: number; service: number; vibe: number };

/** Five small flames: the house's own way of giving stars. */
function Flames({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <Row gap={6}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= value;
        return (
          <Press key={n} onPress={() => onChange(n)} scaleTo={0.86} accessibilityLabel={t('{label}: {n} van 5', { label: tr(label), n })} style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: on ? 'rgba(255,106,42,0.5)' : C.line2, backgroundColor: on ? 'rgba(255,106,42,0.1)' : 'transparent' }}>
            <Icon name="fire" size={20} color={on ? C.ember : C.faint} stroke={on ? 1.7 : 1.4} />
          </Press>
        );
      })}
    </Row>
  );
}

/**
 * After paying: how was it — taste, service, the room — and a line. Baran answers personally within a minute or so
 * (the panel, or the demo). And always the Google review link, whatever the score: Ninja asks everyone, not only the
 * happy ones.
 */
export default function Feedback() {
  const { bridge } = useApp();
  const social = useSocial();
  const [scores, setScores] = useState<Scores>({ taste: 5, service: 5, vibe: 4 });
  const [text, setText] = useState('');
  const pay = eventsOf(bridge, 'pay').at(-1);
  const sent = social.feedbackRef ? eventsOf(bridge, 'feedback').find((f) => f.ref === social.feedbackRef) : undefined;
  const reply = sent ? eventsOf(bridge, 'feedback-reply').find((r) => r.ref === sent.ref) : undefined;

  // A reply that was still on its way when the app was closed.
  useEffect(() => {
    if (sent && !reply) awaitReply(sent.ref, sent.taste, sent.service, sent.vibe);
  }, [sent, reply]);

  const send = () => {
    const ref = pay?.ref ?? newRef('bezoek');
    emit({ kind: 'feedback', ref, taste: scores.taste, service: scores.service, vibe: scores.vibe, text: text.trim() });
    setSocial({ feedbackRef: ref });
    awaitReply(ref, scores.taste, scores.service, scores.vibe);
    tap('success');
  };

  return (
    <Screen back kicker="Na je bezoek" title="Hoe was het?" serif="Baran leest alles, zelf" gap={20}>
      {pay ? (
        <Row gap={12} style={{ padding: 14, borderRadius: R.md, borderWidth: 1, borderColor: C.line2 }}>
          <Icon name="receipt" size={18} color={C.soft} />
          <Txt v="small" color={C.soft} style={{ flex: 1 }}>
            {t('{table} · {total} · betaald om {time}', { table: tableById(pay.table)?.label ?? pay.table, total: euro(pay.total + pay.tip), time: ninjaTime(pay.at) })}
          </Txt>
        </Row>
      ) : null}

      {sent ? (
        <PopIn style={{ gap: 14 }}>
          <Card tone="leather" pad={18}>
            <View style={{ gap: 8 }}>
              <Txt v="serif" size={24}>
                Merci, {ME.first}.
              </Txt>
              <Txt v="small" color={C.muted}>
                {t('Smaak {a} · service {b} · sfeer {c}', { a: sent.taste, b: sent.service, c: sent.vibe })}
              </Txt>
              {sent.text ? (
                <Txt v="body" size={14.5} color={C.soft} raw>
                  {`“${sent.text}”`}
                </Txt>
              ) : null}
            </View>
          </Card>
          {reply ? (
            <PopIn>
              <View {...fx('leather')} style={{ padding: 16, borderRadius: 20, borderBottomLeftRadius: 6, backgroundColor: C.panel2, borderWidth: 1, borderColor: C.line2, gap: 8 }}>
                <Row gap={8}>
                  <View {...fx('oxblood')} style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: C.oxblood }}>
                    <Txt v="label" size={10} raw>
                      B
                    </Txt>
                  </View>
                  <Txt v="h3" raw>
                    {reply.by}
                  </Txt>
                  <Txt v="small" size={11} color={C.muted}>
                    Spiesmeester
                  </Txt>
                </Row>
                <Txt v="body" size={15}>
                  {reply.text}
                </Txt>
              </View>
            </PopIn>
          ) : (
            <Row gap={10} style={{ paddingHorizontal: 4 }}>
              <Typing color={C.amber} />
              <Txt v="small" color={C.muted}>
                Baran leest je bericht…
              </Txt>
            </Row>
          )}
        </PopIn>
      ) : (
        <>
          {ROWS.map((r) => (
            <View key={r.id} style={{ gap: 10 }}>
              <Row style={{ justifyContent: 'space-between' }} align="flex-end">
                <View style={{ gap: 2 }}>
                  <Txt v="h2">{r.label}</Txt>
                  <Txt v="small" size={12} color={C.muted}>
                    {r.hint}
                  </Txt>
                </View>
                <Txt v="stat" size={22} color={C.amber} raw>
                  {`${scores[r.id]}/5`}
                </Txt>
              </Row>
              <Flames value={scores[r.id]} label={r.label} onChange={(n) => setScores((s) => ({ ...s, [r.id]: n }))} />
            </View>
          ))}
          <View style={{ gap: 8 }}>
            <Kicker>Nog iets?</Kicker>
            <Field value={text} onChangeText={(v) => setText(v.slice(0, 280))} placeholder="Wat moet Baran weten?" multiline style={{ height: 96, paddingTop: 14, textAlignVertical: 'top' }} />
          </View>
          <Button title="Verstuur" kind="lacquer" size="lg" full icon="send" onPress={send} />
        </>
      )}

      <Card tone="flat" pad={18}>
        <View style={{ gap: 10 }}>
          <Row gap={10}>
            <Icon name="star" size={18} color={C.amber} />
            <Txt v="h3" style={{ flex: 1 }}>
              Ook op Google?
            </Txt>
          </Row>
          <Txt v="small" color={C.muted}>
            Een eerlijke review helpt Ninja meer dan je denkt. Ook als het beter kon: dat lezen ze het liefst.
          </Txt>
          <Button title="Schrijf een review" kind="ghost" size="sm" after="arrow" onPress={() => openLink(NINJA.maps)} />
        </View>
      </Card>
      <DemoNote text="In de echte app antwoordt de zaal vanuit het panel. De link naar Google krijgt iedereen, ongeacht de score." />
    </Screen>
  );
}
