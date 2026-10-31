import { dishById, emit, INTENTS, ME, type Intent } from '@ninja/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { View, type ViewStyle } from 'react-native';

import { Icon } from '../components/Icon';
import { Button, Card, Chip, Field, Kicker, PopIn, Press, Row, tap, Txt } from '../components/ui';
import { tr } from '../i18n';
import { useApp } from '../state/app';
import { C, fx, isWeb, R } from '../theme';
import { nj } from './css';
import { LiveCamera, pickImage, type CameraHandle, type CameraState } from './LiveCamera';
import { DEMO_SELFIE } from './match';
import { Portrait } from './parts';
import { portraitFrom } from './photo';
import { setSocial, useSocial } from './store';

type Photo = { uri: string; from: 'camera' | 'library' | 'demo' };

const MAINS = ['iskender', 'ninja-kebab', 'durum', 'platter-rice', 'ninja-rolls', 'ninja-menu', 'falafel-hummus'];
const LINE_IDEAS = ['Vaste gast aan het vuur.', 'Hier voor de korst, ik blijf voor de rakı.', 'Altijd de Iskender, nooit spijt.'];

function Steps({ step }: { step: number }) {
  return (
    <Row gap={6}>
      {[0, 1, 2].map((i) => (
        <View key={i} {...fx(i <= step ? 'ember-btn' : '')} style={{ flex: 1, height: 2, borderRadius: 1, backgroundColor: i <= step ? C.ember : C.line2 }} />
      ))}
    </Row>
  );
}

/**
 * Switching Match on, in three steps: a photo (a selfie with the camera, a picture from the phone, or the demo's
 * portrait when there is no camera), why she is here tonight, and what she is eating. Then she sees her own card the
 * way the room will see it, and agrees to the house rules.
 */
export function MatchSetup({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const { saved, update, orders } = useApp();
  const social = useSocial();
  const [step, setStep] = useState(0);
  const [photo, setPhoto] = useState<Photo | null>(social.selfie ? { uri: social.selfie, from: social.selfieFrom ?? 'camera' } : social.selfieFrom === 'demo' ? { uri: 'demo', from: 'demo' } : null);
  const [cam, setCam] = useState<CameraState>('idle');
  const [active, setActive] = useState(false);
  const [pop, setPop] = useState(0);
  const camRef = useRef<CameraHandle>(null);
  const [intent, setIntent] = useState<Intent>(saved.match.intent);
  const ordered = useMemo(() => [...new Set(orders.flatMap((o) => o.items.map((i) => i.dish)).filter((d) => MAINS.includes(d)))], [orders]);
  const [dish, setDish] = useState(social.eating ?? ordered[0] ?? ME.usual.dish);
  const [line, setLine] = useState(social.myLine);
  const [agree, setAgree] = useState(false);

  useEffect(() => {
    if (cam === 'missing' || cam === 'denied' || cam === 'error') {
      setActive(false);
      setPhoto((p) => p ?? { uri: 'demo', from: 'demo' });
    }
  }, [cam]);

  const source = photo ? (photo.from === 'demo' ? DEMO_SELFIE : { uri: photo.uri }) : undefined;

  const shoot = async () => {
    const c = camRef.current?.capture();
    if (!c) return;
    tap('success');
    setPop((n) => n + 1);
    const uri = await portraitFrom(c);
    setPhoto({ uri, from: 'camera' });
    setActive(false);
  };

  const choose = async () => {
    const d = await pickImage();
    if (!d) return;
    setActive(false);
    setPhoto({ uri: await portraitFrom(d), from: 'library' });
  };

  const finish = async () => {
    if (!photo) return;
    const small = photo.from === 'demo' ? '/people/me.webp' : isWeb ? await portraitFrom(photo.uri, 180, 240, 0.7) : photo.uri;
    setSocial({ selfie: photo.from === 'demo' ? null : photo.uri, selfieFrom: photo.from, eating: dish, myLine: line.trim() });
    update((s) => ({ match: { ...s.match, on: true, photo: small, intent } }));
    emit({ kind: 'match-on', photo: small, intent });
    tap('success');
    onDone();
  };

  const frame: ViewStyle = { width: '100%', aspectRatio: 4 / 5, borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: C.line2, backgroundColor: C.bg2 };

  return (
    <View style={{ gap: 22 }}>
      <View style={{ gap: 14 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Kicker color={C.amber}>{`Ninja Match · ${step + 1}/3`}</Kicker>
          <Press onPress={onCancel} accessibilityLabel={tr('Annuleren')}>
            <Txt v="label" size={9} color={C.muted}>
              Annuleren
            </Txt>
          </Press>
        </Row>
        <Steps step={step} />
      </View>

      {step === 0 ? (
        <PopIn style={{ gap: 18 }}>
          <View style={{ gap: 6 }}>
            <Txt v="display">Je foto voor vanavond</Txt>
            <Txt v="body" color={C.soft}>
              Eén foto, alleen voor wie hier nu is. Om 22:00 is hij weg.
            </Txt>
          </View>
          <View style={frame}>
            {active ? <LiveCamera ref={camRef} facing="user" active={active} onState={setCam} style={{ position: 'absolute', inset: 0 } as ViewStyle} /> : null}
            {!active && source ? <Portrait source={source} radius={0} shade={0.35} style={{ position: 'absolute', inset: 0 } as ViewStyle} /> : null}
            {!active && !source ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, margin: 14, borderRadius: 22, borderWidth: 1, borderColor: C.line2, borderStyle: 'dashed' }}>
                <View style={{ width: 74, height: 74, borderRadius: 37, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line2 }}>
                  <Icon name="user" size={34} color={C.muted} />
                </View>
                <Txt v="small" color={C.muted} align="center" style={{ maxWidth: 220 }}>
                  Een selfie aan tafel, of een foto van je telefoon.
                </Txt>
              </View>
            ) : null}
            {active ? (
              <View style={{ position: 'absolute', left: 0, right: 0, bottom: 18, alignItems: 'center' }}>
                <Press onPress={shoot} scaleTo={0.9} accessibilityLabel={tr('Foto maken')} style={{ width: 76, height: 76, borderRadius: 38, borderWidth: 3, borderColor: C.bone, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: C.bone }} />
                </Press>
              </View>
            ) : null}
            {active && cam === 'starting' ? (
              <View style={{ position: 'absolute', top: 16, left: 16 }}>
                <Txt v="label" size={9} color={C.soft}>
                  Camera start…
                </Txt>
              </View>
            ) : null}
            {photo?.from === 'demo' && !active ? (
              <View {...fx('glass')} style={{ position: 'absolute', top: 14, left: 14, right: 14, padding: 12, borderRadius: R.md, backgroundColor: C.glass, borderWidth: 1, borderColor: C.line2 }}>
                <Txt v="small" size={12.5} color={C.soft}>
                  {cam === 'missing' || cam === 'denied' || cam === 'error' ? 'Geen camera gevonden. Voor de demo staat Margaux’ eigen foto klaar.' : 'De demofoto van Margaux.'}
                </Txt>
              </View>
            ) : null}
            {pop ? <View key={pop} {...nj('pop')} style={{ position: 'absolute', inset: 0, backgroundColor: '#FFFFFF' } as ViewStyle} /> : null}
          </View>
          {active ? (
            <Button title="Annuleren" kind="ghost" full onPress={() => setActive(false)} />
          ) : photo ? (
            <View style={{ gap: 10 }}>
              <Button title="Verder" kind="lacquer" size="lg" full after="arrow" onPress={() => setStep(1)} />
              <Row gap={8} wrap style={{ justifyContent: 'center' }}>
                <Chip label="Opnieuw" icon="camera" onPress={() => setActive(true)} />
                <Chip label="Kies een foto" icon="image" onPress={choose} />
              </Row>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              <Button title="Neem een selfie" kind="lacquer" size="lg" full icon="camera" onPress={() => setActive(true)} />
              <Row gap={8} wrap style={{ justifyContent: 'center' }}>
                <Chip label="Kies een foto" icon="image" onPress={choose} />
                <Chip label="Gebruik de demofoto" icon="user" onPress={() => setPhoto({ uri: 'demo', from: 'demo' })} />
              </Row>
            </View>
          )}
        </PopIn>
      ) : null}

      {step === 1 ? (
        <PopIn style={{ gap: 16 }}>
          <View style={{ gap: 6 }}>
            <Txt v="display">Waarom ben je hier?</Txt>
            <Txt v="body" color={C.soft}>
              Je ziet iedereen. Wat je kiest, staat op je kaart.
            </Txt>
          </View>
          {(Object.keys(INTENTS) as Intent[]).map((id) => {
            const on = intent === id;
            return (
              <Card key={id} tone={on ? 'oxblood' : 'leather'} onPress={() => setIntent(id)} label={INTENTS[id].label} pad={20}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <View style={{ gap: 4, flex: 1 }}>
                    <Txt v="label" size={11} color={on ? C.flame : C.ink}>
                      {INTENTS[id].label}
                    </Txt>
                    <Txt v="serif" size={19} color={on ? C.ink : C.soft}>
                      {INTENTS[id].line}
                    </Txt>
                  </View>
                  <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: on ? C.flame : C.line2, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? 'rgba(255,230,168,0.12)' : 'transparent' }}>
                    {on ? <Icon name="check" size={15} color={C.flame} stroke={2} /> : null}
                  </View>
                </Row>
              </Card>
            );
          })}
          <Button title="Verder" kind="lacquer" size="lg" full after="arrow" onPress={() => setStep(2)} />
        </PopIn>
      ) : null}

      {step === 2 ? (
        <PopIn style={{ gap: 18 }}>
          <View style={{ gap: 6 }}>
            <Txt v="display">Wat eet je vanavond?</Txt>
            <Txt v="body" color={C.soft}>
              {ordered.length ? 'Uit je bestelling. Een gesprek begint vaak bij het bord.' : 'Een gesprek begint vaak bij het bord.'}
            </Txt>
          </View>
          <Row gap={8} wrap>
            {[...new Set([...ordered, ...MAINS])].map((id) => (
              <Chip key={id} label={dishById(id).name} raw on={dish === id} onPress={() => setDish(id)} />
            ))}
          </Row>
          <View style={{ gap: 8 }}>
            <Txt v="label" size={9} color={C.muted}>
              Eén zin over jezelf
            </Txt>
            <Field value={line} onChangeText={(v) => setLine(v.slice(0, 70))} placeholder={LINE_IDEAS[0]} maxLength={70} />
            <Row gap={6} wrap>
              {LINE_IDEAS.map((l) => (
                <Chip key={l} label={l} small onPress={() => setLine(l)} />
              ))}
            </Row>
          </View>
          <View style={{ gap: 10 }}>
            <Txt v="label" size={9} color={C.muted}>
              Zo ziet de zaal je
            </Txt>
            <Row gap={14} align="stretch">
              <Portrait source={source} style={{ width: 112, height: 150 }} radius={18} shade={0.6} />
              <View style={{ flex: 1, gap: 6, justifyContent: 'center' }}>
                <Txt v="label" size={8.5} color={C.flame}>
                  {INTENTS[intent].label}
                </Txt>
                <Txt v="hero" size={26} raw>
                  {ME.first}
                </Txt>
                <Txt v="small" color={C.soft} numberOfLines={2}>
                  “{line.trim() || LINE_IDEAS[0]}”
                </Txt>
                <Row gap={6}>
                  <Txt v="label" size={7.5} color={C.muted}>
                    Eet vanavond
                  </Txt>
                  <Txt v="small" size={12} raw>
                    {dishById(dish).name}
                  </Txt>
                </Row>
              </View>
            </Row>
          </View>
          <Press onPress={() => setAgree((a) => !a)} accessibilityRole="checkbox" accessibilityState={{ checked: agree }}>
            <Row gap={12} align="flex-start" style={{ padding: 14, borderRadius: R.md, borderWidth: 1, borderColor: agree ? C.amber : C.line2 }}>
              <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: agree ? C.amber : C.line2, alignItems: 'center', justifyContent: 'center', backgroundColor: agree ? 'rgba(255,181,71,0.15)' : 'transparent' }}>
                {agree ? <Icon name="check" size={14} color={C.amber} stroke={2.2} /> : null}
              </View>
              <Txt v="small" color={C.soft} style={{ flex: 1 }}>
                Ik hou het respectvol. Alleen voornamen, mijn tafel blijft verborgen tot het wederzijds is, en om 22:00 verdwijnt alles.
              </Txt>
            </Row>
          </Press>
          <Button title="Zet Match aan" kind="lacquer" size="lg" full icon="match" disabled={!agree} onPress={finish} />
        </PopIn>
      ) : null}
    </View>
  );
}
