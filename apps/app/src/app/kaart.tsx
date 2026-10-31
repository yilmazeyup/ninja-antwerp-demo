import { hash, KI_PER_EURO, ME, rankInfo } from '@ninja/shared';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { Screen } from '../components/Screen';
import { Card, DemoNote, Kicker, Ring, Row, Txt } from '../components/ui';
import { BRAND } from '../photos';
import { useApp } from '../state/app';
import { C, MAX_WIDTH, PAD, R } from '../theme';
import { MemberCard } from '../social/MemberCard';
import { Plinth } from '../social/parts';
import { WalletButtons } from '../social/Wallet';
import { t } from '../social/util';

const PERIOD = 30;

/** The door code: bars like a sound wave, new every thirty seconds, so a screenshot of it is worth nothing. */
function DoorCode() {
  const [s, setS] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setS(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  const slot = Math.floor(s / PERIOD);
  const bars = Array.from({ length: 23 }, (_, i) => 0.18 + ((hash(`${ME.number}-${slot}-${i}`) % 1000) / 1000) * 0.82);
  const left = PERIOD - (s % PERIOD);
  return (
    <Card tone="travertine" pad={18}>
      <View style={{ gap: 14 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt v="label" size={9} color="#3A2A22">
            Aan de deur
          </Txt>
          <Ring value={left / PERIOD} size={30} stroke={3} from="#9C242A" to="#7B151A" track="rgba(11,8,7,0.1)">
            <Txt v="num" size={9} color="#3A2A22" raw>
              {String(left)}
            </Txt>
          </Ring>
        </Row>
        <Row gap={12} style={{ height: 64, paddingHorizontal: 14, borderRadius: 32, backgroundColor: '#0B0807' }}>
          <Image source={BRAND.n} style={{ width: 34, height: 31 }} contentFit="contain" />
          <Row gap={3} align="center" style={{ flex: 1, height: 40, justifyContent: 'space-between' }}>
            {bars.map((b, i) => (
              <View key={i} style={{ width: 4, height: `${Math.round(b * 100)}%`, borderRadius: 2, backgroundColor: '#F4ECE1' }} />
            ))}
          </Row>
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt v="small" size={12} color="#3A2A22" style={{ flex: 1 }}>
            Toon dit aan Noor. Je schuift meteen naar voren.
          </Txt>
          <Txt v="num" size={11} color="#3A2A22" raw numberOfLines={1}>{`No. ${ME.number}`}</Txt>
        </Row>
      </View>
    </Card>
  );
}

/** Her card, full size: to show at the door, to put in a wallet, with what her rank gives her. */
export default function Kaart() {
  const { saved } = useApp();
  const { width } = useWindowDimensions();
  const rank = rankInfo(ME.rank);
  const cardW = Math.min(width, MAX_WIDTH) - PAD * 2 - 8;
  return (
    <Screen back kicker="Ninja Clan" title="Je kaart" serif={t('{rank} sinds je vijftiende bezoek', { rank: rank.name })} gap={20}>
      <Plinth>
        <MemberCard width={cardW} extraKi={saved.ki} />
      </Plinth>
      <WalletButtons />
      <DoorCode />
      <Card tone="leather" pad={18}>
        <View style={{ gap: 12 }}>
          <Kicker color={C.amber}>{t('Wat {rank} je geeft', { rank: rank.name })}</Kicker>
          {rank.perks.map((p) => (
            <Row key={p} gap={10}>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.amber }} />
              <Txt v="body" size={14.5} style={{ flex: 1 }}>
                {p}
              </Txt>
            </Row>
          ))}
        </View>
      </Card>
      <Row gap={14} style={{ padding: 16, borderRadius: R.md, borderWidth: 1, borderColor: C.line }}>
        <Txt v="stat" size={26} color={C.amber} raw>
          Ki
        </Txt>
        <Txt v="small" color={C.muted} style={{ flex: 1 }}>
          {t('Je krijgt {n} Ki per euro. Je spendeert ze aan gerechten en drops.', { n: KI_PER_EURO })}
        </Txt>
      </Row>
      <DemoNote text="De Clan, de rangen en Ki zijn een voorstel voor Ninja. Margaux is de gast van de demo." />
    </Screen>
  );
}
