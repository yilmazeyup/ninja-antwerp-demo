import { clock, dayShort, dropsAt, dropState, EARLY, emit, euro, eventsOf, hash, ME, rankInfo, type Drop, type DropState } from '@ninja/shared';
import { Image } from 'expo-image';
import { View } from 'react-native';

import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { useToast } from '../components/Toast';
import { Bar, Button, Card, DemoNote, LiveDot, Photo, Row, Seal, tap, Txt } from '../components/ui';
import { tr } from '../i18n';
import { BRAND, PHOTOS } from '../photos';
import { useApp, useTick } from '../state/app';
import { C, fx, R } from '../theme';
import { countdownLong, t } from '../social/util';

const STATE: Record<DropState, { label: string; color: string }> = {
  binnenkort: { label: 'Binnenkort', color: C.soft },
  vroeg: { label: 'Vroege toegang', color: C.amber },
  live: { label: 'Nu open', color: C.ember },
  uitverkocht: { label: 'Uitverkocht', color: C.muted },
};

function DropCard({ drop, now, early, claimed, onClaim, serial }: { drop: Drop; now: Date; early: number; claimed: boolean; onClaim: () => void; serial: number }) {
  const state = dropState(drop, now, early);
  const forMe = new Date(drop.opens.getTime() - early * 60000);
  const sold = drop.stock - drop.left;
  const s = STATE[state];
  const photo = drop.photo === 'logo-n' ? undefined : PHOTOS[drop.photo];
  return (
    <Card tone="leather" pad={0} radius={R.xl}>
      <View>
        {photo ? (
          <Photo source={photo} style={{ width: '100%', aspectRatio: 16 / 10 }} />
        ) : (
          <View {...fx('oxblood')} style={{ width: '100%', aspectRatio: 16 / 10, alignItems: 'center', justifyContent: 'center', backgroundColor: C.oxblood }}>
            <Image source={BRAND.n} style={{ width: 150, height: 136 }} contentFit="contain" />
          </View>
        )}
        <Row gap={7} style={{ position: 'absolute', top: 14, left: 14, paddingHorizontal: 11, paddingVertical: 6, borderRadius: R.pill, backgroundColor: C.glass, borderWidth: 1, borderColor: C.line2 }}>
          {state === 'live' || state === 'vroeg' ? <LiveDot size={6} color={s.color} /> : null}
          <Txt v="label" size={8.5} color={s.color}>
            {s.label}
          </Txt>
        </Row>
        <View style={{ position: 'absolute', top: 14, right: 14, paddingHorizontal: 10, paddingVertical: 6, borderRadius: R.pill, backgroundColor: C.glass, borderWidth: 1, borderColor: C.line2 }}>
          <Txt v="label" size={8} color={C.soft}>
            {drop.kind === 'merch' ? 'Merch' : 'Gerecht'}
          </Txt>
        </View>
      </View>
      <View style={{ padding: 18, gap: 12 }}>
        <Row style={{ justifyContent: 'space-between' }} align="flex-start">
          <Txt v="title" style={{ flex: 1 }} raw={drop.kind === 'merch'}>
            {drop.name}
          </Txt>
          <Txt v="stat" size={22} raw>
            {euro(drop.price)}
          </Txt>
        </Row>
        <Txt v="small" color={C.soft}>
          {drop.line}
        </Txt>
        {drop.real ? (
          <Row gap={6}>
            <Icon name="check" size={13} color={C.ok} />
            <Txt v="small" size={11.5} color={C.ok}>
              {drop.real}
            </Txt>
          </Row>
        ) : null}
        <View style={{ gap: 6 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt v="label" size={8} color={C.muted}>
              {state === 'uitverkocht' ? 'Allemaal weg' : state === 'binnenkort' ? (drop.kind === 'merch' ? t('{stock} stuks, genummerd', { stock: drop.stock }) : t('{stock} porties', { stock: drop.stock })) : t('Nog {left} van {stock}', { left: drop.left, stock: drop.stock })}
            </Txt>
            {sold > 0 ? <Txt v="num" size={10} color={C.muted} raw>{t('{n} weg', { n: sold })}</Txt> : null}
          </Row>
          <Bar value={drop.left / drop.stock} color={state === 'uitverkocht' ? C.faint : undefined} />
        </View>
        {state === 'binnenkort' ? (
          <View style={{ gap: 4, paddingVertical: 4 }}>
            <Txt v="label" size={8} color={C.amber}>
              Voor jou open over
            </Txt>
            <Txt v="stat" size={30} raw>
              {countdownLong(forMe.getTime() - now.getTime())}
            </Txt>
            <Txt v="small" size={11.5} color={C.muted}>
              {early ? t('Voor iedereen: {day} om {time}. Jij een uur eerder.', { day: dayShort(drop.opens), time: clock(drop.opens) }) : t('Voor iedereen: {day} om {time}.', { day: dayShort(drop.opens), time: clock(drop.opens) })}
            </Txt>
          </View>
        ) : null}
        {state === 'vroeg' ? (
          <Txt v="small" color={C.amber}>
            {t('Alleen voor Jōnin en Kage. Voor iedereen over {time}.', { time: countdownLong(drop.opens.getTime() - now.getTime()) })}
          </Txt>
        ) : null}
        {claimed ? (
          <Row gap={12} style={{ padding: 14, borderRadius: R.md, borderWidth: 1, borderColor: 'rgba(255,181,71,0.45)', backgroundColor: 'rgba(255,181,71,0.06)' }}>
            <Seal size={36} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt v="h3">Van jou</Txt>
              <Txt v="small" size={12} color={C.soft}>
                {drop.kind === 'merch' ? t('Nummer {n} van {stock}. Ophalen aan de toog.', { n: serial, stock: drop.stock }) : t('Nummer {n} van {stock}. Voor je volgende bezoek.', { n: serial, stock: drop.stock })}
              </Txt>
            </View>
          </Row>
        ) : state === 'live' || state === 'vroeg' ? (
          <Button title="Claim" sub={euro(drop.price)} kind={state === 'vroeg' ? 'ember' : 'lacquer'} size="lg" full icon="drop2" onPress={onClaim} />
        ) : state === 'uitverkocht' ? (
          <Txt v="small" color={C.muted}>
            Volgende keer sneller: Jōnin zien elke drop een uur eerder.
          </Txt>
        ) : null}
      </View>
    </Card>
  );
}

/**
 * Drops: things Ninja makes once (a wagyu spit, a T-shirt, a leather N), with a live countdown and the stock going
 * down. Her rank opens them early: Jōnin see everything an hour before anyone else.
 */
export default function Drops() {
  const { saved, update, bridge } = useApp();
  const { clock: c } = useTick(1000);
  const toast = useToast();
  const now = c.now;
  const early = EARLY[ME.rank] ?? 0;
  const rank = rankInfo(ME.rank);
  const drops = dropsAt(now);
  const claims = eventsOf(bridge, 'drop-claim');

  const claim = (d: Drop) => {
    emit({ kind: 'drop-claim', drop: d.id, qty: 1 });
    update((s) => ({ claimed: [...new Set([...s.claimed, d.id])] }));
    tap('success');
    toast(t('{name} is van jou', { name: d.name }), { text: d.kind === 'merch' ? tr('Ophalen aan de toog, met je Clan-kaart.') : tr('Klaar bij je volgende bezoek.'), icon: 'drop2' });
  };

  return (
    <Screen back kicker="Drops" title="Eén keer, en dan op" serif="Jōnin zien alles een uur eerder" gap={20}>
      <Row gap={14} style={{ padding: 14, borderRadius: R.lg, borderWidth: 1, borderColor: C.line2 }}>
        <Seal size={44} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt v="h3">{t('{rank} · vroege toegang', { rank: rank.name })}</Txt>
          <Txt v="small" color={C.muted}>
            {early >= 60 ? tr('Je ziet elke drop een uur voor de rest.') : early ? t('Je ziet elke drop {n} minuten voor de rest.', { n: early }) : tr('Vanaf Chūnin zie je drops eerder.')}
          </Txt>
        </View>
      </Row>
      {drops.map((d) => {
        const mine = saved.claimed.includes(d.id);
        // Her number in the series: fixed once she has it.
        const serial = 1 + (hash(`${d.id}-${ME.number}-${claims.find((x) => x.drop === d.id)?.at ?? 0}`) % Math.min(d.stock, 60));
        return <DropCard key={d.id} drop={d} now={now} early={early} claimed={mine} onClaim={() => claim(d)} serial={serial} />;
      })}
      <DemoNote text="Drops zijn een voorstel voor Ninja: de producten, aantallen en prijzen zijn voorbeelden." />
    </Screen>
  );
}
