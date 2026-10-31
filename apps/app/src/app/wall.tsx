import { eventsOf, WALL_SEED } from '@ninja/shared';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, useWindowDimensions, View, type ViewStyle } from 'react-native';

import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { Button, DemoNote, LiveDot, Press, Row, Tag, tap, Txt } from '../components/ui';
import { tr } from '../i18n';
import { PHOTOS } from '../photos';
import { useApp } from '../state/app';
import { C, fx, MAX_WIDTH, PAD, R, web } from '../theme';
import { nj } from '../social/css';
import { ninjaTime } from '../social/match';
import { Plinth } from '../social/parts';
import { setSocial, useSocial } from '../social/store';

type Tile = { id: string; source: number | { uri: string }; caption: string; likes: number; aspect: number; who: 'ninja' | 'jij'; state: 'ok' | 'wacht' | 'nee'; at?: number };

/** The screen in the room, drawn small: the night's photos crossfading, the caption and the hearts in the corner. */
function RoomScreen({ tiles }: { tiles: Tile[] }) {
  const shown = tiles.filter((t) => t.state === 'ok');
  const [i, setI] = useState(0);
  useEffect(() => {
    if (shown.length < 2) return;
    const id = setInterval(() => setI((n) => (n + 1) % shown.length), 4200);
    return () => clearInterval(id);
  }, [shown.length]);
  const tile = shown[i % Math.max(1, shown.length)];
  if (!tile) return null;
  return (
    <Plinth>
      <View {...nj('tv')} style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 14, overflow: 'hidden', backgroundColor: '#050302', borderWidth: 1, borderColor: 'rgba(201,205,211,0.3)' }}>
        <View style={{ flex: 1, flexDirection: 'row' }}>
          {/* the photo, and the same photo blurred to fill the wide screen */}
          <View style={{ position: 'absolute', inset: 0, opacity: 0.45 } as ViewStyle}>
            <View style={[{ flex: 1 }, web({ filter: 'blur(18px) brightness(.6)', transform: 'scale(1.2)' })]}>
              <Image source={tile.source} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </View>
          </View>
          <View key={tile.id} {...nj('xfade', 'film')} style={{ height: '100%', aspectRatio: tile.aspect, alignSelf: 'center', marginHorizontal: 'auto' } as ViewStyle}>
            <Image source={tile.source} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          </View>
        </View>
        <View pointerEvents="none" {...nj('scan')} style={{ position: 'absolute', inset: 0, opacity: 0.6 } as ViewStyle} />
        <Row gap={6} style={{ position: 'absolute', top: 10, right: 12 }}>
          <LiveDot size={6} />
          <Txt v="label" size={7.5}>
            Live in de zaal
          </Txt>
        </Row>
        <View style={{ position: 'absolute', left: 12, bottom: 10, right: 12, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
          <Txt v="small" size={11} numberOfLines={1} style={{ flex: 1 }}>
            {tile.caption}
          </Txt>
          <Row gap={4}>
            <Icon name="heart" size={11} color={C.ember} />
            <Txt v="num" size={10} raw>
              {String(tile.likes)}
            </Txt>
          </Row>
        </View>
      </View>
    </Plinth>
  );
}

/**
 * The Wall: tonight's photos as they play on the screen inside Ninja (and on the website). Ninja's own flash photos,
 * and the guests' pictures from the Flash camera once the floor lets them through. Hearts are counted here.
 */
export default function Wall() {
  const { bridge } = useApp();
  const social = useSocial();
  const { width } = useWindowDimensions();
  const colW = (Math.min(width, MAX_WIDTH) - PAD * 2 - 12) / 2;

  const tiles = useMemo<Tile[]>(() => {
    const judged = new Map(eventsOf(bridge, 'wall').map((w) => [w.ref, w.ok]));
    const mine = eventsOf(bridge, 'flash')
      .filter((f) => f.thumb)
      .reverse()
      .map<Tile>((f) => ({ id: f.ref, source: { uri: f.thumb }, caption: f.caption, likes: 0, aspect: 9 / 16, who: 'jij', state: judged.get(f.ref) === undefined ? 'wacht' : judged.get(f.ref) ? 'ok' : 'nee', at: f.at }));
    const seed = WALL_SEED.map<Tile>((s, i) => ({ id: s.photo, source: PHOTOS[s.photo], caption: s.caption, likes: s.likes, aspect: i % 3 === 1 ? 0.8 : 0.7, who: 'ninja', state: 'ok' }));
    return [...mine.filter((m) => m.state !== 'nee'), ...seed].map((t) => ({ ...t, likes: t.likes + (social.wallLikes.includes(t.id) ? 1 : 0) }));
  }, [bridge, social.wallLikes]);

  // Two columns, each tile to the shorter one.
  const columns = useMemo(() => {
    const cols: Tile[][] = [[], []];
    const h = [0, 0];
    for (const t of tiles) {
      const c = h[0] <= h[1] ? 0 : 1;
      cols[c].push(t);
      h[c] += colW / t.aspect + 12;
    }
    return cols;
  }, [tiles, colW]);

  const like = (id: string) => {
    tap('light');
    setSocial((s) => ({ wallLikes: s.wallLikes.includes(id) ? s.wallLikes.filter((x) => x !== id) : [...s.wallLikes, id] }));
  };
  const total = tiles.filter((t) => t.state === 'ok').length;

  return (
    <Screen back kicker="Op het scherm in de zaal" title="De Wall" serif="de foto’s van vanavond">
      <RoomScreen tiles={tiles} />
      <Row gap={10}>
        <Txt v="small" color={C.muted} style={{ flex: 1 }}>
          {total} foto’s op het scherm aan de bar, en op de website.
        </Txt>
        <Button title="Flitsfoto" kind="lacquer" size="sm" icon="flash" onPress={() => router.push('/flash')} />
      </Row>
      <Row gap={12} align="flex-start">
        {columns.map((col, ci) => (
          <View key={ci} style={{ flex: 1, gap: 12 }}>
            {col.map((t) => {
              const liked = social.wallLikes.includes(t.id);
              return (
                <View key={t.id} style={{ gap: 7 }}>
                  <View {...fx('film')} style={{ width: '100%', aspectRatio: t.aspect, borderRadius: R.md, overflow: 'hidden', backgroundColor: C.panel2, borderWidth: t.state === 'wacht' ? 1 : 0, borderColor: C.amber, borderStyle: 'dashed' }}>
                    <Image source={t.source} style={{ width: '100%', height: '100%', opacity: t.state === 'wacht' ? 0.6 : 1 }} resizeMode="cover" />
                    <View style={{ position: 'absolute', top: 8, left: 8 }}>
                      {t.who === 'jij' ? (
                        <Tag label={t.state === 'wacht' ? 'Wacht op de zaal' : 'Jij'} color={t.state === 'wacht' ? C.amber : C.ink} bg={C.glass} />
                      ) : (
                        <Tag label="Ninja" color={C.ink} bg={C.glass} />
                      )}
                    </View>
                  </View>
                  <Row gap={8} align="flex-start">
                    <Txt v="small" size={11.5} color={C.soft} style={{ flex: 1 }} numberOfLines={2}>
                      {t.caption}
                    </Txt>
                    <Press onPress={() => like(t.id)} accessibilityLabel={tr('Hartje')} accessibilityState={{ selected: liked }} haptic={false} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2 }}>
                      <Icon name="heart" size={14} color={liked ? C.ember : C.muted} stroke={liked ? 2 : 1.5} />
                      <Txt v="num" size={10.5} color={liked ? C.ember : C.muted} raw>
                        {String(t.likes)}
                      </Txt>
                    </Press>
                  </Row>
                  {t.at ? (
                    <Txt v="num" size={9} color={C.faint} raw>
                      {ninjaTime(t.at)}
                    </Txt>
                  ) : null}
                </View>
              );
            })}
          </View>
        ))}
      </Row>
      <DemoNote text="De foto’s van Ninja zijn echt, uit de eigen galerij. Gastfoto’s komen er pas op na goedkeuring in het panel." />
    </Screen>
  );
}
