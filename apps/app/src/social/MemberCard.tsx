import { ME, monthLong, rankInfo } from '@ninja/shared';
import { Image } from 'expo-image';
import { useEffect, useRef, type ComponentRef } from 'react';
import { Text, View, type ViewStyle } from 'react-native';

import { Press, Row, Txt } from '../components/ui';
import { BRAND } from '../photos';
import { C, FONT, fx, isWeb, web } from '../theme';
import { nj } from './css';
import { t } from './util';

const ki = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/**
 * The Clan card as an object: black lacquer and oxblood leather with a saddle stitch, the puffy N, the rank in kanji,
 * a chrome edge. On the web it floats a little and tilts under the finger or the mouse, and the light slides over it.
 */
export function MemberCard({ width = 340, extraKi = 0, onPress, still }: { width?: number; extraKi?: number; onPress?: () => void; still?: boolean }) {
  const box = useRef<ComponentRef<typeof View>>(null);
  const rank = rankInfo(ME.rank);
  const h = Math.round(width / 1.586);
  const since = new Date(ME.since);

  useEffect(() => {
    if (!isWeb || still) return;
    const el = box.current as unknown as HTMLElement | null;
    if (!el) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.animation = 'none';
      el.style.transition = 'transform .12s ease-out';
      el.style.transform = `perspective(1100px) rotateX(${(-y * 12).toFixed(2)}deg) rotateY(${(x * 16).toFixed(2)}deg)`;
      el.style.setProperty('--sx', `${((x + 0.5) * 100).toFixed(1)}%`);
      el.style.setProperty('--sy', `${((y + 0.5) * 100).toFixed(1)}%`);
    };
    const leave = () => {
      el.style.transition = 'transform .8s cubic-bezier(.2,.8,.2,1)';
      el.style.transform = '';
      setTimeout(() => {
        el.style.animation = '';
      }, 800);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    };
  }, [still]);

  const face = (
    <View
      ref={box}
      {...nj(still ? '' : 'float')}
      style={[
        { width, height: h, borderRadius: width * 0.062, overflow: 'hidden', backgroundColor: '#140809', borderWidth: 1, borderColor: 'rgba(201,205,211,0.34)' },
        web({
          backgroundImage: 'linear-gradient(140deg, #3A0D11 0%, #1C090A 42%, #0E0807 78%, #0B0807 100%)',
          boxShadow: '0 30px 60px -22px rgba(0,0,0,.95), 0 12px 24px -12px rgba(123,21,26,.55), inset 0 1px 0 rgba(255,255,255,.12)',
        }),
      ]}
    >
      {/* lacquer depth, a faint pebble, the saddle stitch */}
      <View pointerEvents="none" style={[{ position: 'absolute', inset: 0 } as ViewStyle, web({ backgroundImage: 'radial-gradient(90% 70% at 12% 0%, rgba(173,40,48,.55), rgba(173,40,48,0) 60%), radial-gradient(70% 60% at 100% 100%, rgba(255,106,42,.10), rgba(255,106,42,0) 60%)' })]} />
      <View pointerEvents="none" {...fx('leather')} style={{ position: 'absolute', inset: 0, opacity: 0.22 } as ViewStyle} />
      <View pointerEvents="none" style={{ position: 'absolute', inset: 7, borderRadius: width * 0.05, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(244,236,225,0.2)' } as ViewStyle} />
      {/* a large N pressed into the leather */}
      <Image source={BRAND.n} style={{ position: 'absolute', width: h * 1.05, height: h * 0.95, right: -h * 0.16, bottom: -h * 0.2, opacity: 0.16, transform: [{ rotate: '-8deg' }] }} contentFit="contain" />
      {/* the light sliding over the lacquer */}
      <View
        pointerEvents="none"
        {...nj(still ? '' : 'sheen')}
        style={[
          { position: 'absolute', inset: 0 } as ViewStyle,
          web({ backgroundImage: 'radial-gradient(55% 75% at var(--sx, 24%) var(--sy, 10%), rgba(255,240,220,.16), rgba(255,240,220,0) 60%), linear-gradient(118deg, rgba(255,255,255,0) 32%, rgba(255,255,255,.075) 44%, rgba(255,255,255,0) 56%)' }),
        ]}
      />
      <View style={{ flex: 1, padding: width * 0.06, justifyContent: 'space-between' }}>
        <Row style={{ justifyContent: 'space-between' }} align="flex-start">
          <Row gap={10}>
            <Image source={BRAND.n} style={{ width: width * 0.12, height: width * 0.108 }} contentFit="contain" />
            <View style={{ gap: 3 }}>
              <Txt v="label" size={Math.max(8, width * 0.026)} ink="chrome" color={C.chrome}>
                Ninja Clan
              </Txt>
              <Txt v="num" size={Math.max(8, width * 0.025)} color={C.muted} raw>
                ANTWERPEN
              </Txt>
            </View>
          </Row>
          <View style={{ alignItems: 'flex-end' }}>
            <Text {...nj('emboss')} style={{ fontFamily: FONT.kanji, fontWeight: '800', fontSize: width * 0.105, lineHeight: width * 0.12, color: '#E9DFD2' }}>
              {rank.kanji}
            </Text>
          </View>
        </Row>
        <View style={{ gap: width * 0.016 }}>
          <Txt v="label" size={Math.max(10, width * 0.042)} ink="chrome" color={C.chrome} raw style={{ letterSpacing: width * 0.008 }}>
            {ME.name.toUpperCase()}
          </Txt>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row gap={8}>
              <Txt v="num" size={Math.max(9, width * 0.032)} color={C.soft} raw style={{ letterSpacing: 1.5 }}>
                {`No. ${ME.number}`}
              </Txt>
              <View style={{ width: 1, height: 10, backgroundColor: C.line2 }} />
              <Txt v="label" size={Math.max(8, width * 0.026)} color={C.amber} raw>
                {rank.name}
              </Txt>
            </Row>
            <Txt v="num" size={Math.max(8, width * 0.027)} color={C.soft} raw>
              {t('{visits} bezoeken · {ki} Ki', { visits: ME.visits, ki: ki(ME.ki + extraKi) })}
            </Txt>
          </Row>
          <Txt v="small" size={Math.max(8, width * 0.027)} color={C.muted}>
            Lid sinds {monthLong(since)} {String(since.getFullYear())}
          </Txt>
        </View>
      </View>
    </View>
  );
  if (!onPress) return face;
  return (
    <Press onPress={onPress} scaleTo={0.985} accessibilityLabel="Ninja Clan">
      {face}
    </Press>
  );
}
