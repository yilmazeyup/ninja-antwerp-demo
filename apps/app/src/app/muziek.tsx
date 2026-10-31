import { nowPlaying, PLAYLIST, spotifySearch } from '@ninja/shared';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { View, type ViewStyle } from 'react-native';

import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { Bar, Button, DemoNote, Kicker, Press, Row, Txt } from '../components/ui';
import { BRAND } from '../photos';
import { C, fx, web } from '../theme';
import { nj } from '../social/css';
import { Plinth } from '../social/parts';
import { mmss, openLink } from '../social/util';

/** The record on the platter: black grooves, an oxblood label with the puffy N, turning at 33⅓. */
function Record({ size }: { size: number }) {
  return (
    <View style={{ width: size, height: size }}>
      <View
        {...nj('spin')}
        style={[
          { width: size, height: size, borderRadius: size / 2, backgroundColor: '#0A0807', alignItems: 'center', justifyContent: 'center' },
          web({
            backgroundImage:
              'repeating-radial-gradient(circle at 50% 50%, rgba(255,255,255,.05) 0 1px, rgba(0,0,0,0) 1px 3px), conic-gradient(from 30deg, rgba(255,255,255,.0), rgba(255,255,255,.10) 8%, rgba(255,255,255,0) 18%, rgba(255,255,255,0) 50%, rgba(255,255,255,.08) 58%, rgba(255,255,255,0) 68%)',
            boxShadow: '0 30px 60px -24px rgba(0,0,0,.95), inset 0 0 0 1px rgba(255,255,255,.06)',
          }),
        ]}
      >
        <View {...fx('oxblood')} style={{ width: size * 0.36, height: size * 0.36, borderRadius: size, backgroundColor: C.oxblood, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(244,236,225,0.2)' }}>
          <Image source={BRAND.n} style={{ width: size * 0.17, height: size * 0.155 }} contentFit="contain" />
          <View style={{ position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: '#0A0807' }} />
        </View>
      </View>
      {/* the tonearm, in chrome */}
      <View style={{ position: 'absolute', right: -size * 0.04, top: -size * 0.04, width: size * 0.5, height: size * 0.62, transform: [{ rotate: '24deg' }] } as ViewStyle}>
        <View {...fx('chrome-ring')} style={{ position: 'absolute', right: size * 0.06, top: 0, width: 26, height: 26, borderRadius: 13 }} />
        <View {...fx('chrome')} style={{ position: 'absolute', right: size * 0.06 + 11, top: 18, width: 4, height: size * 0.5, borderRadius: 2, backgroundColor: C.chrome }} />
        <View style={{ position: 'absolute', right: size * 0.06 + 4, top: size * 0.5 + 12, width: 18, height: 26, borderRadius: 4, backgroundColor: '#2A2A2E', borderWidth: 1, borderColor: 'rgba(201,205,211,0.4)' }} />
      </View>
    </View>
  );
}

function Equalizer({ color = C.ember }: { color?: string }) {
  return (
    <Row gap={2} align="flex-end" style={{ height: 14 }}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} {...nj('eq')} style={[{ width: 3, height: 14, borderRadius: 1, backgroundColor: color }, web({ animationDelay: `${i * 0.17}s`, animationDuration: `${0.8 + i * 0.13}s` })]} />
      ))}
    </Row>
  );
}

/** What plays in the room now, how far in, what comes next, and the night's list, each a tap from Spotify. */
export default function Muziek() {
  const [, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const np = nowPlaying(new Date());
  const index = PLAYLIST.findIndex((p) => p.title === np.track.title);

  return (
    <Screen back kicker="Nu in de zaal" title="Muziek" serif="wat er speelt, terwijl de spies draait" gap={22}>
      <Plinth style={{ paddingVertical: 16 }}>
        <Record size={250} />
      </Plinth>
      <View style={{ gap: 8, alignItems: 'center' }}>
        <Row gap={10}>
          <Equalizer />
          <Txt v="label" size={9} color={C.amber}>
            Speelt nu
          </Txt>
        </Row>
        <Txt v="display" align="center" raw>
          {np.track.title}
        </Txt>
        <Txt v="label" size={11} color={C.soft} raw>
          {np.track.artist}
        </Txt>
      </View>
      <View style={{ gap: 8 }}>
        <Bar value={np.at / np.track.seconds} height={3} />
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt v="num" size={11} color={C.muted} raw>
            {mmss(np.at)}
          </Txt>
          <Txt v="num" size={11} color={C.muted} raw>
            {`−${mmss(np.track.seconds - np.at)}`}
          </Txt>
        </Row>
      </View>
      <Button title="Open in Spotify" kind="bone" size="lg" full icon="music" onPress={() => openLink(spotifySearch(np.track.artist, np.track.title))} />
      <Row gap={12} style={{ paddingVertical: 4 }}>
        <Txt v="label" size={8.5} color={C.muted}>
          Hierna
        </Txt>
        <Txt v="small" color={C.soft} raw numberOfLines={1} style={{ flex: 1 }}>
          {`${np.next.title} · ${np.next.artist}`}
        </Txt>
      </Row>
      <View style={{ gap: 2 }}>
        <Kicker>De lijst van vanavond</Kicker>
        <View style={{ height: 8 }} />
        {PLAYLIST.map((p, i) => {
          const on = i === index;
          return (
            <Press key={p.title} onPress={() => openLink(spotifySearch(p.artist, p.title))} scaleTo={0.99} accessibilityLabel={`${p.title}, ${p.artist}`}>
              <Row gap={14} style={{ paddingVertical: 11, borderBottomWidth: 1, borderColor: C.line }}>
                <View style={{ width: 22, alignItems: 'center' }}>
                  {on ? (
                    <Equalizer />
                  ) : (
                    <Txt v="num" size={11} color={C.faint} raw>
                      {String(i + 1).padStart(2, '0')}
                    </Txt>
                  )}
                </View>
                <View style={{ flex: 1, gap: 1 }}>
                  <Txt v="h3" size={14} raw color={on ? C.amber : C.ink} numberOfLines={1}>
                    {p.title}
                  </Txt>
                  <Txt v="small" size={12} color={C.muted} raw numberOfLines={1}>
                    {p.artist}
                  </Txt>
                </View>
                <Txt v="num" size={10.5} color={C.faint} raw>
                  {mmss(p.seconds)}
                </Txt>
                <Icon name="play" size={14} color={C.muted} />
              </Row>
            </Press>
          );
        })}
      </View>
      <DemoNote text="Demo: de lijst is een voorbeeld. In de echte app leest dit mee met wat er in de zaal speelt." />
    </Screen>
  );
}
