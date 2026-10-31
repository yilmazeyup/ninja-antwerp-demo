import { clock, dayShort, isOpenAt, NINJA, nextOpening, PARKING, relativeDay, wallClock } from '@ninja/shared';
import { View } from 'react-native';

import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { Button, Card, DemoNote, Kicker, LiveDot, Row, Txt } from '../components/ui';
import { tr } from '../i18n';
import { useTick } from '../state/app';
import { C, R } from '../theme';
import { openLink, t } from '../social/util';
import { ZUID } from '../social/zuid';
import { ZuidMap } from '../social/ZuidMap';

/** Minutes on foot for a point on the map (metres from the door), at a city pace with a crossing or two. */
const walk = ([x, y]: readonly number[]) => Math.max(1, Math.round((Math.hypot(x, y) * 1.25) / 80));

const HOURS = [
  { day: 'Maandag', hours: 'Gesloten' },
  { day: 'Dinsdag tot zondag', hours: '15:00 – 22:00' },
];

const mapsSearch = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

/** How to get there: the Zuid drawn around Vlaamsekaai 52, the two car parks and the museum, and the buttons that act. */
export default function Route() {
  useTick(30000);
  const wall = wallClock();
  const open = isOpenAt(wall);
  const next = nextOpening(wall);
  const minutes = { steendok: walk(ZUID.steendok), kooldok: walk(ZUID.kooldok), museum: walk(ZUID.museum) };
  return (
    <Screen back kicker="Route" title={NINJA.street} serif="aan de kaai, in het Zuid" gap={18}>
      <ZuidMap minutes={minutes} />
      <Row gap={10}>
        <Button title="Route" kind="lacquer" icon="route" style={{ flex: 1 }} onPress={() => openLink(NINJA.maps)} />
        <Button title="Bel" kind="ghost" icon="phone" style={{ flex: 1 }} onPress={() => openLink(NINJA.phoneHref)} />
      </Row>
      <Card tone="leather" pad={18}>
        <View style={{ gap: 10 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Kicker>Ninja Antwerp</Kicker>
            <Row gap={7}>
              <LiveDot off={!open} size={6} />
              <Txt v="label" size={8.5} color={open ? C.ember : C.muted}>
                {open ? 'Nu open' : 'Nu gesloten'}
              </Txt>
            </Row>
          </Row>
          <Txt v="title" raw>{`${NINJA.street}, ${NINJA.postcode} ${NINJA.city}`}</Txt>
          <Txt v="small" color={C.muted}>
            {open
              ? tr('Tot 22:00. Reserveren kan niet: kom langs, of schuif digitaal in de rij.')
              : ['vandaag', 'morgen'].includes(relativeDay(next, wall))
                ? t('We gaan {day} om {time} weer open.', { day: tr(relativeDay(next, wall)), time: clock(next) })
                : t('We gaan weer open op {day} om {time}.', { day: dayShort(next), time: clock(next) })}
          </Txt>
          <View style={{ gap: 6, marginTop: 4 }}>
            {HOURS.map((h) => (
              <Row key={h.day} style={{ justifyContent: 'space-between' }}>
                <Txt v="small" color={C.soft}>
                  {h.day}
                </Txt>
                <Txt v="num" size={12} color={C.soft}>
                  {h.hours}
                </Txt>
              </Row>
            ))}
          </View>
        </View>
      </Card>
      <View style={{ gap: 10 }}>
        <Kicker>Parkeren</Kicker>
        {PARKING.map((p) => {
          const m = p.name.includes('Steendok') ? minutes.steendok : minutes.kooldok;
          return (
            <Row key={p.name} gap={14} style={{ padding: 14, borderRadius: R.md, borderWidth: 1, borderColor: C.line2 }}>
              <View style={{ width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line2 }}>
                <Icon name="parking" size={20} color={C.chrome} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt v="h3" raw>
                  {p.name}
                </Txt>
                <Txt v="small" size={12} color={C.muted}>
                  {t('{address} · {n} min te voet', { address: p.address, n: m })}
                </Txt>
              </View>
              <Button title="Route" kind="ghost" size="sm" onPress={() => openLink(mapsSearch(`${p.name}, ${p.address}, Antwerpen`))} />
            </Row>
          );
        })}
      </View>
      <Row gap={14} style={{ padding: 14, borderRadius: R.md, borderWidth: 1, borderColor: C.line }}>
        <Icon name="museum" size={20} color={C.soft} />
        <Txt v="small" color={C.soft} style={{ flex: 1 }}>
          {t('Het KMSKA ligt om de hoek: {n} minuten te voet.', { n: minutes.museum })}
        </Txt>
      </Row>
      <DemoNote text="De kaart is getekend uit OpenStreetMap. Parkings en uren komen van Ninja’s eigen site." />
    </Screen>
  );
}
