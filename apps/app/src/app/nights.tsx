import { clock, dayLong, emit, eventsOf, monthShort, NINJA, nightsAt, type Night } from '@ninja/shared';
import { useState } from 'react';
import { View } from 'react-native';

import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { useToast } from '../components/Toast';
import { Bar, Button, Card, DemoNote, Photo, Press, Row, tap, Txt } from '../components/ui';
import { tr } from '../i18n';
import { PHOTOS } from '../photos';
import { useApp } from '../state/app';
import { C, fx, isWeb, R } from '../theme';
import { download, icsFile, t } from '../social/util';

function NightCard({ night, going, guests, onRsvp, onCancel }: { night: Night; going: boolean; guests: number; onRsvp: (n: number) => void; onCancel: () => void }) {
  const [n, setN] = useState(2);
  const count = night.going + (going ? guests : 0);
  const full = count >= night.seats;
  const calendar = () => {
    if (!isWeb) return;
    download(icsFile(`${night.title} · Ninja`, night.at, night.until, `${NINJA.street}, ${NINJA.postcode} ${NINJA.city}`, night.line), `ninja-${night.id}.ics`);
  };
  return (
    <Card tone="leather" pad={0} radius={R.xl}>
      <Photo source={PHOTOS[night.photo]} style={{ width: '100%', aspectRatio: 16 / 10 }}>
        <View {...fx('glass-strong')} style={{ position: 'absolute', top: 14, left: 14, width: 58, paddingVertical: 8, borderRadius: 14, alignItems: 'center', backgroundColor: C.glass, borderWidth: 1, borderColor: C.line2 }}>
          <Txt v="stat" size={24} raw>
            {String(night.at.getDate())}
          </Txt>
          <Txt v="label" size={8} color={C.amber} raw>
            {monthShort(night.at).toUpperCase()}
          </Txt>
        </View>
        {night.real ? (
          <View style={{ position: 'absolute', top: 14, right: 14, paddingHorizontal: 10, paddingVertical: 6, borderRadius: R.pill, backgroundColor: C.glass, borderWidth: 1, borderColor: C.line2 }}>
            <Txt v="label" size={7.5} color={C.ok}>
              Eerder bij Ninja
            </Txt>
          </View>
        ) : null}
      </Photo>
      <View style={{ padding: 18, gap: 10 }}>
        <Txt v="title">{night.title}</Txt>
        <Txt v="num" size={11.5} color={C.amber} raw>
          {`${dayLong(night.at)} · ${clock(night.at)}–${clock(night.until)}`}
        </Txt>
        <Txt v="small" color={C.soft}>
          {night.line}
        </Txt>
        {night.real ? (
          <Txt v="small" size={11.5} color={C.muted}>
            {night.real}
          </Txt>
        ) : null}
        <View style={{ gap: 6, marginTop: 2 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt v="label" size={8} color={C.muted}>
              {t('{n} van {seats} plaatsen', { n: Math.min(count, night.seats), seats: night.seats })}
            </Txt>
            <Txt v="label" size={8} color={full ? C.alert : C.muted}>
              {full ? 'Volzet' : t('Nog {n} vrij', { n: night.seats - count })}
            </Txt>
          </Row>
          <Bar value={count / night.seats} />
        </View>
        {going ? (
          <View style={{ gap: 10, marginTop: 4 }}>
            <Row gap={10} style={{ padding: 12, borderRadius: R.md, borderWidth: 1, borderColor: 'rgba(255,181,71,0.45)', backgroundColor: 'rgba(255,181,71,0.06)' }}>
              <Icon name="check" size={16} color={C.amber} stroke={2} />
              <Txt v="small" color={C.ink} style={{ flex: 1 }}>
                {guests === 1 ? tr('Je komt. Je naam staat op de lijst aan de deur.') : t('Je komt, met {n}. Jullie namen staan op de lijst aan de deur.', { n: guests })}
              </Txt>
            </Row>
            <Row gap={10}>
              <Button title="In je agenda" kind="ghost" size="sm" icon="calendar" onPress={calendar} />
              <Button title="Toch niet" kind="ghost" size="sm" onPress={onCancel} />
            </Row>
          </View>
        ) : full ? null : (
          <Row gap={12} style={{ marginTop: 4 }}>
            <Row gap={0} style={{ borderRadius: R.pill, borderWidth: 1, borderColor: C.line2 }}>
              <Press onPress={() => setN((x) => Math.max(1, x - 1))} accessibilityLabel={tr('Minder')} style={{ width: 40, height: 46, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="minus" size={15} color={C.ink} />
              </Press>
              <Txt v="num" size={14} raw style={{ minWidth: 22, textAlign: 'center' }}>
                {String(n)}
              </Txt>
              <Press onPress={() => setN((x) => Math.min(4, x + 1))} accessibilityLabel={tr('Meer')} style={{ width: 40, height: 46, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="plus" size={15} color={C.ink} />
              </Press>
            </Row>
            <Button title="Ik kom" kind="lacquer" icon="ticket" style={{ flex: 1 }} onPress={() => onRsvp(n)} />
          </Row>
        )}
      </View>
    </Card>
  );
}

/** Ninja Nights: the evenings that are more than dinner, with an RSVP that puts her name on the list at the door. */
export default function Nights() {
  const { now, saved, update, bridge } = useApp();
  const toast = useToast();
  const nights = nightsAt(now).sort((a, b) => a.at.getTime() - b.at.getTime());
  const rsvps = eventsOf(bridge, 'rsvp');
  return (
    <Screen back kicker="Ninja Nights" title="Avonden met iets extra" serif="vinyl, rakı, een gastchef" gap={20}>
      {nights.map((night) => {
        const going = saved.rsvps.includes(night.id);
        const guests = rsvps.filter((r) => r.night === night.id).at(-1)?.guests ?? 2;
        return (
          <NightCard
            key={night.id}
            night={night}
            going={going}
            guests={guests}
            onRsvp={(n) => {
              emit({ kind: 'rsvp', night: night.id, guests: n });
              update((s) => ({ rsvps: [...new Set([...s.rsvps, night.id])] }));
              tap('success');
              toast(t('Tot dan: {night}', { night: tr(night.title) }), { text: t('{day} om {time}', { day: dayLong(night.at), time: clock(night.at) }), icon: 'ticket' });
            }}
            onCancel={() => {
              emit({ kind: 'rsvp', night: night.id, guests: 0 });
              update((s) => ({ rsvps: s.rsvps.filter((x) => x !== night.id) }));
            }}
          />
        );
      })}
      <DemoNote text="Ninja Nights zijn een voorstel. Het iftarmenu met soep van het huis had Ninja eerder echt." />
    </Screen>
  );
}
