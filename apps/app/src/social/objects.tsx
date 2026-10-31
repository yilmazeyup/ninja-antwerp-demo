import { euro } from '@ninja/shared';
import { Image } from 'expo-image';
import { Text, View, type ViewStyle } from 'react-native';

import { Row, Txt } from '../components/ui';
import { BRAND } from '../photos';
import { C, FONT, fx, web } from '../theme';
import { nj } from './css';

/** One screw in the plate, its slot turned a little differently each time. */
function Screw({ style, turn }: { style: ViewStyle; turn: number }) {
  return (
    <View {...nj('screw')} style={[{ position: 'absolute', width: 11, height: 11, borderRadius: 6, backgroundColor: '#B8893B', alignItems: 'center', justifyContent: 'center' }, style]}>
      <View style={{ width: 7, height: 1.3, backgroundColor: 'rgba(60,36,6,0.65)', transform: [{ rotate: `${turn}deg` }] }} />
    </View>
  );
}

/**
 * The brass plate on a private spit: engraved letters, four screws, brushed metal. It shows the name live while she
 * types it.
 */
export function BrassPlate({ name, date, width = 300 }: { name: string; date: string; width?: number }) {
  const h = Math.round(width * 0.38);
  const shown = name.trim() || 'Jouw naam';
  return (
    <View {...nj('brass')} style={{ width, height: h, borderRadius: 7, backgroundColor: '#C9A35A', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <View pointerEvents="none" style={[{ position: 'absolute', inset: 0 } as ViewStyle, web({ backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,.07) 0 1px, rgba(0,0,0,.035) 1px 3px)' })]} />
      <View pointerEvents="none" style={[{ position: 'absolute', inset: 5, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(74,50,14,0.35)' } as ViewStyle]} />
      <Screw style={{ left: 10, top: 10 }} turn={20} />
      <Screw style={{ right: 10, top: 10 }} turn={-35} />
      <Screw style={{ left: 10, bottom: 10 }} turn={70} />
      <Screw style={{ right: 10, bottom: 10 }} turn={5} />
      <Txt v="label" size={Math.max(8, width * 0.03)} color="#4A320E" style={{ letterSpacing: width * 0.012, marginBottom: 2 }}>
        De spies van
      </Txt>
      <Text {...nj('engrave')} numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontWeight: '600', fontSize: Math.min(width * 0.12, 600 / Math.max(6, shown.length)), color: '#4A320E', maxWidth: width * 0.82, textAlign: 'center' }}>
        {shown}
      </Text>
      <Text {...nj('engrave')} style={{ fontFamily: FONT.mono, fontSize: Math.max(8, width * 0.03), letterSpacing: 2, color: '#4A320E', marginTop: 4 }}>
        {date}
      </Text>
    </View>
  );
}

/** A gift from Ninja Gift as a card: oxblood leather, the puffy wordmark, the gift, the name and the note. */
export function GiftCard({ label, amount, to, note, from, code, width = 330 }: { label: string; amount: number; to: string; note: string; from: string; code: string; width?: number }) {
  const h = Math.round(width / 1.42);
  return (
    <View
      {...fx('oxblood leather stitch')}
      style={[
        { width, height: h, borderRadius: 22, overflow: 'hidden', backgroundColor: C.oxblood, borderWidth: 1, borderColor: 'rgba(244,236,225,0.22)', padding: 20, justifyContent: 'space-between' },
        web({ boxShadow: '0 30px 60px -24px rgba(0,0,0,.95), 0 14px 30px -14px rgba(156,36,42,.6), inset 0 1px 0 rgba(255,255,255,.14)' }),
      ]}
    >
      <Row style={{ justifyContent: 'space-between' }} align="flex-start">
        <Image source={BRAND.logo} style={{ width: width * 0.34, height: width * 0.34 * 0.404 }} contentFit="contain" />
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Txt v="label" size={8.5} color={C.flame}>
            Ninja Gift
          </Txt>
          <Txt v="num" size={9} color="rgba(244,236,225,0.6)" raw>
            {code}
          </Txt>
        </View>
      </Row>
      <View style={{ gap: 4 }}>
        <Txt v="display" size={Math.max(18, width * 0.072)} numberOfLines={1}>
          {label}
        </Txt>
        <Row gap={10}>
          <Txt v="stat" size={Math.max(16, width * 0.06)} color={C.flame} raw>
            {euro(amount)}
          </Txt>
          <View style={{ height: 1, flex: 1, backgroundColor: 'rgba(244,236,225,0.2)' }} />
        </Row>
      </View>
      <View style={{ gap: 3 }}>
        <Txt v="serif" size={Math.max(15, width * 0.056)} numberOfLines={1}>
          Voor {to.trim() || '…'}
        </Txt>
        {note.trim() ? (
          <Txt v="small" size={12} color="rgba(244,236,225,0.78)" numberOfLines={2} raw>
            {`“${note.trim()}”`}
          </Txt>
        ) : null}
        <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
          <Txt v="label" size={8} color="rgba(244,236,225,0.6)">
            Van {from}
          </Txt>
          <Txt v="label" size={8} color="rgba(244,236,225,0.6)" raw>
            VLAAMSEKAAI 52
          </Txt>
        </Row>
      </View>
    </View>
  );
}
