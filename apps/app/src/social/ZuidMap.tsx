import { Image } from 'expo-image';
import { memo, type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import Svg, { Defs, G, Line as SvgLine, Polygon, Polyline, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { Icon } from '../components/Icon';
import { Txt } from '../components/ui';
import { tr } from '../i18n';
import { BRAND } from '../photos';
import { C, FONT, fx } from '../theme';
import { ZUID, type Line } from './zuid';

/** The part of the Zuid the map shows, in metres from Ninja's door: the Schelde on the left, the museum on the right. */
const VIEW = { x0: -450, x1: 270, y0: -435, y1: 395 };
const W = VIEW.x1 - VIEW.x0;
const H = VIEW.y1 - VIEW.y0;
export const MAP_ASPECT = W / H;

const pts = (l: Line) => {
  let s = '';
  for (let i = 0; i < l.length; i += 2) s += `${l[i]},${l[i + 1]} `;
  return s;
};

const LABELS = new Set(['Vlaamsekaai', 'Waalsekaai', 'Leopold de Waelplaats', 'Kloosterstraat', 'Volkstraat', 'Amerikalei', 'Scheldestraat']);

/** The streets, drawn once: lacquer black, bone hairlines, the river a shade lighter. */
const Streets = memo(function Streets() {
  return (
    <Svg width="100%" height="100%" viewBox={`${VIEW.x0} ${VIEW.y0} ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
      <Defs>
        <RadialGradient id="zuid-glow" cx="0" cy="0" r="260" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#9C242A" stopOpacity="0.35" />
          <Stop offset="1" stopColor="#9C242A" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x={VIEW.x0} y={VIEW.y0} width={W} height={H} fill="#0E0A08" />
      {ZUID.parks.map((p, i) => (
        <Polygon key={`p${i}`} points={pts(p)} fill="rgba(244,236,225,0.035)" />
      ))}
      {ZUID.water.map((p, i) => (
        <Polygon key={`w${i}`} points={pts(p)} fill="#17120F" stroke="rgba(201,205,211,0.22)" strokeWidth={1.6} />
      ))}
      <Rect x={VIEW.x0} y={VIEW.y0} width={W} height={H} fill="url(#zuid-glow)" />
      {ZUID.path.map((l, i) => (
        <Polyline key={`f${i}`} points={pts(l)} fill="none" stroke="rgba(244,236,225,0.09)" strokeWidth={1.6} strokeDasharray="5 5" />
      ))}
      {ZUID.minor.map((l, i) => (
        <Polyline key={`m${i}`} points={pts(l)} fill="none" stroke="rgba(244,236,225,0.13)" strokeWidth={4.6} strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {ZUID.major.map((l, i) => (
        <Polyline key={`M${i}`} points={pts(l)} fill="none" stroke="rgba(244,236,225,0.24)" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {ZUID.tram.map((l, i) => (
        <Polyline key={`t${i}`} points={pts(l)} fill="none" stroke="rgba(201,205,211,0.28)" strokeWidth={1.4} strokeDasharray="10 6" />
      ))}
      {/* on foot from the two car parks */}
      {[ZUID.steendok, ZUID.kooldok].map(([x, y], i) => (
        <SvgLine key={`r${i}`} x1={x} y1={y} x2={0} y2={0} stroke="#FFB547" strokeOpacity={0.75} strokeWidth={2.4} strokeDasharray="3 7" strokeLinecap="round" />
      ))}
      {ZUID.labels
        .filter((l) => LABELS.has(l.name))
        .map((l) => (
          <G key={l.name} transform={`translate(${l.x} ${l.y}) rotate(${l.angle})`}>
            <SvgText x={0} y={-7} fill="rgba(244,236,225,0.46)" fontSize={17} fontWeight="700" fontFamily={FONT.sans} letterSpacing={3} textAnchor="middle">
              {l.name.toUpperCase()}
            </SvgText>
          </G>
        ))}
      <SvgText x={-428} y={-150} fill="rgba(201,205,211,0.42)" fontSize={26} fontStyle="italic" fontFamily={FONT.serif} transform="rotate(-62 -428 -150)">
        Schelde
      </SvgText>
    </Svg>
  );
});

const at = ([x, y]: readonly number[] | number[]): ViewStyle => ({ position: 'absolute', left: `${((x - VIEW.x0) / W) * 100}%`, top: `${((y - VIEW.y0) / H) * 100}%` });

function Pin({ point, children, label, sub, above }: { point: readonly number[]; children: ReactNode; label: string; sub?: string; above?: boolean }) {
  return (
    <View style={[at(point), { width: 0, height: 0, alignItems: 'center', justifyContent: 'center' }]}>
      <View style={{ alignItems: 'center', gap: 5, width: 130, flexDirection: above ? 'column-reverse' : 'column', transform: [{ translateY: above ? -14 : 14 }] }}>
        {children}
        <View {...fx('glass')} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: C.line2, backgroundColor: C.glass, alignItems: 'center' }}>
          <Txt v="label" size={7.5} color={C.ink} raw>
            {label}
          </Txt>
          {sub ? (
            <Txt v="num" size={8} color={C.muted} raw>
              {sub}
            </Txt>
          ) : null}
        </View>
      </View>
    </View>
  );
}

/**
 * Het Zuid around Vlaamsekaai 52, drawn from OpenStreetMap: the quays, the filled-in docks with the two car parks under
 * them, the museum, the Schelde. Ninja is the oxblood seal in the middle; dotted amber is the walk from the car.
 */
export function ZuidMap({ minutes }: { minutes: { steendok: number; kooldok: number; museum: number } }) {
  return (
    <View style={{ width: '100%', aspectRatio: MAP_ASPECT, overflow: 'hidden', borderRadius: 24, borderWidth: 1, borderColor: C.line2, backgroundColor: '#0E0A08' }}>
      <Streets />
      <Pin point={ZUID.steendok} label="Parking Steendok" sub={tr('{n} min te voet').replace('{n}', String(minutes.steendok))}>
        <ParkingMark />
      </Pin>
      <Pin point={ZUID.kooldok} above label="Parking Kooldok" sub={tr('{n} min te voet').replace('{n}', String(minutes.kooldok))}>
        <ParkingMark />
      </Pin>
      <Pin point={ZUID.museum} above label="KMSKA" sub={tr('{n} min te voet').replace('{n}', String(minutes.museum))}>
        <View {...fx('glass')} style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line2, backgroundColor: C.glass }}>
          <Icon name="museum" size={15} color={C.chrome} />
        </View>
      </Pin>
      <View style={[at([0, 0]), { width: 0, height: 0, alignItems: 'center', justifyContent: 'center' }]}>
        <View {...fx('live')} style={{ position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(156,36,42,0.25)' }} />
        <View {...fx('seal')} style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: C.oxblood, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] }}>
          <Image source={BRAND.n} style={{ width: 30, height: 27 }} contentFit="contain" />
        </View>
        <View {...fx('glass')} style={{ position: 'absolute', top: 30, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9, borderWidth: 1, borderColor: C.line2, backgroundColor: C.glass, minWidth: 104, alignItems: 'center' }}>
          <Txt v="label" size={8} raw>
            NINJA
          </Txt>
          <Txt v="num" size={8.5} color={C.soft} raw>
            Vlaamsekaai 52
          </Txt>
        </View>
      </View>
      <View style={{ position: 'absolute', right: 10, bottom: 8 }}>
        <Txt v="num" size={7.5} color={C.faint} raw>
          © OpenStreetMap
        </Txt>
      </View>
    </View>
  );
}

function ParkingMark() {
  return (
    <View {...fx('chrome-ring')} style={{ width: 28, height: 28, borderRadius: 8, padding: 1.5 }}>
      <View style={{ flex: 1, borderRadius: 7, backgroundColor: '#101418', alignItems: 'center', justifyContent: 'center' }}>
        <Txt v="num" size={13} weight="700" color={C.chrome} raw>
          P
        </Txt>
      </View>
    </View>
  );
}
