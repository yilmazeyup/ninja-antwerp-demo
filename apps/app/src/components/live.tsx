import {
  celsius,
  formatNo,
  guestsAt,
  spitAt,
  STATUS_LABEL,
  waitFor,
  wallClock,
  type SpitId,
} from '@ninja/shared';
import { router } from 'expo-router';
import { View } from 'react-native';

import { tr } from '../i18n';
import { PHOTOS } from '../photos';
import { useTick } from '../state/app';
import { C, fx, R } from '../theme';
import { Icon } from './Icon';
import { LiveDot, Num, Photo, Press, Row, Txt } from './ui';

/** One spit's sensors, read once a second from Ninja's clock. */
export function useSpit(spit: SpitId = 'rund', ms = 1000) {
  const t = useTick(ms);
  return { ...t, reading: spitAt(t.ev, spit, t.minute) };
}

/** "14 s", "3 min 20 s" */
export function sinceText(seconds: number): string {
  if (seconds < 60) return tr('{n} s geleden').replace('{n}', String(seconds));
  const m = Math.floor(seconds / 60);
  return m < 60 ? tr('{n} min geleden').replace('{n}', String(m)) : tr('meer dan een uur geleden');
}

/**
 * The live band under the header: the spit's readings running past like a stock ticker, the way a trader watches a
 * market. Everything in it is measured (in the demo: worked out) this very second.
 */
export function Ticker() {
  const { reading: r, ev, minute } = useSpit('rund');
  const kip = spitAt(ev, 'kip', minute);
  const g = guestsAt(ev, minute);
  const plates = ev.firstNo + ev.plates.filter((p) => p.carved <= minute).length;
  const items = [
    `${tr('Spies 1')} ${celsius(r.core)}`,
    `${tr('Korst')} ${celsius(r.crust, 0)}`,
    `${tr('Eikenvuur')} ${r.fire} °C`,
    `${tr('Laatste snede')} ${sinceText(r.lastCut)}`,
    `${tr('Spies 2 · kip')} ${celsius(kip.core)}`,
    `${tr('Nog {kg} kg aan de spies').replace('{kg}', r.kg.toFixed(1).replace('.', ','))}`,
    `${tr('{n} binnen').replace('{n}', String(g.seated))} · ${tr('{n} in de rij').replace('{n}', String(g.linePeople))}`,
    `${tr('Bord No. {no}').replace('{no}', formatNo(plates))}`,
  ];
  const line = items.join('     ·     ');
  return (
    <View style={{ height: 34, overflow: 'hidden', borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.line, justifyContent: 'center' }}>
      <View {...fx('marquee')} style={{ flexDirection: 'row', width: '200%' as never }}>
        {[0, 1].map((k) => (
          <View key={k} style={{ width: '50%' as never, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10 }}>
            <LiveDot size={6} />
            <Txt v="num" size={10.5} color={C.soft} numberOfLines={1} style={{ letterSpacing: 1.2, textTransform: 'uppercase' }} raw>
              {line}
            </Txt>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * The fire, live: Ninja's own photo of the spit master at the spit, the core temperature of the next slice in big
 * thin numbers, the crust, the fire and the last cut. Tap for the full live spit.
 */
export function FireCard() {
  const { reading: r, clock } = useSpit('rund');
  return (
    <Press onPress={() => router.push('/spies')} accessibilityLabel={tr('Live spies')} scaleTo={0.985}>
      <Photo source={PHOTOS['room-chef']} radius={R.xl} position={{ top: '35%', left: '50%' }} style={{ height: 420, borderWidth: 1, borderColor: C.line2 }}>
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '72%', backgroundColor: 'transparent', backgroundImage: 'linear-gradient(180deg,rgba(11,8,7,0) 0%,rgba(11,8,7,.7) 50%,rgba(11,8,7,.94) 100%)' } as never}
        />
        <View style={{ position: 'absolute', top: 18, left: 18, right: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Row gap={8} style={{ paddingHorizontal: 11, height: 28, borderRadius: 14, backgroundColor: 'rgba(11,8,7,0.55)', borderWidth: 1, borderColor: C.line2 }}>
            <LiveDot size={6} />
            <Txt v="label" size={8.5} color={C.ink}>
              {clock.demo ? 'Herhaling' : 'Live'}
            </Txt>
          </Row>
          <Txt v="label" size={8.5} color={C.soft}>
            Spies 1 · rund, kalf, lam
          </Txt>
        </View>
        <View style={{ position: 'absolute', left: 20, right: 20, bottom: 20, gap: 14 }}>
          <View style={{ gap: 2 }}>
            <Txt v="label" size={9} color={C.amber}>
              In de volgende snede
            </Txt>
            <Num value={r.core} digits={1} v="data" size={84} color={C.bone} unit="°C" unitColor={C.soft} />
            <Txt v="serif" size={19} color={C.soft}>
              {STATUS_LABEL[r.status]}
            </Txt>
          </View>
          <View style={{ height: 1, backgroundColor: C.line2 }} {...fx('chrome')} />
          <Row gap={0} style={{ justifyContent: 'space-between' }}>
            <Mini label="Korst" value={`${Math.round(r.crust)}`} unit="°C" />
            <Mini label="Eikenvuur" value={`${r.fire}`} unit="°C" />
            <Mini label="Gesneden" value={r.lastCut < 60 ? `${r.lastCut}` : `${Math.floor(r.lastCut / 60)}`} unit={r.lastCut < 60 ? 's' : 'min'} />
            <Mini label="Aan de spies" value={r.kg.toFixed(1).replace('.', ',')} unit="kg" />
          </Row>
        </View>
      </Photo>
    </Press>
  );
}

function Mini({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={{ gap: 4, flex: 1 }}>
      <Txt v="label" size={7.5} color={C.muted} narrow numberOfLines={1} style={{ letterSpacing: 1.1 }}>
        {label}
      </Txt>
      <Row gap={2} align="flex-end">
        <Txt v="stat" size={20} color={C.ink} raw>
          {value}
        </Txt>
        <Txt v="num" size={9} color={C.muted} style={{ marginBottom: 3 }} raw>
          {unit}
        </Txt>
      </Row>
    </View>
  );
}

/** The wait now, as the line reads it. */
export function useWait(size = 2) {
  const t = useTick(5000);
  return { ...t, wait: waitFor(t.ev, t.minute, size), guests: guestsAt(t.ev, t.minute) };
}

/** A countdown to a moment, ticking every second: "02:14:09", or days when far. */
export function Countdown({ to, size = 13, color = C.ink }: { to: Date; size?: number; color?: string }) {
  useTick(1000);
  // Drops and nights run on the real calendar, not on the replayed evening.
  const left = Math.max(0, to.getTime() - wallClock().getTime());
  const s = Math.floor(left / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  const text = d > 0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(h)}:${pad(m)}:${pad(sec)}`;
  return (
    <Txt v="num" size={size} color={color} raw>
      {text}
    </Txt>
  );
}

/** A small round fire icon in an oxblood well, for list rows. */
export function FireDot({ size = 38 }: { size?: number }) {
  return (
    <View {...fx('oxblood')} style={{ width: size, height: size, borderRadius: size * 0.32, alignItems: 'center', justifyContent: 'center', backgroundColor: C.oxblood, borderWidth: 1, borderColor: C.line2 }}>
      <Icon name="fire" size={size * 0.48} color={C.flame} />
    </View>
  );
}
