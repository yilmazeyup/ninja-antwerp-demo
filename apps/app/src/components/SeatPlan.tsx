import { ROOM, TABLES, type Table } from '@ninja/shared';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, Line, Rect, Text as SvgText } from 'react-native-svg';

import { tr } from '../i18n';
import { C, FONT } from '../theme';
import { Press, Txt } from './ui';

export type SeatPlanProps = {
  /** Tables taken right now (by the evening). */
  taken: Set<string>;
  selected: string | null;
  onSelect: (id: string) => void;
  /** Only tables that fit the group are offered. */
  fits: (t: Table) => boolean;
};

const S = 21;
const W = 16.8 * S;
const H = 13.2 * S;
const X = (x: number) => (x + 8.4) * S;
const Z = (z: number) => (z + 4.9) * S;
const pct = (v: number, of: number) => `${(v / of) * 100}%`;

/**
 * The room from above, drawn from the same plan as the 3D model: the kitchen with the two spits and the fire, the
 * banquette along the back wall, the travertine tables, the spaceship bar, the windows and the terrace. The room is a
 * drawing; the tables on it are buttons.
 */
export function SeatPlan({ taken, selected, onSelect, fits }: SeatPlanProps) {
  return (
    <View style={{ width: '100%', aspectRatio: W / H }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0 } as never}>
        <Rect x={X(-8)} y={Z(-4.5)} width={16 * S} height={9 * S} rx={10} fill="#140E0B" stroke="rgba(244,236,225,0.16)" />
        <Rect x={X(ROOM.kitchen.x0)} y={Z(ROOM.kitchen.z0)} width={(ROOM.kitchen.x1 - ROOM.kitchen.x0) * S} height={(ROOM.kitchen.z1 - ROOM.kitchen.z0) * S} fill="#1E130E" />
        <Rect x={X(ROOM.fire.x - ROOM.fire.w / 2)} y={Z(ROOM.fire.z - ROOM.fire.d / 2)} width={ROOM.fire.w * S} height={ROOM.fire.d * S} rx={3} fill="#FF6A2A" opacity={0.75} />
        {ROOM.spits.map((s) => (
          <Circle key={s.id} cx={X(s.x)} cy={Z(s.z)} r={0.35 * S} fill="#7A3B22" stroke="#FFB547" strokeWidth={1} />
        ))}
        <Circle cx={X(ROOM.oven.x)} cy={Z(ROOM.oven.z)} r={ROOM.oven.r * S} fill="#2A1A12" stroke="rgba(255,181,71,0.5)" />
        <Rect x={X(ROOM.pass.x - ROOM.pass.w / 2)} y={Z(ROOM.pass.z - ROOM.pass.d / 2)} width={ROOM.pass.w * S} height={ROOM.pass.d * S} fill="#9AA0A8" opacity={0.5} />
        <Rect x={X(-3)} y={Z(-4.5)} width={7.2 * S} height={0.55 * S} fill="#5E1016" />
        <Ellipse cx={X(ROOM.bar.x)} cy={Z(ROOM.bar.z)} rx={ROOM.bar.rx * S} ry={ROOM.bar.rz * S} fill="none" stroke="#C9CDD3" strokeWidth={5} opacity={0.75} />
        <Line x1={X(-8)} x2={X(8)} y1={Z(4.5)} y2={Z(4.5)} stroke="rgba(170,200,230,0.45)" strokeWidth={3} />
        <Rect x={X(ROOM.door.x - ROOM.door.w / 2)} y={Z(4.5) - 3} width={ROOM.door.w * S} height={6} fill="#0B0807" />
        <SvgText x={X(-6.4)} y={Z(1.35)} fill="rgba(244,236,225,0.45)" fontSize={8} fontFamily={FONT.sans} letterSpacing={1.5}>
          {tr('KEUKEN')}
        </SvgText>
        <SvgText x={X(-3)} y={Z(8.15)} fill="rgba(244,236,225,0.45)" fontSize={8} fontFamily={FONT.sans} letterSpacing={1.5}>
          {tr('VLAAMSEKAAI · TERRAS')}
        </SvgText>
      </Svg>
      {TABLES.map((t) => {
        const ok = fits(t) && !taken.has(t.id);
        const on = selected === t.id;
        const round = t.shape !== 'rect';
        const w = t.shape === 'stool' ? 0.64 : t.w;
        const d = t.shape === 'stool' ? 0.64 : round ? t.w : t.d;
        return (
          <Press
            key={t.id}
            disabled={!ok}
            onPress={() => onSelect(t.id)}
            accessibilityLabel={tr(t.label)}
            scaleTo={0.9}
            style={{
              position: 'absolute',
              left: pct(X(t.x - w / 2), W) as never,
              top: pct(Z(t.z - d / 2), H) as never,
              width: pct(w * S, W) as never,
              height: pct(d * S, H) as never,
              borderRadius: round ? 999 : 4,
              backgroundColor: on ? C.ember : ok ? C.travertine : 'rgba(244,236,225,0.12)',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 1,
            }}
          >
            <Txt v="num" size={7} color={on ? '#1A0A04' : ok ? C.black : 'rgba(244,236,225,0.35)'} raw>
              {t.id}
            </Txt>
          </Press>
        );
      })}
    </View>
  );
}
