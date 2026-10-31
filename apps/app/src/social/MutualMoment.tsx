import { personaById } from '@ninja/shared';
import { router } from 'expo-router';
import { Modal, View, type ViewStyle } from 'react-native';

import { Icon } from '../components/Icon';
import { Button, Kicker, PopIn, Press, Row, Txt } from '../components/ui';
import { C, fx, web } from '../theme';
import { DEMO_SELFIE, portraitOf } from './match';
import { Portrait } from './parts';
import { setSocial, useSocial } from './store';

/**
 * The moment two people like each other: both photos side by side, a few words in serif, and the two things to do
 * next — say something, or ask Noor for a table together.
 */
export function MutualMoment({ persona, onClose }: { persona: string | null; onClose: () => void }) {
  const social = useSocial();
  const p = persona ? personaById(persona) : undefined;
  if (!p) return null;
  const mine = social.selfie ? { uri: social.selfie } : DEMO_SELFIE;
  const done = () => {
    setSocial((s) => ({ seenMutual: [...new Set([...s.seenMutual, p.id])] }));
    onClose();
  };
  return (
    <Modal visible transparent animationType="fade" onRequestClose={done}>
      <View {...fx('glass-strong')} style={[{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: 'rgba(8,5,4,0.88)' }, web({ backdropFilter: 'blur(22px)' })]}>
        <PopIn style={{ alignItems: 'center', gap: 26, width: '100%', maxWidth: 420 }}>
          <Kicker color={C.amber}>Ninja Match</Kicker>
          <View style={{ height: 250, width: 300, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ position: 'absolute', left: 18, transform: [{ rotate: '-7deg' }] } as ViewStyle}>
              <Portrait source={mine} style={{ width: 150, height: 200, borderWidth: 1, borderColor: C.line2 }} radius={20} shade={0} />
            </View>
            <View style={{ position: 'absolute', right: 18, transform: [{ rotate: '6deg' }, { translateY: 14 }] } as ViewStyle}>
              <Portrait source={portraitOf(p)} style={{ width: 150, height: 200, borderWidth: 1, borderColor: C.line2 }} radius={20} shade={0} />
            </View>
            <View {...fx('seal')} style={{ width: 54, height: 54, borderRadius: 14, backgroundColor: C.oxblood, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }, { translateY: 92 }] }}>
              <Icon name="heart" size={22} color={C.bone} stroke={1.8} />
            </View>
          </View>
          <View style={{ alignItems: 'center', gap: 8 }}>
            <Txt v="serif" size={40} align="center" style={{ lineHeight: 44 }}>
              Het is wederzijds
            </Txt>
            <Txt v="body" color={C.soft} align="center">
              {p.name} vindt jou ook leuk. Jullie zien nu elkaars tafel.
            </Txt>
          </View>
          <View style={{ width: '100%', gap: 10 }}>
            <Button
              title="Zeg iets"
              kind="lacquer"
              size="lg"
              full
              icon="chat"
              onPress={() => {
                done();
                router.push(`/match/${p.id}`);
              }}
            />
            <Button
              title="Deel een tafel"
              kind="bone"
              size="lg"
              full
              icon="table"
              onPress={() => {
                done();
                router.push(`/match/${p.id}?share=1`);
              }}
            />
            <Press onPress={done} style={{ alignSelf: 'center', paddingVertical: 10 }}>
              <Row gap={6}>
                <Txt v="label" size={9} color={C.muted}>
                  Later
                </Txt>
              </Row>
            </Press>
          </View>
        </PopIn>
      </View>
    </Modal>
  );
}
