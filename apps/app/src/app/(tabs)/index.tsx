import {
  CLOSES,
  dateLong,
  dayLong,
  dropsAt,
  dropState,
  EARLY,
  isOpenAt,
  matchTonight,
  ME,
  nextOpening,
  nightsAt,
  nowPlaying,
  OPENS,
  rankInfo,
  relativeDay,
  SEATS,
  tableById,
  waitForecast,
  wallClock,
} from '@ninja/shared';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../../components/Icon';
import { Countdown, FireCard, Ticker, useWait } from '../../components/live';
import { Backdrop } from '../../components/Screen';
import { Bar, Button, Card, Kicker, LiveDot, Photo, PopIn, Press, Row, Seal, SectionHead, Serial, Txt } from '../../components/ui';
import { tr } from '../../i18n';
import { BRAND, PEOPLE, PHOTOS } from '../../photos';
import { useApp, useTick } from '../../state/app';
import { C, fx, MAX_WIDTH, PAD, R } from '../../theme';

const hm = (minute: number) => `${String(Math.floor(minute / 60) % 24).padStart(2, '0')}:${String(Math.floor(minute % 60)).padStart(2, '0')}`;

/** Where she stands tonight: on her way, in the line, called in, or at her table. */
function Evening() {
  const { line, table, orders, passports } = useApp();
  const { wait, guests } = useWait(2);
  if (table) {
    const t = tableById(table);
    const mine = passports.filter((p) => p.table === table);
    return (
      <Card tone="oxblood" pad={20}>
        <Row style={{ justifyContent: 'space-between' }} align="flex-start">
          <View style={{ gap: 6, flex: 1 }}>
            <Kicker color={C.flame}>Je zit aan tafel</Kicker>
            <Txt v="display">{t?.label ?? table}</Txt>
            <Txt v="small" color={C.soft}>
              {orders.length ? tr('{n} bestellingen · {p} paspoorten').replace('{n}', String(orders.length)).replace('{p}', String(mine.length)) : tr('Scan, bestel en betaal vanaf je telefoon.')}
            </Txt>
          </View>
          <Icon name="table" size={26} color={C.flame} />
        </Row>
        <Row gap={10} style={{ marginTop: 18 }}>
          <Button title="Aan tafel" icon="table" kind="bone" size="sm" onPress={() => router.push('/tafel')} />
          <Button title="Menu" icon="menu" kind="ghost" size="sm" onPress={() => router.push('/menu')} />
        </Row>
      </Card>
    );
  }
  if (line) {
    const called = line.call;
    return (
      <Card tone={called ? 'ember' : 'oxblood'} pad={20}>
        <View style={{ gap: 6 }}>
          <Kicker color={called ? '#1A0A04' : C.flame}>{called ? 'Je tafel is klaar' : 'Je staat in de rij'}</Kicker>
          <Txt v="display" color={called ? '#1A0A04' : C.ink}>
            {called ? tableById(called.table)?.label ?? called.table : tr('Nog ± {n} min').replace('{n}', String(Math.max(5, wait)))}
          </Txt>
          <Txt v="small" color={called ? '#3A1606' : C.soft}>
            {called ? tr('Noor houdt hem vrij. Meld je aan de deur.') : tr('Ga gerust iets drinken aan de kaai: we sturen een bericht als je tafel vrijkomt.')}
          </Txt>
        </View>
        <Row gap={10} style={{ marginTop: 18 }}>
          <Button title={called ? 'Ik ben er' : 'Bekijk de rij'} icon="line" kind={called ? 'lacquer' : 'bone'} size="sm" onPress={() => router.push('/rij')} />
          {!called ? <Button title="Bestel alvast" icon="menu" kind="ghost" size="sm" onPress={() => router.push('/menu')} /> : null}
        </Row>
      </Card>
    );
  }
  return (
    <Card pad={20}>
      <Row style={{ justifyContent: 'space-between' }} align="flex-start">
        <View style={{ gap: 6, flex: 1 }}>
          <Kicker>Geen reservaties, wel een rij</Kicker>
          <Txt v="title">{wait > 0 ? tr('Nu ± {n} min wachten').replace('{n}', String(wait)) : guests.linePeople ? tr('Voor twee is er nu plaats') : tr('Er is nu plaats')}</Txt>
          <Txt v="small" color={C.soft}>
            {(wait === 0 && guests.linePeople ? tr('{n} mensen wachten op een grotere tafel') : tr('{n} mensen in de rij')).replace('{n}', String(guests.linePeople))}
            {' · '}
            {tr('{s} van {all} plaatsen bezet').replace('{s}', String(guests.seated)).replace('{all}', String(SEATS))}
          </Txt>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Txt v="stat" size={34} color={wait > 20 ? C.amber : C.ink} raw>
            {String(wait)}
          </Txt>
          <Txt v="label" size={7.5} color={C.muted}>
            min
          </Txt>
        </View>
      </Row>
      <Bar value={guests.seated / SEATS} style={{ marginTop: 16 }} />
      <View style={{ marginTop: 18, gap: 10 }}>
        <Button title="Schuif digitaal aan" icon="line" full onPress={() => router.push('/rij')} />
        <Button title="Al binnen? Scan je tafel" icon="qr" kind="ghost" size="sm" full onPress={() => router.push('/tafel?scan=1')} />
      </View>
    </Card>
  );
}

function RoomNow() {
  const { ev, minute } = useTick(15000);
  const { steps, calm } = waitForecast(ev, minute);
  const max = Math.max(15, ...steps.map((s) => s.wait));
  return (
    <Card pad={18}>
      <SectionHead kicker="Drukte" title="De rest van de avond" serif={calm ? tr('Het rustigst rond {t}').replace('{t}', hm(calm.minute)) : undefined} />
      <Row gap={4} align="flex-end" style={{ height: 70 }}>
        {steps.map((s) => (
          <View key={s.minute} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <View
              {...fx(calm && s.minute === calm.minute ? '' : 'ember-btn')}
              style={{ width: '70%', height: Math.max(3, (s.wait / max) * 56), borderRadius: 3, backgroundColor: calm && s.minute === calm.minute ? C.ok : C.ember, opacity: 0.35 + 0.65 * s.occupancy }}
            />
          </View>
        ))}
      </Row>
      <Row style={{ justifyContent: 'space-between', marginTop: 8 }}>
        <Txt v="num" size={9.5} color={C.muted} raw>
          {steps[0] ? hm(steps[0].minute) : ''}
        </Txt>
        <Txt v="num" size={9.5} color={C.muted} raw>
          {steps.length ? hm(steps[steps.length - 1].minute) : ''}
        </Txt>
      </Row>
    </Card>
  );
}

function LastPassport() {
  const { passports } = useApp();
  const p = passports.at(-1);
  if (!p)
    return (
      <Card tone="travertine" pad={20} onPress={() => router.push('/paspoorten')} label={tr('Het bordpaspoort')}>
        <Row gap={16} align="flex-start">
          <Seal size={48} />
          <View style={{ flex: 1, gap: 6 }}>
            <Txt v="label" size={9} color="#7B151A">
              Het bordpaspoort
            </Txt>
            <Txt v="title" color={C.black}>
              Elk bord van de spies krijgt een nummer
            </Txt>
            <Txt v="small" color="#4A3B31">
              De seconde van de snede, de temperatuur in het vlees, wie sneed, en waar elk ingrediënt vandaan komt.
            </Txt>
          </View>
        </Row>
      </Card>
    );
  return (
    <Card tone="travertine" pad={20} onPress={() => router.push(`/paspoort/${p.no}`)} label={tr('Je laatste paspoort')}>
      <Row gap={16} align="flex-start">
        <Seal size={48} />
        <View style={{ flex: 1, gap: 6 }}>
          <Serial no={p.no} color="#7B151A" size={11} />
          <Txt v="title" color={C.black} raw>
            {p.dishName}
          </Txt>
          <Txt v="small" color="#4A3B31">
            {tr('Gesneden op {c} · {s} s tot aan je tafel').replace('{c}', `${p.core.toFixed(1).replace('.', ',')} °C`).replace('{s}', String(p.secondsToTable))}
          </Txt>
        </View>
      </Row>
    </Card>
  );
}

function Drops() {
  useTick(1000);
  const now = wallClock();
  const drops = dropsAt(now);
  return (
    <View>
      <View style={{ paddingHorizontal: PAD }}>
        <SectionHead kicker="Drops" title="Eén keer, dan weg" action="Alle drops" onAction={() => router.push('/drops')} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: PAD, gap: 12 }}>
        {drops.map((d) => {
          const state = dropState(d, now, EARLY[ME.rank]);
          return (
            <Press key={d.id} onPress={() => router.push('/drops')} accessibilityLabel={d.name} style={{ width: 220 }}>
              <Photo source={d.photo === 'logo-n' ? BRAND.n : PHOTOS[d.photo]} radius={R.lg} style={{ height: 250, borderWidth: 1, borderColor: C.line2 }}>
                <View style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(180deg,rgba(11,8,7,.1) 30%,rgba(11,8,7,.92))' } as never} />
                <View style={{ position: 'absolute', top: 12, left: 12 }}>
                  <View style={{ paddingHorizontal: 9, height: 24, borderRadius: 12, justifyContent: 'center', backgroundColor: state === 'live' ? C.ember : state === 'vroeg' ? C.ink : 'rgba(11,8,7,0.6)', borderWidth: 1, borderColor: C.line2 }}>
                    <Txt v="label" size={8} color={state === 'live' || state === 'vroeg' ? C.black : C.ink}>
                      {state === 'live' ? 'Nu live' : state === 'vroeg' ? 'Jōnin: nu al' : state === 'uitverkocht' ? 'Uitverkocht' : 'Binnenkort'}
                    </Txt>
                  </View>
                </View>
                <View style={{ position: 'absolute', left: 14, right: 14, bottom: 14, gap: 6 }}>
                  <Txt v="h2" raw>
                    {d.name}
                  </Txt>
                  {state === 'binnenkort' ? (
                    <Countdown to={d.opens} size={12} color={C.amber} />
                  ) : (
                    <Txt v="num" size={11} color={C.soft} raw>
                      {tr('nog {n} van {all}').replace('{n}', String(d.left)).replace('{all}', String(d.stock))}
                    </Txt>
                  )}
                </View>
              </Photo>
            </Press>
          );
        })}
      </ScrollView>
    </View>
  );
}

function MatchTeaser() {
  const { ev, minute } = useTick(30000);
  const people = matchTonight(ev, minute);
  return (
    <Card tone="leather" pad={18} onPress={() => router.push('/match')} label={tr('Ninja Match')}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ gap: 6, flex: 1 }}>
          <Kicker color={C.amber}>Ninja Match</Kicker>
          <Txt v="title">{tr('{n} mensen hebben Match aan').replace('{n}', String(people.length))}</Txt>
          <Txt v="small" color={C.soft}>
            Alleen wie hier is, alleen tot sluitingstijd.
          </Txt>
        </View>
      </Row>
      <Row gap={-10} style={{ marginTop: 16 }}>
        {people.slice(0, 6).map((p, i) => (
          <View key={p.persona.id} style={{ width: 42, height: 42, borderRadius: 21, overflow: 'hidden', borderWidth: 2, borderColor: C.panel, marginLeft: i ? -10 : 0, backgroundColor: C.panel3 }}>
            {PEOPLE[p.persona.photo] ? <Image source={PEOPLE[p.persona.photo]} style={{ width: '100%', height: '100%', filter: 'blur(2px)' } as never} contentFit="cover" /> : null}
          </View>
        ))}
      </Row>
    </Card>
  );
}

function NowPlaying() {
  useTick(1000);
  const { track, at } = nowPlaying(new Date());
  return (
    <Press onPress={() => router.push('/muziek')} accessibilityLabel={tr('Nu op de speakers')}>
      <Row gap={14} style={{ paddingVertical: 14, paddingHorizontal: 16, borderRadius: R.lg, borderWidth: 1, borderColor: C.line }}>
        <View {...fx('spin-slow')} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#140F0D', borderWidth: 1, borderColor: C.line2, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: C.oxblood2 }} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Txt v="label" size={8} color={C.muted}>
            Nu op de speakers
          </Txt>
          <Txt v="h3" numberOfLines={1} raw>
            {`${track.artist} — ${track.title}`}
          </Txt>
          <Bar value={at / track.seconds} height={2} color={C.soft} style={{ marginTop: 4 }} />
        </View>
        <Icon name="music" size={18} color={C.soft} />
      </Row>
    </Press>
  );
}

function Shortcuts() {
  const items = [
    { icon: 'spit' as const, title: 'Eigen Spies', sub: 'Je naam in messing', to: '/eigen-spies' },
    { icon: 'calendar' as const, title: 'Ninja Nights', sub: nightsAt(wallClock())[0]?.title ?? '', to: '/nights' },
    { icon: 'sparkle' as const, title: 'Sensei', sub: 'Vraag het de gastheer', to: '/sensei' },
    { icon: 'gift' as const, title: 'Ninja Gift', sub: 'Trakteer iemand', to: '/gift' },
  ];
  return (
    <Row gap={12} wrap>
      {items.map((it) => (
        <Card key={it.title} pad={16} style={{ width: '47.8%' as never }} onPress={() => router.push(it.to as never)} label={tr(it.title)}>
          <Icon name={it.icon} size={22} color={C.amber} />
          <Txt v="h3" style={{ marginTop: 14 }}>
            {it.title}
          </Txt>
          <Txt v="small" size={12} color={C.muted} numberOfLines={1} raw={it.title === 'Ninja Nights'}>
            {it.title === 'Ninja Nights' ? tr(it.sub) : it.sub}
          </Txt>
        </Card>
      ))}
    </Row>
  );
}

export default function Tonight() {
  const insets = useSafeAreaInsets();
  const { clock, now, ev } = useApp();
  const real = wallClock();
  const open = isOpenAt(real);
  const rank = rankInfo(ME.rank);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Backdrop />
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' }}>
          <Row style={{ paddingTop: insets.top + 12, paddingHorizontal: PAD, justifyContent: 'space-between' }}>
            <Image source={BRAND.logo} style={{ width: 104, height: 42 }} contentFit="contain" accessibilityLabel="Ninja" />
            <Press onPress={() => router.push('/clan')} accessibilityLabel={tr('Clan')}>
              <Row gap={8} style={{ height: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: C.line2 }}>
                <Txt style={{ fontFamily: 'Shippori Mincho B1', fontWeight: '800', fontSize: 15, color: C.flame }} raw>
                  {rank.kanji}
                </Txt>
                <Txt v="label" size={8.5} color={C.ink} raw>
                  {`${ME.first} · ${rank.name}`}
                </Txt>
              </Row>
            </Press>
          </Row>

          <View style={{ paddingHorizontal: PAD, paddingTop: 26, gap: 8 }}>
            <Row gap={8}>
              <LiveDot off={!open && !clock.demo} />
              <Txt v="label" size={9} color={open ? C.amber : C.soft}>
                {open ? tr('Open tot {t}').replace('{t}', hm(CLOSES)) : clock.demo ? tr('Gesloten · herhaling van {d}').replace('{d}', dayLong(clock.now)) : tr('Gesloten')}
              </Txt>
            </Row>
            <Txt v="mega" size={46}>
              Vanavond
            </Txt>
            <Txt v="serif" size={22} color={C.soft}>
              {open
                ? tr('het vuur brandt sinds {t}').replace('{t}', hm(ev.spits[0].onFire))
                : tr('we openen {d} om {t}').replace('{d}', relativeDay(nextOpening(real), real) === 'vandaag' ? tr('vandaag') : relativeDay(nextOpening(real), real) === 'morgen' ? tr('morgen') : dateLong(nextOpening(real))).replace('{t}', hm(OPENS))}
            </Txt>
          </View>

          <View style={{ marginTop: 22 }}>
            <Ticker />
          </View>

          <View style={{ paddingHorizontal: PAD, paddingTop: 22, gap: 18 }}>
            <PopIn>
              <FireCard />
            </PopIn>
            <PopIn delay={80}>
              <Evening />
            </PopIn>
            <PopIn delay={140}>
              <LastPassport />
            </PopIn>
          </View>

          <View style={{ marginTop: 30 }}>
            <Drops />
          </View>

          <View style={{ paddingHorizontal: PAD, paddingTop: 30, gap: 18 }}>
            <MatchTeaser />
            <RoomNow />
            <NowPlaying />
            <Shortcuts />
            <Card tone="flat" pad={18} onPress={() => router.push('/route')} label={tr('Zo kom je er')}>
              <Row gap={14}>
                <Icon name="pin" size={22} color={C.soft} />
                <View style={{ flex: 1, gap: 3 }}>
                  <Txt v="h3">Vlaamsekaai 52, Antwerpen</Txt>
                  <Txt v="small" color={C.muted}>
                    Parking Steendok en Kooldok · tram tot het museum
                  </Txt>
                </View>
                <Icon name="chevron" size={16} color={C.muted} />
              </Row>
            </Card>
            <View style={{ alignItems: 'center', gap: 6, paddingTop: 16 }}>
              <Txt v="label" size={8.5} color={C.faint}>
                Ninja · Authentic Kebab & Grill in Antwerp
              </Txt>
              <Txt v="num" size={9.5} color={C.faint} raw>
                {`${hm(now.getHours() * 60 + now.getMinutes())} · Antwerpen`}
              </Txt>
            </View>
          </View>
          <View style={{ height: 150 + insets.bottom }} />
        </View>
      </ScrollView>
    </View>
  );
}
