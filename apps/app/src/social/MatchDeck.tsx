import { INTENTS, tableById, type Tonight } from '@ninja/shared';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, PanResponder, View, type ViewStyle } from 'react-native';

import { Icon } from '../components/Icon';
import { nativeDriver, Press, Row, Rule, Tag, Txt } from '../components/ui';
import { C, fx, R } from '../theme';
import { orderedOf, portraitOf } from './match';
import { Portrait, RoundAction } from './parts';

/** One person's card: the portrait full bleed, the name in wide caps, the job in serif, why they are here tonight. */
export function PersonCard({ t, width, height, drink, onOpen, mutual }: { t: Tonight; width: number; height: number; drink?: 'sent' | 'brought'; onOpen?: () => void; mutual?: boolean }) {
  const p = t.persona;
  const ordered = orderedOf(t.group, p.id);
  const table = tableById(t.table);
  const body = (
    <Portrait source={portraitOf(p)} style={{ width, height }} radius={28} shade={0.92}>
      <Row style={{ position: 'absolute', top: 16, left: 16, right: 16, justifyContent: 'space-between' }}>
        <View {...fx('glass')} style={{ paddingHorizontal: 11, paddingVertical: 6, borderRadius: R.pill, borderWidth: 1, borderColor: C.line2, backgroundColor: C.glass }}>
          <Txt v="label" size={8.5} color={C.flame}>
            {INTENTS[p.intent].label}
          </Txt>
        </View>
        <Row gap={6} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: R.pill, borderWidth: 1, borderColor: C.line2, backgroundColor: C.glass }}>
          <Icon name={mutual ? 'table' : 'lock'} size={12} color={mutual ? C.amber : C.soft} />
          {mutual && table ? (
            <Txt v="label" size={8} color={C.amber} raw>
              {table.label}
            </Txt>
          ) : (
            <Txt v="label" size={8} color={C.soft}>
              Tafel verborgen
            </Txt>
          )}
        </Row>
      </Row>
      <View style={{ position: 'absolute', left: 20, right: 20, bottom: 20, gap: 9 }}>
        <Row gap={12} align="flex-end">
          <Txt v="hero" size={38} raw numberOfLines={1}>
            {p.name}
          </Txt>
          <Txt v="stat" size={24} color={C.soft} raw style={{ marginBottom: 3 }}>
            {String(p.age)}
          </Txt>
        </Row>
        <Txt v="serif" size={19} color={C.soft}>
          {p.job}
        </Txt>
        <Txt v="body" size={14.5} color={C.ink}>
          “{p.line}”
        </Txt>
        <Row gap={6} wrap>
          {p.vibe.map((v) => (
            <Tag key={v} label={v} color={C.ink} bg="rgba(244,236,225,0.08)" />
          ))}
          {drink ? <Tag label={drink === 'brought' ? 'Drankje gebracht' : 'Drankje onderweg'} icon="cay" color={C.amber} bg="rgba(255,181,71,0.1)" /> : null}
        </Row>
        <Rule style={{ marginTop: 4, opacity: 0.6 }} />
        <Row gap={10}>
          <Txt v="label" size={8} color={C.muted}>
            Eet vanavond
          </Txt>
          <Txt v="small" size={12.5} color={C.ink} raw numberOfLines={1} style={{ flex: 1 }}>
            {ordered.join(' · ')}
          </Txt>
        </Row>
      </View>
    </Portrait>
  );
  if (!onOpen) return body;
  return (
    <Press onPress={onOpen} scaleTo={0.99} haptic={false} accessibilityLabel={p.name}>
      {body}
    </Press>
  );
}

type DeckProps = {
  people: Tonight[];
  width: number;
  drinks: Map<string, 'sent' | 'brought'>;
  onLike: (t: Tonight) => void;
  onPass: (t: Tonight) => void;
  onDrink: (t: Tonight) => void;
  onOpen: (t: Tonight) => void;
};

/**
 * The deck: one person at a time, the next one waiting behind. Drag to the right to like, to the left to pass, or use
 * the three buttons; the card leaves with weight, without bouncing.
 */
export function MatchDeck({ people, width, drinks, onLike, onPass, onDrink, onOpen }: DeckProps) {
  const height = Math.round(width * 1.24);
  const pan = useRef(new Animated.ValueXY()).current;
  const busy = useRef(false);
  const top = people[0];
  const next = people[1];
  const third = people[2];
  const latest = useRef({ top, onLike, onPass });
  latest.current = { top, onLike, onPass };

  useEffect(() => {
    pan.setValue({ x: 0, y: 0 });
    busy.current = false;
  }, [top?.persona.id, pan]);

  const fling = (dir: 1 | -1, dy = 0) => {
    const current = latest.current.top;
    if (!current || busy.current) return;
    busy.current = true;
    Animated.timing(pan, { toValue: { x: dir * (width + 160), y: dy + 30 }, duration: 380, easing: Easing.in(Easing.cubic), useNativeDriver: nativeDriver }).start(() => {
      if (dir > 0) latest.current.onLike(current);
      else latest.current.onPass(current);
    });
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
        onPanResponderMove: (_, g) => pan.setValue({ x: g.dx, y: g.dy * 0.35 }),
        onPanResponderRelease: (_, g) => {
          if (g.dx > width * 0.3 || g.vx > 0.9) fling(1, g.dy * 0.35);
          else if (g.dx < -width * 0.3 || g.vx < -0.9) fling(-1, g.dy * 0.35);
          else Animated.timing(pan, { toValue: { x: 0, y: 0 }, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }).start();
        },
        onPanResponderTerminate: () => Animated.timing(pan, { toValue: { x: 0, y: 0 }, duration: 300, useNativeDriver: nativeDriver }).start(),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [width],
  );

  const rotate = pan.x.interpolate({ inputRange: [-width, 0, width], outputRange: ['-10deg', '0deg', '10deg'] });
  const likeOp = pan.x.interpolate({ inputRange: [0, width * 0.28], outputRange: [0, 1], extrapolate: 'clamp' });
  const passOp = pan.x.interpolate({ inputRange: [-width * 0.28, 0], outputRange: [1, 0], extrapolate: 'clamp' });
  const behind = pan.x.interpolate({ inputRange: [-width, 0, width], outputRange: [1, 0.94, 1], extrapolate: 'clamp' });
  const behindY = pan.x.interpolate({ inputRange: [-width, 0, width], outputRange: [0, 14, 0], extrapolate: 'clamp' });

  if (!top) return null;
  const stamp = (label: string, color: string, side: 'left' | 'right', opacity: Animated.AnimatedInterpolation<number>) => (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', top: 70, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 2, borderColor: color, opacity, transform: [{ rotate: side === 'left' ? '-12deg' : '12deg' }] },
        side === 'left' ? { left: 22 } : { right: 22 },
      ]}
    >
      <Txt v="label" size={15} color={color} weight="800" style={{ letterSpacing: 4 }}>
        {label}
      </Txt>
    </Animated.View>
  );

  return (
    <View style={{ alignItems: 'center', gap: 20 }}>
      <View style={{ width, height }}>
        {third ? (
          <View style={{ position: 'absolute', inset: 0, transform: [{ translateY: 26 }, { scale: 0.88 }], opacity: 0.35 } as ViewStyle}>
            <PersonCard t={third} width={width} height={height} />
          </View>
        ) : null}
        {next ? (
          <Animated.View style={{ position: 'absolute', inset: 0, transform: [{ translateY: behindY }, { scale: behind }], opacity: 0.82 } as never}>
            <PersonCard t={next} width={width} height={height} drink={drinks.get(next.persona.id)} />
          </Animated.View>
        ) : null}
        <Animated.View
          key={top.persona.id}
          {...responder.panHandlers}
          style={{ position: 'absolute', inset: 0, transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }] } as never}
        >
          <PersonCard t={top} width={width} height={height} drink={drinks.get(top.persona.id)} onOpen={() => onOpen(top)} />
          {stamp('Leuk', C.ember, 'left', likeOp)}
          {stamp('Volgende', C.ink, 'right', passOp)}
        </Animated.View>
      </View>
      <Row gap={26} align="flex-start">
        <RoundAction icon="close" label="Volgende" onPress={() => fling(-1)} size={58} />
        <RoundAction icon="cay" label="Drankje" onPress={() => onDrink(top)} size={58} kind="bone" />
        <RoundAction icon="heart" label="Leuk" onPress={() => fling(1)} size={58} kind="lacquer" />
      </Row>
    </View>
  );
}
