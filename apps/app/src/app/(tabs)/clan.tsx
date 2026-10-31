import { dayShort, dropsAt, dropState, EARLY, eventsOf, formatNo, ME, nightsAt, nowPlaying, RANKS, WALL_SEED } from '@ninja/shared';
import { router } from 'expo-router';
import { Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { Button, Card, Kicker, Press, Row, SectionHead, Txt } from '../../components/ui';
import { tr } from '../../i18n';
import { useApp, useTick } from '../../state/app';
import { C, FONT, fx, MAX_WIDTH, PAD, R } from '../../theme';
import { nj } from '../../social/css';
import { MemberCard } from '../../social/MemberCard';
import { WalletButtons } from '../../social/Wallet';
import { Plinth } from '../../social/parts';
import { countdownLong, t } from '../../social/util';

const ki = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/** The four ranks as a ladder; hers lit, with what it gives her. */
function Ladder() {
  const at = RANKS.findIndex((r) => r.id === ME.rank);
  return (
    <View style={{ gap: 0 }}>
      {RANKS.map((r, i) => {
        const mine = i === at;
        const past = i < at;
        return (
          <Row key={r.id} gap={14} align="flex-start">
            <View style={{ alignItems: 'center', width: 52 }}>
              <View {...fx(mine ? 'seal' : '')} style={{ width: 50, height: 50, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: mine ? C.oxblood : 'transparent', borderWidth: mine ? 0 : 1, borderColor: past ? C.line2 : C.line, transform: [{ rotate: mine ? '-5deg' : '0deg' }] }}>
                <Text {...nj('emboss')} style={{ fontFamily: FONT.kanji, fontWeight: '800', fontSize: r.kanji.length > 1 ? 17 : 24, color: mine ? C.bone : past ? C.soft : C.faint }}>
                  {r.kanji}
                </Text>
              </View>
              {i < RANKS.length - 1 ? <View style={{ width: 1, flex: 1, minHeight: 22, backgroundColor: i < at ? C.amber : C.line2, opacity: i < at ? 0.6 : 1 }} /> : null}
            </View>
            <View style={{ flex: 1, gap: 4, paddingBottom: 20, paddingTop: 4 }}>
              <Row gap={8}>
                <Txt v="label" size={11} color={mine ? C.flame : past ? C.soft : C.muted} raw>
                  {r.name}
                </Txt>
                {mine ? (
                  <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, backgroundColor: 'rgba(255,181,71,0.14)' }}>
                    <Txt v="label" size={7.5} color={C.amber}>
                      Jij
                    </Txt>
                  </View>
                ) : null}
                <Txt v="small" size={11.5} color={C.faint} style={{ flex: 1, textAlign: 'right' }}>
                  {r.visits === null ? 'Op uitnodiging' : r.visits === 1 ? 'Eerste bezoek' : t('Vanaf {n} bezoeken', { n: r.visits })}
                </Txt>
              </Row>
              <Txt v="small" color={mine ? C.ink : C.muted}>
                {r.line}
              </Txt>
              {mine || r.id === 'kage' ? (
                <View style={{ gap: 5, marginTop: 4 }}>
                  {r.perks.map((p) => (
                    <Row key={p} gap={8}>
                      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: mine ? C.amber : C.faint }} />
                      <Txt v="small" size={12.5} color={mine ? C.soft : C.muted}>
                        {p}
                      </Txt>
                    </Row>
                  ))}
                </View>
              ) : null}
            </View>
          </Row>
        );
      })}
    </View>
  );
}

type Shortcut = { to: string; icon: IconName; label: string; sub: string; raw?: boolean };

/**
 * Ninja Clan: the member card as an object to hold, the ranks from Genin to Kage, her passports, and the doors to
 * everything the club has: her own spit, the drops, the nights, gifts, the Wall, Sensei, the music, the way there.
 */
export default function Clan() {
  const { saved, passports, bridge } = useApp();
  const { clock: c } = useTick(1000);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardW = Math.min(width, MAX_WIDTH) - PAD * 2 - 8;
  const now = c.now;
  const booking = eventsOf(bridge, 'spit-booking').at(-1);
  const drop = dropsAt(now).find((d) => dropState(d, now, EARLY[ME.rank]) !== 'uitverkocht');
  const dropState0 = drop ? dropState(drop, now, EARLY[ME.rank]) : null;
  const night = nightsAt(now).sort((a, b) => a.at.getTime() - b.at.getTime())[0];
  const wallCount = WALL_SEED.length + eventsOf(bridge, 'wall').filter((w) => w.ok).length;
  const np = nowPlaying(new Date());
  const last = passports.at(-1);

  const shortcuts: Shortcut[] = [
    { to: '/eigen-spies', icon: 'spit', label: 'Eigen Spies', sub: booking ? booking.plate : tr('Voor 8 tot 14'), raw: !!booking },
    {
      to: '/drops',
      icon: 'drop2',
      label: 'Drops',
      sub: drop ? (dropState0 === 'binnenkort' ? t('{name} · over {time}', { name: drop.name, time: countdownLong(drop.opens.getTime() - EARLY[ME.rank] * 60000 - now.getTime()) }) : t('{name} · nu open', { name: drop.name })) : tr('Binnenkort'),
      raw: true,
    },
    { to: '/nights', icon: 'ticket', label: 'Nights', sub: night ? `${tr(night.title)} · ${dayShort(night.at)}` : '', raw: true },
    { to: '/gift', icon: 'gift', label: 'Gift', sub: tr('Trakteer iemand'), raw: true },
    { to: '/wall', icon: 'screen', label: 'De Wall', sub: t('{n} foto’s', { n: wallCount }), raw: true },
    { to: '/sensei', icon: 'sensei', label: 'Sensei', sub: tr('Vraag het de gastheer'), raw: true },
    { to: '/muziek', icon: 'music', label: 'Muziek', sub: np.track.title, raw: true },
    { to: '/route', icon: 'route', label: 'Route', sub: 'Vlaamsekaai 52', raw: true },
    { to: '/instellingen', icon: 'settings', label: 'Instellingen', sub: tr('Taal, dieet, meldingen'), raw: true },
  ];

  return (
    <Screen tabs contentStyle={{ paddingTop: insets.top + 14 }} gap={22}>
      <Row style={{ justifyContent: 'space-between' }} align="flex-end">
        <View style={{ gap: 8 }}>
          <Kicker color={C.amber}>Ninja Clan</Kicker>
          <Txt v="display" raw>
            {ME.first}
          </Txt>
        </View>
        <Txt v="small" color={C.muted}>
          {t('Lid nummer {no}', { no: ME.number })}
        </Txt>
      </Row>

      <Plinth style={{ paddingVertical: 4 }}>
        <MemberCard width={cardW} extraKi={saved.ki} onPress={() => router.push('/kaart')} />
      </Plinth>
      <WalletButtons />

      <Row gap={10}>
        {[
          { label: 'Bezoeken', value: String(ME.visits) },
          { label: 'Ki', value: ki(ME.ki + saved.ki) },
          { label: 'Paspoorten', value: String(passports.length) },
        ].map((s) => (
          <View key={s.label} style={{ flex: 1, gap: 4, paddingVertical: 14, alignItems: 'center', borderRadius: R.md, borderWidth: 1, borderColor: C.line }}>
            <Txt v="stat" size={24} raw>
              {s.value}
            </Txt>
            <Txt v="label" size={8} color={C.muted}>
              {s.label}
            </Txt>
          </View>
        ))}
      </Row>

      <View style={{ gap: 6 }}>
        <SectionHead kicker="De rangen" title="Van Genin tot Kage" serif="de schaduw wacht nooit" />
        <Ladder />
      </View>

      <Card tone="cognac" pad={18} onPress={() => router.push('/paspoorten')} label={tr('Je paspoorten')}>
        <Row gap={14}>
          <View style={{ flex: 1, gap: 5 }}>
            <Kicker color={C.flame}>Je verzameling</Kicker>
            <Txt v="h2">Je paspoorten</Txt>
            <Txt v="small" color="rgba(244,236,225,0.8)">
              {last ? t('{n} borden van de spies, het laatste No. {no}.', { n: passports.length, no: formatNo(last.no) }) : tr('Elk bord van de spies krijgt een genummerd paspoort. Je eerste komt met je eerste bord.')}
            </Txt>
          </View>
          <Icon name="chevron" size={18} color={C.ink} />
        </Row>
      </Card>

      <View style={{ gap: 12 }}>
        <SectionHead kicker="De club" title="Alles van de Clan" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {shortcuts.map((s) => (
            <Press key={s.to} onPress={() => router.push(s.to as never)} accessibilityLabel={tr(s.label)} fxNames="leather" scaleTo={0.97} style={{ width: (cardW + 8 - 20) / 3, minHeight: 112, padding: 13, gap: 8, borderRadius: R.md, borderWidth: 1, borderColor: C.line, backgroundColor: C.panel, justifyContent: 'space-between' }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line2 }}>
                <Icon name={s.icon} size={17} color={C.amber} />
              </View>
              <View style={{ gap: 2 }}>
                <Txt v="h3" size={13.5} numberOfLines={1}>
                  {s.label}
                </Txt>
                <Txt v="small" size={10.5} color={C.muted} numberOfLines={2} raw={s.raw}>
                  {s.sub}
                </Txt>
              </View>
            </Press>
          ))}
        </View>
      </View>
      <Button title="Je kaart aan de deur" kind="ghost" full icon="qr" onPress={() => router.push('/kaart')} />
    </Screen>
  );
}
