import { dishById, emit, euro, MEATS, ME } from '@ninja/shared';
import { router } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../components/Icon';
import { Backdrop, goBack } from '../components/Screen';
import { useToast } from '../components/Toast';
import { Button, Chip, Flip, IconButton, Photo, PopIn, Press, Row, Seal, tap, Txt } from '../components/ui';
import { tr } from '../i18n';
import { ask, STARTERS, thinkTime, type Answer, type DishLine } from '../lib/sensei';
import { PHOTOS } from '../photos';
import { clockNow, useApp } from '../state/app';
import { C, FONT, fx, MAX_WIDTH, PAD, R, web } from '../theme';
import { Reading, Typing } from '../social/parts';
import { setSocial, useSocial } from '../social/store';
import { newRef, openLink, t } from '../social/util';

const ALLERGY_KEYS = ['gluten', 'melk', 'sesam', 'noten'] as const;

/** Sensei's answer: the words, the live numbers in mono, the dishes to add, where to go next. */
function AnswerView({ a, onAsk, onAdd }: { a: Answer; onAsk: (q: string) => void; onAdd: (lines: DishLine[]) => void }) {
  const say = (p: Answer['paras'][number]) => t(p.t, Object.fromEntries(Object.entries(p.v ?? {}).map(([k, v]) => [k, tr(v)])));
  return (
    <View style={{ gap: 12 }}>
      <View {...fx('leather')} style={{ alignSelf: 'stretch', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 20, borderBottomLeftRadius: 6, backgroundColor: C.panel2, borderWidth: 1, borderColor: C.line2, gap: 9 }}>
        {a.paras.map((p, i) => (
          <Txt key={i} v="body" size={15} raw>
            {say(p)}
          </Txt>
        ))}
        {a.facts?.length ? (
          <Row gap={8} wrap style={{ marginTop: 4 }}>
            {a.facts.slice(0, 4).map((f) => (
              <Reading key={f.label} label={f.label} value={tr(f.value)} unit={f.unit} tone={f.unit === '°C' ? C.amber : C.ink} style={{ flexBasis: a.facts!.length > 2 ? '46%' : 0, flexGrow: 1 }} />
            ))}
          </Row>
        ) : null}
        {a.note ? (
          <Row gap={7} align="flex-start" style={{ marginTop: 2 }}>
            <Icon name="info" size={13} color={C.muted} />
            <Txt v="small" size={11.5} color={C.muted} style={{ flex: 1 }}>
              {a.note}
            </Txt>
          </Row>
        ) : null}
      </View>
      {a.dishes?.length ? (
        <View style={{ gap: 8 }}>
          {a.dishes.map((l, i) => {
            const d = dishById(l.dish);
            const photo = d.photo ? PHOTOS[d.photo] : undefined;
            return (
              <Row key={`${l.dish}-${l.meat}-${i}`} gap={12} style={{ padding: 10, borderRadius: R.md, borderWidth: 1, borderColor: C.line, backgroundColor: 'rgba(244,236,225,0.025)' }}>
                {photo ? (
                  <Photo source={photo} radius={10} style={{ width: 52, height: 52 }} />
                ) : (
                  <View style={{ width: 52, height: 52, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line2 }}>
                    <Icon name={d.cat === 'alcohol' ? 'wine' : d.cat === 'hot' ? 'cay' : 'drop'} size={20} color={C.soft} />
                  </View>
                )}
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt v="h3" size={14} raw numberOfLines={1}>
                    {l.qty > 1 ? `${l.qty} × ${d.name}` : d.name}
                  </Txt>
                  <Txt v="small" size={11.5} color={C.muted} numberOfLines={1}>
                    {l.meat ? MEATS[l.meat].short : (d.desc ?? '')}
                  </Txt>
                </View>
                <Txt v="num" size={12} color={C.soft} raw>
                  {euro(d.price * l.qty)}
                </Txt>
                <Press onPress={() => onAdd([l])} accessibilityLabel={t('{dish} toevoegen', { dish: d.name })} style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line2 }}>
                  <Icon name="plus" size={16} color={C.ink} />
                </Press>
              </Row>
            );
          })}
          {a.dishes.length > 1 ? <Button title="Alles toevoegen" sub={a.total !== undefined ? euro(a.total) : undefined} kind="lacquer" size="md" full icon="plus" onPress={() => onAdd(a.dishes!)} /> : null}
        </View>
      ) : null}
      {a.links?.length ? (
        <Row gap={8} wrap>
          {a.links.map((l) => (
            <Button key={l.to} title={l.label} kind="ghost" size="sm" after="arrow" onPress={() => (l.external ? openLink(l.to) : router.push(l.to as never))} />
          ))}
        </Row>
      ) : null}
      {a.follow?.length ? (
        <Row gap={6} wrap>
          {a.follow.map((q) => (
            <Chip key={q} label={q} small onPress={() => onAsk(q)} />
          ))}
        </Row>
      ) : null}
    </View>
  );
}

/**
 * Sensei: Ninja's host as a conversation. Every answer is worked out on the phone from the restaurant's own data — the
 * card, the spit and the line right now, where the ingredients come from — and can put dishes in her basket.
 */
export default function Sensei() {
  const { ev, minute, saved, update } = useApp();
  const social = useSocial();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const [text, setText] = useState('');
  const [thinking, setThinking] = useState(false);
  const messages = social.sensei;

  useEffect(() => {
    const id = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(id);
  }, [messages.length, thinking]);

  /** `q` as she sees it; `dutch` when it came from a suggestion (Sensei reads Dutch best). */
  const send = (q: string, dutch?: string) => {
    const question = q.trim();
    if (!question || thinking) return;
    setText('');
    tap('light');
    emit({ kind: 'sensei', question });
    setSocial((s) => ({ sensei: [...s.sensei, { id: newRef('q'), at: Date.now(), me: true, text: question }] }));
    const avoid = ALLERGY_KEYS.filter((k) => saved.diet[k]);
    const answer = ask(dutch ?? question, { ev, minute, clock: clockNow(), veg: saved.diet.veg, avoid: [...avoid], size: saved.size });
    setThinking(true);
    setTimeout(() => {
      setThinking(false);
      setSocial((s) => ({ sensei: [...s.sensei, { id: newRef('a'), at: Date.now(), me: false, text: '', answer }] }));
    }, thinkTime(answer));
  };

  const add = (lines: DishLine[]) => {
    update((s) => {
      const basket = [...s.basket];
      for (const l of lines) {
        const same = basket.find((b) => b.dish === l.dish && b.meat === l.meat && (b.portion ?? '1x') === (l.portion ?? '1x'));
        if (same) same.qty += l.qty;
        else basket.push({ dish: l.dish, meat: l.meat, portion: l.portion ?? '1x', qty: l.qty });
      }
      return { basket };
    });
    tap('success');
    const n = lines.reduce((s, l) => s + l.qty, 0);
    toast(n === 1 ? tr('Toegevoegd aan je mandje') : t('{n} gerechten in je mandje', { n }), { text: tr('Bestellen doe je in het menu.'), icon: 'plus', onPress: () => router.push('/menu') });
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Backdrop />
      <View style={{ paddingTop: insets.top + 10, paddingHorizontal: PAD, paddingBottom: 12, borderBottomWidth: 1, borderColor: C.line, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Flip>
            <IconButton name="back" label="Terug" onPress={goBack} />
          </Flip>
          <Row gap={11} style={{ flex: 1, paddingHorizontal: 12 }}>
            <Seal size={38} />
            <View style={{ flex: 1 }}>
              <Txt v="h2">Sensei</Txt>
              <Txt v="small" size={11.5} color={C.muted} numberOfLines={1}>
                De gastheer van Ninja
              </Txt>
            </View>
          </Row>
          <IconButton name="refresh" label="Nieuw gesprek" onPress={() => setSocial({ sensei: [] })} />
        </Row>
      </View>
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: PAD, gap: 16, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
        <PopIn style={{ gap: 12 }}>
          <View {...fx('leather')} style={{ paddingHorizontal: 16, paddingVertical: 14, borderRadius: 20, borderBottomLeftRadius: 6, backgroundColor: C.panel2, borderWidth: 1, borderColor: C.line2, gap: 8 }}>
            <Txt v="serif" size={22}>
              Goedenavond, {ME.first}.
            </Txt>
            <Txt v="body" size={15} color={C.soft}>
              Ik ken de kaart, de spies en de rij op dit moment, en waar elk ingrediënt vandaan komt. Vraag maar.
            </Txt>
          </View>
          {messages.length === 0 ? (
            <Row gap={6} wrap>
              {STARTERS.map((q) => (
                <Chip key={q} label={q} small onPress={() => send(tr(q), q)} />
              ))}
            </Row>
          ) : null}
        </PopIn>
        {messages.map((m) =>
          m.me ? (
            <View key={m.id} {...fx('oxblood')} style={{ alignSelf: 'flex-end', maxWidth: '84%', paddingHorizontal: 15, paddingVertical: 11, borderRadius: 20, borderBottomRightRadius: 6, backgroundColor: C.oxblood, borderWidth: 1, borderColor: 'rgba(244,236,225,0.18)' }}>
              <Txt v="body" size={15} raw>
                {m.text}
              </Txt>
            </View>
          ) : m.answer ? (
            <PopIn key={m.id}>
              <AnswerView a={m.answer} onAsk={(q) => send(tr(q), q)} onAdd={add} />
            </PopIn>
          ) : null,
        )}
        {thinking ? (
          <View {...fx('leather')} style={{ alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 20, borderBottomLeftRadius: 6, backgroundColor: C.panel2, borderWidth: 1, borderColor: C.line2 }}>
            <Typing color={C.amber} />
          </View>
        ) : null}
        <View style={{ height: 6 }} />
      </ScrollView>
      <View style={{ paddingHorizontal: PAD, paddingTop: 10, paddingBottom: insets.bottom + 12, borderTopWidth: 1, borderColor: C.line, gap: 10, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' }}>
        {messages.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled">
            {STARTERS.slice(0, 7).map((q) => (
              <Chip key={q} label={q} small onPress={() => send(tr(q), q)} />
            ))}
          </ScrollView>
        ) : null}
        <Row gap={10}>
          <TextInput
            value={text}
            onChangeText={(v) => setText(v.slice(0, 200))}
            placeholder={tr('Vraag het Sensei')}
            placeholderTextColor="#5C5047"
            onSubmitEditing={() => send(text)}
            returnKeyType="send"
            style={[{ flex: 1, height: 48, borderRadius: R.pill, borderWidth: 1, borderColor: C.line2, backgroundColor: C.bg2, paddingHorizontal: 18, color: C.ink, fontFamily: FONT.sans, fontSize: 15 }, web({ outlineStyle: 'none' })]}
          />
          <Press onPress={() => send(text)} disabled={!text.trim() || thinking} accessibilityLabel={tr('Verstuur')} fxNames="lacquer-btn" style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: C.oxblood, borderWidth: 1, borderColor: 'rgba(244,236,225,0.34)' }}>
            <Flip>
              <Icon name="send" size={19} color={C.ink} />
            </Flip>
          </Press>
        </Row>
      </View>
    </View>
  );
}
