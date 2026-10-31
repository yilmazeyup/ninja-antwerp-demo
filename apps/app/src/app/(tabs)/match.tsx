import { atMinute, clock, CLOSES, dishById, duration, emit, INTENTS, ME, personaById, startOfDay, type Intent, type Tonight } from '@ninja/shared';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, useWindowDimensions, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { Button, Card, DemoNote, Kicker, LiveDot, PopIn, Press, Row, SectionHead, Segments, Sheet, tap, Txt } from '../../components/ui';
import { tr } from '../../i18n';
import { PHOTOS } from '../../photos';
import { useApp } from '../../state/app';
import { C, fx, MAX_WIDTH, PAD, R } from '../../theme';
import { nj } from '../../social/css';
import { DrinkSheet } from '../../social/DrinkSheet';
import { busiestLater, catchUpReplies, DEMO_SELFIE, drinksOf, freshEvening, matchEvents, portraitOf, tonightList } from '../../social/match';
import { MatchDeck } from '../../social/MatchDeck';
import { MatchSetup } from '../../social/MatchSetup';
import { MutualMoment } from '../../social/MutualMoment';
import { Avatar, Portrait } from '../../social/parts';
import { setSocial, useSocial } from '../../social/store';
import { jumpTo, t } from '../../social/util';

/** The room itself, from Ninja's own flash photos, while nobody has Match on yet. */
const ROOM = ['gal-booth', 'flash-4', 'flash-1'];

const RULES = [
  { icon: 'pin', title: 'Alleen binnen bij Ninja', text: 'Match werkt alleen terwijl je hier bent: aan je tafel, aan het vuur of in de rij.' },
  { icon: 'clock', title: 'Weg om 22:00', text: 'Om sluitingstijd verdwijnt alles: je foto, je likes, je gesprekken. Morgen begin je opnieuw.' },
  { icon: 'user', title: 'Alleen voornamen', text: 'Geen achternamen, geen profielen om op te zoeken. Je tafel blijft verborgen tot het wederzijds is.' },
  { icon: 'shield', title: 'Jij beslist', text: 'Blokkeren of melden kan met één tik. Noor van de zaal leest mee bij een melding.' },
] as const;

/** Before she joins: who is on, blurred (or, while it is still quiet, the room itself); the house rules; one button. */
function Intro({ count, people, later, onStart }: { count: number; people: Tonight[]; later: { minute: number; count: number } | null; onStart: () => void }) {
  const faces = people.slice(0, 3).map((p) => ({ key: p.persona.id, source: portraitOf(p.persona) }));
  const shown = faces.length >= 2 ? faces : ROOM.map((k) => ({ key: k, source: PHOTOS[k] }));
  return (
    <View style={{ gap: 26 }}>
      <View style={{ height: 250, alignItems: 'center', justifyContent: 'center' }}>
        {shown.map((p, i) => {
          const rot = shown.length === 1 ? 0 : (i - (shown.length - 1) / 2) * 9;
          return (
            <View key={p.key} style={{ position: 'absolute', transform: [{ translateX: rot * 9 }, { rotate: `${rot}deg` }, { translateY: Math.abs(rot) * 0.8 }] } as ViewStyle}>
              <View style={{ width: 150, height: 200, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: C.line2 }}>
                <View {...nj('blur')} style={{ position: 'absolute', inset: 0 } as ViewStyle}>
                  <Portrait source={p.source} style={{ flex: 1 }} radius={0} shade={0.3} />
                </View>
              </View>
            </View>
          );
        })}
        <View {...fx('glass-strong')} style={{ alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 20, borderWidth: 1, borderColor: C.line2, backgroundColor: C.glass }}>
          <Row gap={8}>
            <LiveDot />
            <Txt v="stat" size={28} raw>
              {String(count)}
            </Txt>
          </Row>
          <Txt v="label" size={8.5} color={C.soft}>
            {count === 1 ? 'gast met Match aan' : 'gasten met Match aan'}
          </Txt>
          {later && later.count > count ? (
            <Txt v="small" size={11} color={C.muted}>
              {t('Rond {time}: {n}', { time: clock(atMinute(startOfDay(new Date()), later.minute)), n: later.count })}
            </Txt>
          ) : null}
        </View>
      </View>
      <View style={{ gap: 10 }}>
        <Kicker color={C.amber}>Ninja Match</Kicker>
        <Txt v="hero">Wie er vanavond is</Txt>
        <Txt v="serif" size={21} color={C.soft}>
          alleen binnen, alleen tot 22:00
        </Txt>
      </View>
      <Card tone="leather" pad={20}>
        <View style={{ gap: 18 }}>
          {RULES.map((r) => (
            <Row key={r.title} gap={14} align="flex-start">
              <View style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line2 }}>
                <Icon name={r.icon} size={18} color={C.amber} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Txt v="h3">{r.title}</Txt>
                <Txt v="small" color={C.muted}>
                  {r.text}
                </Txt>
              </View>
            </Row>
          ))}
        </View>
      </Card>
      <Button title="Zet Match aan" kind="lacquer" size="lg" full icon="match" onPress={onStart} />
      <Txt v="small" color={C.muted} align="center">
        Match staat standaard uit. Jij kiest wanneer de zaal je ziet.
      </Txt>
      {later && count < 3 ? <JumpButton minute={later.minute} /> : null}
      <DemoNote text="Demo: de gasten met Match zijn verzonnen, met stockfoto’s. In de echte app gaat Match pas aan op het wifi van Ninja of met de QR-code op je tafel." />
    </View>
  );
}

/** For the presenter: while the room is still quiet, the same evening a few hours later. */
function JumpButton({ minute }: { minute: number }) {
  const { now } = useApp();
  return (
    <Press onPress={() => jumpTo(startOfDay(now), minute)} accessibilityLabel={tr('Demo: bekijk de zaal later vanavond')}>
      <Row gap={9} style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: R.sm, borderWidth: 1, borderColor: C.line, borderStyle: 'dashed' }}>
        <Icon name="clock" size={14} color={C.muted} />
        <Txt v="small" size={12} color={C.muted} style={{ flex: 1 }}>
          {t('Demo: het is nog rustig. Bekijk de zaal om {time}.', { time: clock(atMinute(startOfDay(now), minute)) })}
        </Txt>
        <Icon name="arrow" size={14} color={C.muted} />
      </Row>
    </Press>
  );
}

/** Her own Match: how the room sees her, why she is here, and the switch to pause. */
function MineSheet({ open, onClose, onEdit }: { open: boolean; onClose: () => void; onEdit: () => void }) {
  const { saved, update } = useApp();
  const social = useSocial();
  const source = social.selfie ? { uri: social.selfie } : DEMO_SELFIE;
  return (
    <Sheet open={open} onClose={onClose} title="Jouw Match">
      <Row gap={16} align="stretch">
        <Portrait source={source} style={{ width: 120, height: 160 }} radius={18} shade={0.5} />
        <View style={{ flex: 1, gap: 6, justifyContent: 'center' }}>
          <Txt v="label" size={8.5} color={C.flame}>
            {INTENTS[saved.match.intent].label}
          </Txt>
          <Txt v="hero" size={26} raw>
            {ME.first}
          </Txt>
          {social.myLine ? (
            <Txt v="small" color={C.soft} raw>
              {`“${social.myLine}”`}
            </Txt>
          ) : null}
          {social.eating ? (
            <Txt v="small" color={C.muted} raw>
              {dishById(social.eating).name}
            </Txt>
          ) : null}
        </View>
      </Row>
      <Segments<Intent>
        value={saved.match.intent}
        options={(Object.keys(INTENTS) as Intent[]).map((id) => ({ id, label: INTENTS[id].label }))}
        onChange={(intent) => {
          update((s) => ({ match: { ...s.match, intent } }));
          emit({ kind: 'match-on', photo: saved.match.photo, intent });
        }}
      />
      <Button title="Andere foto of zin" kind="ghost" full icon="camera" onPress={onEdit} />
      <Button
        title="Pauzeer Match"
        kind="ghost"
        full
        icon="eyeOff"
        onPress={() => {
          update((s) => ({ match: { ...s.match, on: false } }));
          onClose();
        }}
      />
      <Txt v="small" size={11.5} color={C.faint} align="center">
        Gepauzeerd ziet niemand je. Je gesprekken blijven tot 22:00.
      </Txt>
    </Sheet>
  );
}

export default function MatchTab() {
  const { saved, update, bridge, ev, minute } = useApp();
  const social = useSocial();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [setup, setSetup] = useState(false);
  const [drinkFor, setDrinkFor] = useState<Tonight | null>(null);
  const [moment, setMoment] = useState<string | null>(null);
  const [mine, setMine] = useState(false);
  const [focused, setFocused] = useState(true);
  const cardW = Math.min(width, MAX_WIDTH) - PAD * 2;
  const m = Math.floor(minute);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  // A new evening: yesterday's likes, passes and photo are gone, as promised.
  useEffect(() => {
    const fresh = freshEvening();
    if (!fresh.stale) return;
    const first = social.matchDay === '';
    setSocial({ matchDay: fresh.day, seenMutual: [], share: {}, notes: [], read: {}, ...(first ? {} : { selfie: null, selfieFrom: null }) });
    update((s) => ({ match: { ...s.match, liked: [], passed: [], on: first ? s.match.on : false } }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    catchUpReplies(bridge);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const all = useMemo(() => tonightList(ev, m, social.blocked), [ev, m, social.blocked]);
  const later = useMemo(() => busiestLater(ev, m), [ev, m]);
  const events = useMemo(() => matchEvents(bridge), [bridge]);
  const mutual = useMemo(() => new Set(events.mutual.map((x) => x.persona)), [events]);
  const drinks = useMemo(() => drinksOf(events), [events]);
  const liked = new Set(saved.match.liked);
  const passed = new Set(saved.match.passed);
  const deck = all.filter((x) => !liked.has(x.persona.id) && !passed.has(x.persona.id));
  const waiting = all.filter((x) => liked.has(x.persona.id) && !mutual.has(x.persona.id));
  const chats = [...mutual].filter((id) => !social.blocked.includes(id)).map((id) => ({ id, last: events.chats.filter((c) => c.persona === id).at(-1), at: events.mutual.find((x) => x.persona === id)?.at ?? 0 }));
  const left = Math.max(0, CLOSES - minute);

  // The moment it becomes mutual, while she is looking.
  useEffect(() => {
    if (!focused || moment) return;
    const fresh = events.mutual.find((x) => !social.seenMutual.includes(x.persona) && Date.now() - x.at < 5 * 60000 && !social.blocked.includes(x.persona));
    if (fresh) setMoment(fresh.persona);
  }, [events, focused, moment, social.seenMutual, social.blocked]);

  const like = (x: Tonight) => {
    emit({ kind: 'match-like', persona: x.persona.id });
    update((s) => ({ match: { ...s.match, liked: [...new Set([...s.match.liked, x.persona.id])] } }));
    tap('success');
  };
  const pass = (x: Tonight) => update((s) => ({ match: { ...s.match, passed: [...new Set([...s.match.passed, x.persona.id])] } }));
  const open = (id: string) => router.push(`/match/${id}`);
  const mySource = social.selfie ? { uri: social.selfie } : DEMO_SELFIE;

  if (!saved.match.on || setup) {
    return (
      <Screen tabs contentStyle={{ paddingTop: insets.top + 14 }}>
        {setup ? (
          <MatchSetup onDone={() => setSetup(false)} onCancel={() => setSetup(false)} />
        ) : (
          <Intro count={all.length} people={all} later={later} onStart={() => setSetup(true)} />
        )}
      </Screen>
    );
  }

  return (
    <Screen tabs contentStyle={{ paddingTop: insets.top + 14 }} gap={16}>
      <Row style={{ justifyContent: 'space-between' }} align="flex-end">
        <View style={{ gap: 8, flex: 1 }}>
          <Kicker color={C.amber}>Ninja Match</Kicker>
          <Txt v="display">Vanavond hier</Txt>
        </View>
        <Press onPress={() => setMine(true)} accessibilityLabel={tr('Jouw Match')} scaleTo={0.94}>
          <Avatar source={mySource} size={46} dot />
        </Press>
      </Row>
      <Row gap={8} style={{ marginTop: -4 }}>
        <LiveDot size={6} />
        <Txt v="small" size={12} color={C.soft} style={{ flex: 1 }} numberOfLines={1}>
          {all.length === 1 ? '1 gast met Match aan' : `${all.length} gasten met Match aan`}
        </Txt>
        <Icon name="clock" size={12} color={C.amber} />
        <Txt v="small" size={12} color={C.soft}>
          Weg om 22:00 · nog {duration(left)}
        </Txt>
      </Row>

      {deck.length ? (
        <MatchDeck people={deck} width={cardW} drinks={drinks} onLike={like} onPass={pass} onDrink={setDrinkFor} onOpen={(x) => open(x.persona.id)} />
      ) : (
        <Card tone="leather" pad={26}>
          <View style={{ alignItems: 'center', gap: 12, paddingVertical: 18 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line2 }}>
              <Icon name="match" size={28} color={C.amber} />
            </View>
            <Txt v="title" align="center">
              Dat is iedereen, voor nu
            </Txt>
            <Txt v="serif" size={19} color={C.soft} align="center">
              wie straks binnenkomt en Match aanzet, verschijnt hier
            </Txt>
            {saved.match.passed.length ? (
              <Button title="Toon wie je oversloeg" kind="ghost" size="sm" icon="refresh" onPress={() => update((s) => ({ match: { ...s.match, passed: [] } }))} />
            ) : null}
            {later && all.length < 3 ? <JumpButton minute={later.minute} /> : null}
          </View>
        </Card>
      )}

      {chats.length ? (
        <PopIn style={{ gap: 4 }}>
          <SectionHead kicker="Wederzijds" title="Jullie gesprekken" />
          {chats.map((c) => {
            const p = personaById(c.id);
            if (!p) return null;
            const unread = !!c.last && !c.last.mine && c.last.at > (social.read[c.id] ?? 0);
            return (
              <Press key={c.id} onPress={() => open(c.id)} scaleTo={0.99} accessibilityLabel={p.name}>
                <Row gap={14} style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: C.line }}>
                  <Avatar source={portraitOf(p)} size={52} dot={unread} />
                  <View style={{ flex: 1, gap: 3 }}>
                    <Txt v="h3" raw>
                      {p.name}
                    </Txt>
                    {c.last ? (
                      <Txt v="small" color={unread ? C.ink : C.muted} numberOfLines={1} raw>
                        {c.last.mine ? t('Jij: {text}', { text: c.last.text }) : tr(c.last.text)}
                      </Txt>
                    ) : (
                      <Txt v="small" color={C.amber} numberOfLines={1}>
                        Nieuw. Zeg iets.
                      </Txt>
                    )}
                  </View>
                  <Icon name="chevron" size={16} color={C.muted} />
                </Row>
              </Press>
            );
          })}
        </PopIn>
      ) : null}

      {all.length ? (
        <View style={{ gap: 4 }}>
          <SectionHead kicker="Iedereen" title="Wie er is" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingVertical: 4 }}>
            {all.map((x) => {
              const id = x.persona.id;
              const state = mutual.has(id) ? 'Wederzijds' : liked.has(id) ? 'Je vond het leuk' : passed.has(id) ? 'Overgeslagen' : 'Nog niet gezien';
              return (
                <Press key={id} onPress={() => open(id)} scaleTo={0.96} accessibilityLabel={x.persona.name} style={{ width: 92, gap: 7, opacity: passed.has(id) ? 0.5 : 1 }}>
                  <Portrait source={portraitOf(x.persona)} style={{ width: 92, height: 122, borderWidth: mutual.has(id) ? 1.5 : 1, borderColor: mutual.has(id) ? C.amber : C.line2 }} radius={16} shade={0.5}>
                    {mutual.has(id) || liked.has(id) ? (
                      <View style={{ position: 'absolute', right: 7, top: 7, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: mutual.has(id) ? C.ember : C.glass }}>
                        <Icon name={mutual.has(id) ? 'chat' : 'heart'} size={12} color={mutual.has(id) ? '#1A0A04' : C.ink} stroke={1.8} />
                      </View>
                    ) : null}
                  </Portrait>
                  <View style={{ gap: 1 }}>
                    <Txt v="h3" size={13.5} raw>
                      {x.persona.name}
                    </Txt>
                    <Txt v="small" size={10.5} color={C.muted} numberOfLines={1}>
                      {state}
                    </Txt>
                  </View>
                </Press>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {waiting.length ? (
        <Txt v="small" color={C.muted}>
          {waiting.length === 1 ? 'Je vond 1 persoon leuk die nog niet antwoordde.' : `Je vond ${waiting.length} mensen leuk die nog niet antwoordden.`}
        </Txt>
      ) : null}

      <Card tone="flat" pad={18}>
        <Row gap={14} align="flex-start">
          <Icon name="shield" size={20} color={C.soft} />
          <View style={{ flex: 1, gap: 4 }}>
            <Txt v="h3">Discreet, en tot 22:00</Txt>
            <Txt v="small" color={C.muted}>
              Alleen voornamen. Je tafel blijft verborgen tot het wederzijds is. Blokkeren of melden kan in elk gesprek; om sluitingstijd is alles weg.
            </Txt>
          </View>
        </Row>
      </Card>
      <DemoNote text="Demo: de gasten met Match zijn verzonnen, met stockfoto’s; hun antwoorden staan klaar in de app." />

      <DrinkSheet target={drinkFor} onClose={() => setDrinkFor(null)} />
      <MineSheet
        open={mine}
        onClose={() => setMine(false)}
        onEdit={() => {
          setMine(false);
          setSetup(true);
        }}
      />
      {moment && focused ? <MutualMoment persona={moment} onClose={() => setMoment(null)} /> : null}
    </Screen>
  );
}
