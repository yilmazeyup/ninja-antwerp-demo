import { AREAS, emit, INTENTS, personaById, tableById } from '@ninja/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { ScrollView, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../../components/Icon';
import { Backdrop, goBack } from '../../components/Screen';
import { useToast } from '../../components/Toast';
import { Button, Card, Chip, DemoNote, Flip, IconButton, Kicker, LiveDot, PopIn, Press, Row, Sheet, tap, Txt } from '../../components/ui';
import { tr } from '../../i18n';
import { useApp } from '../../state/app';
import { C, FONT, fx, MAX_WIDTH, PAD, R, web } from '../../theme';
import { DrinkSheet } from '../../social/DrinkSheet';
import { askSharedTable, catchUpReplies, drinksOf, matchEvents, ninjaTime, openers, orderedOf, portraitOf, sendChat, tonightList } from '../../social/match';
import { PersonCard } from '../../social/MatchDeck';
import { Avatar, Bubble, FloorNote, Portrait, Typing } from '../../social/parts';
import { setSocial, useLive, useSocial } from '../../social/store';
import { t } from '../../social/util';

const REASONS = ['Ongepast bericht', 'Valse foto', 'Voelt niet veilig', 'Iets anders'];

/** One person: the profile while it is not mutual yet; the conversation once it is. */
export default function MatchPerson() {
  const { id, share } = useLocalSearchParams<{ id: string; share?: string }>();
  const p = personaById(String(id));
  const { bridge, ev, minute, saved, update } = useApp();
  const social = useSocial();
  const live = useLive();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const [text, setText] = useState('');
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState<'block' | 'report' | null>(null);
  const [reason, setReason] = useState(REASONS[0]);
  const [drink, setDrink] = useState(false);

  const tonight = useMemo(() => tonightList(ev, Math.floor(minute), []).find((x) => x.persona.id === id), [ev, minute, id]);
  const events = useMemo(() => matchEvents(bridge), [bridge]);
  const mutualAt = events.mutual.find((m) => m.persona === id)?.at;
  const mutual = mutualAt !== undefined;
  const liked = saved.match.liked.includes(String(id));
  const msgs = events.chats.filter((c) => c.persona === id);
  const notes = social.notes.filter((n) => n.persona === id);
  const typing = !!live.typing[String(id)];
  const shared = social.share[String(id)];
  const blocked = social.blocked.includes(String(id));

  useEffect(() => {
    catchUpReplies(bridge);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!p) return;
    setSocial((s) => ({ read: { ...s.read, [p.id]: Date.now() }, seenMutual: mutual ? [...new Set([...s.seenMutual, p.id])] : s.seenMutual }));
  }, [p, mutual, msgs.length]);
  useEffect(() => {
    if (share === '1' && mutual && p) askSharedTable(p.id, minute);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mutual]);
  useEffect(() => {
    const id = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(id);
  }, [msgs.length, typing, notes.length, mutual]);

  if (!p) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 30 }}>
        <Backdrop />
        <Txt v="title">Niet gevonden</Txt>
        <Button title="Terug" kind="ghost" onPress={goBack} />
      </View>
    );
  }

  const safety = () => (
    <>
      <Sheet open={menu} onClose={() => setMenu(false)} title={p.name}>
        {tonight && mutual ? (
          <Button
            title="Stuur een drankje"
            kind="ghost"
            full
            icon="cay"
            onPress={() => {
              setMenu(false);
              setDrink(true);
            }}
          />
        ) : null}
        <Button
          title="Blokkeer"
          kind="ghost"
          full
          icon="block"
          onPress={() => {
            setMenu(false);
            setConfirm('block');
          }}
        />
        <Button
          title="Meld"
          kind="ghost"
          full
          icon="flag"
          onPress={() => {
            setMenu(false);
            setConfirm('report');
          }}
        />
        <Txt v="small" size={11.5} color={C.faint} align="center">
          Alles van Match verdwijnt om 22:00. Een blokkering blijft.
        </Txt>
      </Sheet>
      <Sheet open={!!confirm} onClose={() => setConfirm(null)} title={confirm === 'report' ? t('{name} melden', { name: p.name }) : t('{name} blokkeren?', { name: p.name })}>
        {confirm === 'report' ? (
          <>
            <Txt v="body" color={C.soft}>
              Wat is er gebeurd? Noor van de zaal krijgt je melding meteen, en {p.name} ziet je niet meer.
            </Txt>
            <Row gap={8} wrap>
              {REASONS.map((r) => (
                <Chip key={r} label={r} on={reason === r} onPress={() => setReason(r)} />
              ))}
            </Row>
            <Button title="Verstuur melding" kind="lacquer" full icon="flag" onPress={block} />
          </>
        ) : (
          <>
            <Txt v="body" color={C.soft}>
              {p.name} ziet je niet meer en kan je niets meer sturen. Dat blijft zo, ook na vanavond.
            </Txt>
            <Button title="Blokkeer" kind="lacquer" full icon="block" onPress={block} />
          </>
        )}
      </Sheet>
    </>
);

  const table = tonight ? tableById(tonight.table) : undefined;
  const timeline = [...msgs.map((m) => ({ kind: 'msg' as const, at: m.at, m })), ...notes.map((n) => ({ kind: 'note' as const, at: n.at, n }))].sort((a, b) => a.at - b.at);
  const send = (value = text) => {
    if (!value.trim()) return;
    sendChat(p.id, value);
    setText('');
    tap('light');
  };
  const like = () => {
    emit({ kind: 'match-like', persona: p.id });
    update((s) => ({ match: { ...s.match, liked: [...new Set([...s.match.liked, p.id])] } }));
    tap('success');
  };
  const block = () => {
    setSocial((s) => ({ blocked: [...new Set([...s.blocked, p.id])], ...(confirm === 'report' ? { reported: [...new Set([...s.reported, p.id])] } : {}) }));
    toast(confirm === 'report' ? tr('Gemeld. Noor kijkt het na.') : t('{name} is geblokkeerd', { name: p.name }), { icon: 'shield' });
    setConfirm(null);
    router.replace('/match');
  };

  const header = (
    <View style={{ paddingTop: insets.top + 10, paddingHorizontal: PAD, paddingBottom: 12, borderBottomWidth: 1, borderColor: C.line }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Flip>
          <IconButton name="back" label="Terug" onPress={goBack} />
        </Flip>
        <Row gap={11} style={{ flex: 1, paddingHorizontal: 12 }}>
          <Avatar source={portraitOf(p)} size={40} />
          <View style={{ flex: 1, gap: 1 }}>
            <Txt v="h2" raw numberOfLines={1}>
              {p.name}
            </Txt>
            {mutual ? (
              <Row gap={6}>
                <LiveDot size={6} />
                <Txt v="small" size={11.5} color={C.amber} numberOfLines={1}>
                  {table ? t('Wederzijds · {table}', { table: table.label }) : tr('Wederzijds')}
                </Txt>
              </Row>
            ) : (
              <Txt v="small" size={11.5} color={C.muted} numberOfLines={1}>
                {INTENTS[p.intent].line}
              </Txt>
            )}
          </View>
        </Row>
        <IconButton name="more" label="Meer" onPress={() => setMenu(true)} />
      </Row>
    </View>
  );

  if (blocked) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <Backdrop />
        {header}
        <View style={{ padding: PAD, gap: 14, alignItems: 'center', marginTop: 60 }}>
          <Icon name="block" size={34} color={C.muted} />
          <Txt v="title">Geblokkeerd</Txt>
          <Txt v="body" color={C.muted} align="center">
            {p.name} ziet je niet meer en kan je niets meer sturen.
          </Txt>
        </View>
      </View>
    );
  }

  // ------------------------------------------------------------------------------------------- not mutual (yet)
  if (!mutual) {
    const cardW = Math.min(width, MAX_WIDTH) - PAD * 2;
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <Backdrop />
        {header}
        <ScrollView contentContainerStyle={{ padding: PAD, gap: 18, paddingBottom: insets.bottom + 40, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' }}>
          {tonight ? (
            <PersonCard t={tonight} width={cardW} height={Math.round(cardW * 1.24)} drink={drinksOf(events).get(p.id)} />
          ) : (
            <View style={{ gap: 12 }}>
              <Portrait source={portraitOf(p)} style={{ width: cardW, height: cardW * 1.3, opacity: 0.6 }} radius={28} />
              <Txt v="body" color={C.muted}>
                {p.name} is niet meer binnen. Match toont alleen wie er nu is.
              </Txt>
            </View>
          )}
          {tonight ? (
            <>
              {liked ? (
                <Card tone="flat" pad={16}>
                  <Row gap={12}>
                    <Icon name="heart" size={18} color={C.ember} />
                    <Txt v="small" color={C.soft} style={{ flex: 1 }}>
                      Je vond {p.name} leuk. Als het wederzijds is, opent hier jullie gesprek.
                    </Txt>
                  </Row>
                </Card>
              ) : (
                <Button title="Leuk" kind="lacquer" size="lg" full icon="heart" onPress={like} />
              )}
              <Button title="Stuur een drankje" kind="bone" size="lg" full icon="cay" onPress={() => setDrink(true)} />
              <Txt v="small" color={C.faint} align="center">
                Chatten kan zodra jullie elkaar allebei leuk vinden.
              </Txt>
            </>
          ) : null}
        </ScrollView>
        <DrinkSheet target={drink && tonight ? tonight : null} onClose={() => setDrink(false)} />
        {safety()}
      </View>
    );
  }

  // ------------------------------------------------------------------------------------------- the conversation
  const ordered = tonight ? orderedOf(tonight.group, p.id) : [];
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Backdrop />
      {header}
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: PAD, gap: 14, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
        <PopIn style={{ alignItems: 'center', gap: 10, paddingVertical: 10 }}>
          <Portrait source={portraitOf(p)} style={{ width: 120, height: 156, borderWidth: 1, borderColor: C.line2 }} radius={20} shade={0.2} />
          <Txt v="serif" size={24} align="center">
            Jij en {p.name}
          </Txt>
          <Txt v="small" color={C.muted} align="center">
            Wederzijds om {ninjaTime(mutualAt!)}. Dit gesprek verdwijnt om 22:00.
          </Txt>
          {table ? (
            <Row gap={8} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: R.pill, borderWidth: 1, borderColor: 'rgba(255,181,71,0.4)', backgroundColor: 'rgba(255,181,71,0.06)' }}>
              <Icon name="table" size={14} color={C.amber} />
              <Txt v="small" size={12} color={C.amber}>
                {AREAS[table.area].label.toLowerCase().includes(table.label.split(' ')[0].toLowerCase()) ? table.label : t('{table} · {area}', { table: table.label, area: tr(AREAS[table.area].label) })}
              </Txt>
            </Row>
          ) : (
            <Txt v="small" color={C.muted} align="center">
              {p.name} is net vertrokken.
            </Txt>
          )}
          {ordered.length ? (
            <Txt v="small" size={12} color={C.soft} raw>
              {ordered.join(' · ')}
            </Txt>
          ) : null}
        </PopIn>

        <DemoNote text="Demo: de antwoorden zijn vooraf geschreven en komen een paar seconden na jouw bericht." />
        {tonight && !shared ? (
          <Card tone="oxblood" pad={18}>
            <View style={{ gap: 10 }}>
              <Kicker color={C.flame}>Deel een tafel</Kicker>
              <Txt v="h2">Samen aan het travertijn?</Txt>
              <Txt v="small" color="rgba(244,236,225,0.78)">
                Noor zet jullie samen aan een tafel in het midden van de zaal. Jullie borden schuiven mee.
              </Txt>
              <Button title="Vraag het aan Noor" kind="bone" size="sm" icon="table" onPress={() => askSharedTable(p.id, minute)} />
            </View>
          </Card>
        ) : null}
        {shared && !shared.table ? (
          <FloorNote icon="users">
            <Row gap={8}>
              <LiveDot size={6} />
              <Txt v="small" color={C.soft}>
                Noor zoekt een tafel voor jullie…
              </Txt>
            </Row>
          </FloorNote>
        ) : null}

        {timeline.map((item) =>
          item.kind === 'msg' ? (
            <Bubble key={item.m.id} mine={item.m.mine} text={item.m.mine ? item.m.text : tr(item.m.text)} time={ninjaTime(item.m.at)} />
          ) : (
            <FloorNote key={item.n.id} icon="table">
              <Txt v="small" color={C.soft}>
                {t('Noor: {table} is vrij. Kom maar, ik zet jullie samen.', { table: tableById(item.n.text)?.label ?? item.n.text })}
              </Txt>
            </FloorNote>
          ),
        )}
        {typing ? (
          <View {...fx('leather')} style={{ alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 20, borderBottomLeftRadius: 6, backgroundColor: C.panel2, borderWidth: 1, borderColor: C.line2 }}>
            <Typing />
          </View>
        ) : null}
        <View style={{ height: 8 }} />
      </ScrollView>

      <View style={{ paddingHorizontal: PAD, paddingTop: 10, paddingBottom: insets.bottom + 12, borderTopWidth: 1, borderColor: C.line, gap: 10, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' }}>
        {msgs.filter((m) => m.mine).length < 2 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled">
            {openers(p).map((o) => (
              <Chip key={o} label={o} small onPress={() => send(tr(o))} />
            ))}
          </ScrollView>
        ) : null}
        <Row gap={10}>
          <TextInput
            value={text}
            onChangeText={(v) => setText(v.slice(0, 280))}
            placeholder={t('Bericht aan {name}', { name: p.name })}
            placeholderTextColor="#5C5047"
            onSubmitEditing={() => send()}
            returnKeyType="send"
            style={[{ flex: 1, height: 48, borderRadius: R.pill, borderWidth: 1, borderColor: C.line2, backgroundColor: C.bg2, paddingHorizontal: 18, color: C.ink, fontFamily: FONT.sans, fontSize: 15 }, web({ outlineStyle: 'none' })]}
          />
          <Press onPress={() => send()} disabled={!text.trim()} accessibilityLabel={tr('Verstuur')} fxNames="lacquer-btn" style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: C.oxblood, borderWidth: 1, borderColor: 'rgba(244,236,225,0.34)' }}>
            <Flip>
              <Icon name="send" size={19} color={C.ink} />
            </Flip>
          </Press>
        </Row>
      </View>
      <DrinkSheet target={drink && tonight ? tonight : null} onClose={() => setDrink(false)} />
      {safety()}
    </View>
  );
}
