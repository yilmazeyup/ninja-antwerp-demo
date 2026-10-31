import {
  addDays,
  atMinute,
  clock,
  dateKey,
  dayLong,
  dayShort,
  decimal,
  emit,
  euro,
  eventsOf,
  ME,
  ME_GUESTS,
  OPEN_DAYS,
  SPIT_INCLUDES,
  SPIT_PACKAGES,
  SPIT_SLOTS,
  SPIT_STEPS,
  spitAt,
  startOfDay,
  wallClock,
  type BridgeEvent,
  type SpitPackage,
} from '@ninja/shared';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { useToast } from '../components/Toast';
import { Bar, Button, Card, Chip, DemoNote, Field, Kicker, LiveDot, Num, Photo, PopIn, Press, Row, Rule, SectionHead, Segments, tap, Txt } from '../components/ui';
import { tr } from '../i18n';
import { PHOTOS } from '../photos';
import { useApp, useTick } from '../state/app';
import { C, fx, R, web } from '../theme';
import { BrassPlate } from '../social/objects';
import { Plinth } from '../social/parts';
import { setSocial, useSocial } from '../social/store';
import { appLink, countdownLong, newRef, shareLink, t } from '../social/util';

type SlotId = (typeof SPIT_SLOTS)[number]['id'];

/** The first cut, at the table: half past twelve on the day. */
const FIRST_CUT = 12 * 60 + 30;
/** Jōnin and Kage get ten percent off (a perk of the rank). */
const DISCOUNT = ME.rank === 'jonin' || ME.rank === 'kage' ? 0.1 : 0;

/** The next days a spit can be booked: lunch from Tuesday to Sunday, or a whole Monday; the marinade needs a day. */
function nextDates(slot: SlotId, from: Date): Date[] {
  const out: Date[] = [];
  let d = addDays(startOfDay(from), 2);
  for (let i = 0; out.length < 6 && i < 60; i++, d = addDays(d, 1)) {
    const open = (OPEN_DAYS as readonly number[]).includes(d.getDay());
    if (slot === 'maandag' ? d.getDay() === 1 : open) out.push(d);
  }
  return out;
}

const plateDate = (d: Date) => `${String(d.getDate()).padStart(2, '0')} · ${String(d.getMonth() + 1).padStart(2, '0')} · ${d.getFullYear()}`;

function LiveSpit({ ours }: { ours: boolean }) {
  const { ev, minute } = useTick(2000);
  const r = spitAt(ev, 'rund', minute);
  return (
    <Card tone="leather" pad={18}>
      <View style={{ gap: 14 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Kicker color={C.amber}>{ours ? 'Jullie spies, live' : 'Het vuur in de zaal, live'}</Kicker>
          <LiveDot />
        </Row>
        <Row gap={14} align="flex-end">
          <Num value={r.core} unit="°C" size={44} color={C.flame} />
          <Txt v="small" color={C.muted} style={{ flex: 1, marginBottom: 6 }}>
            in de snijlaag
          </Txt>
        </Row>
        <Row gap={18}>
          <View style={{ flex: 1, gap: 6 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt v="label" size={8} color={C.muted}>
                Korst
              </Txt>
              <Txt v="num" size={11} raw>{`${decimal(r.crust, 1)} °C`}</Txt>
            </Row>
            <Bar value={Math.min(1, (r.crust - 60) / 70)} />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt v="label" size={8} color={C.muted}>
                Eikenvuur
              </Txt>
              <Txt v="num" size={11} raw>{`${r.fire} °C`}</Txt>
            </Row>
            <Bar value={Math.min(1, (r.fire - 500) / 350)} />
          </View>
        </Row>
        <Txt v="small" size={11.5} color={C.faint}>
          {ours ? 'De sensor in jullie spies meldt elke paar seconden.' : 'Zodra jullie spies aan het vuur hangt, zie je hier haar eigen temperatuur.'}
        </Txt>
      </View>
    </Card>
  );
}

/**
 * Eigen Spies: a private spit with her name in brass. Choose the size, the moment and the guests, engrave the plate,
 * book; then follow the day as it happens (marinade, layering, the fire, the first cut at the table) and invite the
 * guests with a link.
 */
export default function EigenSpies() {
  const { bridge } = useApp();
  const social = useSocial();
  const toast = useToast();
  const booking = eventsOf(bridge, 'spit-booking').at(-1);
  const [pack, setPack] = useState<SpitPackage>(SPIT_PACKAGES[0]);
  const [slot, setSlot] = useState<SlotId>('lunch');
  const today = wallClock();
  const dates = useMemo(() => nextDates(slot, today), [slot, today.getDate()]); // eslint-disable-line react-hooks/exhaustive-deps
  const [day, setDay] = useState<string>(dateKey(dates[0]));
  const [guests, setGuests] = useState(pack.guests[0]);
  const [plate, setPlate] = useState(`${ME.first} & co.`);
  const chosen = dates.find((d) => dateKey(d) === day) ?? dates[0];
  const perPerson = pack.perPerson * (1 - DISCOUNT);

  if (booking) return <Booked booking={booking} invited={social.invited} />;

  const book = () => {
    const ref = newRef('spies');
    emit({ kind: 'spit-booking', ref, name: ME.name, day: dateKey(chosen), slot, guests, pack: pack.id, plate: plate.trim() || ME.first });
    tap('success');
    toast(tr('Je spies is geboekt'), { text: t('{date} · {guests} gasten', { date: dayLong(chosen), guests }), icon: 'spit' });
  };

  return (
    <Screen back kicker="Eigen Spies" title="Jouw naam aan het vuur" serif="een spies, met de hand gelegd, voor jullie alleen" gap={22}>
      <Photo source={PHOTOS['gal-spit-wide']} radius={R.lg} style={{ width: '100%', aspectRatio: 4 / 3 }}>
        <View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' }, web({ backgroundImage: 'linear-gradient(180deg, rgba(11,8,7,0), rgba(11,8,7,.9))' })]} />
        <View style={{ position: 'absolute', left: 16, bottom: 14, right: 16 }}>
          <Txt v="small" size={12} color={C.soft}>
            Een spies van zes of tien kilo, gemarineerd, laag op laag gelegd, met jullie naam in messing.
          </Txt>
        </View>
      </Photo>

      <View style={{ gap: 12 }}>
        <SectionHead kicker="Stap 1" title="Hoe groot" />
        <Row gap={10} align="stretch">
          {SPIT_PACKAGES.map((p) => {
            const on = p.id === pack.id;
            return (
              <Card
                key={p.id}
                tone={on ? 'oxblood' : 'leather'}
                pad={16}
                style={{ flex: 1 }}
                onPress={() => {
                  setPack(p);
                  setGuests((g) => Math.min(p.guests[1], Math.max(p.guests[0], g)));
                }}
                label={p.name}
              >
                <View style={{ gap: 8 }}>
                  <Txt v="h2">{p.name}</Txt>
                  <Txt v="num" size={12} color={on ? C.flame : C.soft} raw>{`${p.kg} kg · ${p.guests[0]}–${p.guests[1]}`}</Txt>
                  <Rule style={{ opacity: 0.5 }} />
                  {DISCOUNT ? (
                    <Txt v="num" size={11} color={C.muted} raw style={{ textDecorationLine: 'line-through' }}>
                      {euro(p.perPerson)}
                    </Txt>
                  ) : null}
                  <Txt v="stat" size={22} raw>
                    {euro(p.perPerson * (1 - DISCOUNT))}
                  </Txt>
                  <Txt v="small" size={11} color={on ? 'rgba(244,236,225,0.75)' : C.muted}>
                    per persoon
                  </Txt>
                </View>
              </Card>
            );
          })}
        </Row>
        {DISCOUNT ? (
          <Row gap={8}>
            <Icon name="crown" size={14} color={C.amber} />
            <Txt v="small" size={12} color={C.amber}>
              Jōnin: 10 % korting op je Eigen Spies.
            </Txt>
          </Row>
        ) : null}
      </View>

      <View style={{ gap: 12 }}>
        <SectionHead kicker="Stap 2" title="Wanneer" />
        <Segments<SlotId>
          value={slot}
          onChange={(s) => {
            setSlot(s);
            setDay(dateKey(nextDates(s, today)[0]));
          }}
          options={SPIT_SLOTS.map((s) => ({ id: s.id, label: s.id === 'lunch' ? 'Lunch' : 'Maandag' }))}
        />
        <Txt v="small" color={C.muted}>
          {SPIT_SLOTS.find((s) => s.id === slot)?.line}
        </Txt>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {dates.map((d) => (
            <Chip key={dateKey(d)} label={dayShort(d)} raw on={dateKey(d) === dateKey(chosen)} onPress={() => setDay(dateKey(d))} />
          ))}
        </ScrollView>
      </View>

      <View style={{ gap: 12 }}>
        <SectionHead kicker="Stap 3" title="Met hoeveel" />
        <Row gap={16}>
          <Press onPress={() => setGuests((g) => Math.max(pack.guests[0], g - 1))} accessibilityLabel={tr('Minder')} style={{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line2 }}>
            <Icon name="minus" size={18} color={C.ink} />
          </Press>
          <View style={{ alignItems: 'center', minWidth: 70 }}>
            <Txt v="stat" size={36} raw>
              {String(guests)}
            </Txt>
            <Txt v="label" size={8} color={C.muted}>
              gasten
            </Txt>
          </View>
          <Press onPress={() => setGuests((g) => Math.min(pack.guests[1], g + 1))} accessibilityLabel={tr('Meer')} style={{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line2 }}>
            <Icon name="plus" size={18} color={C.ink} />
          </Press>
          <Txt v="small" color={C.muted} style={{ flex: 1 }}>
            {t('Voor {min} tot {max} gasten.', { min: pack.guests[0], max: pack.guests[1] })}
          </Txt>
        </Row>
      </View>

      <View style={{ gap: 14 }}>
        <SectionHead kicker="Stap 4" title="Het plaatje in messing" />
        <Plinth>
          <BrassPlate name={plate} date={plateDate(chosen)} width={300} />
        </Plinth>
        <Field value={plate} onChangeText={(v) => setPlate(v.slice(0, 24))} placeholder="Een naam, een datum, een grap" maxLength={24} />
        <Txt v="small" size={11.5} color={C.faint}>
          Gegraveerd door een graveur in de Kloosterstraat. Het plaatje is daarna van jullie.
        </Txt>
      </View>

      <Card tone="leather" pad={18}>
        <View style={{ gap: 12 }}>
          <Kicker>Inbegrepen</Kicker>
          {SPIT_INCLUDES.map((line) => (
            <Row key={line} gap={10}>
              <Icon name="check" size={15} color={C.amber} stroke={2} />
              <Txt v="body" size={14.5} style={{ flex: 1 }}>
                {line}
              </Txt>
            </Row>
          ))}
        </View>
      </Card>

      <View style={{ gap: 10 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt v="small" color={C.muted}>
            {t('{guests} × {price}', { guests, price: euro(perPerson) })}
          </Txt>
          <Txt v="stat" size={26} raw>
            {euro(perPerson * guests)}
          </Txt>
        </Row>
        <Button title="Boek de spies" kind="lacquer" size="lg" full icon="spit" onPress={book} />
        <Txt v="small" size={11.5} color={C.faint} align="center">
          Je betaalt op de dag zelf. Annuleren kan tot drie dagen vooraf.
        </Txt>
      </View>
      <DemoNote text="Eigen Spies is een voorstel voor Ninja: de pakketten en prijzen zijn voorbeelden." />
    </Screen>
  );
}

type Booking = Extract<BridgeEvent, { kind: 'spit-booking' }>;

/** After booking: the plate, the countdown, the day's steps as the kitchen ticks them off, and the guest list. */
function Booked({ booking, invited }: { booking: Booking; invited: string[] }) {
  const { bridge } = useApp();
  const toast = useToast();
  useTick(1000);
  const [y, m, d] = booking.day.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const cut = atMinute(date, FIRST_CUT);
  const done = new Set(eventsOf(bridge, 'spit-step').filter((s) => s.ref === booking.ref).map((s) => s.step));
  const next = SPIT_STEPS.find((s) => !done.has(s.id));
  const left = cut.getTime() - wallClock().getTime();
  const pack = SPIT_PACKAGES.find((p) => p.id === booking.pack) ?? SPIT_PACKAGES[0];
  const onFire = done.has('fire');

  const invite = async () => {
    const r = await shareLink(appLink(`/eigen-spies?uitnodiging=${booking.ref}`), t('{name} nodigt je uit aan haar eigen spies bij Ninja, {date}.', { name: ME.first, date: dayLong(date) }));
    if (r === 'copied') toast(tr('Link gekopieerd'), { icon: 'share' });
  };

  return (
    <Screen back kicker="Eigen Spies" title={booking.plate} serif={t('{date} · {guests} gasten', { date: dayLong(date), guests: booking.guests })} gap={22}>
      <Plinth>
        <BrassPlate name={booking.plate} date={plateDate(date)} width={320} />
      </Plinth>
      <Card tone="oxblood" pad={18}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ gap: 4 }}>
            <Txt v="label" size={8.5} color={C.flame}>
              Tot de eerste snede
            </Txt>
            <Txt v="stat" size={30} raw>
              {left > 0 ? countdownLong(left) : '00:00:00'}
            </Txt>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Txt v="num" size={12} color="rgba(244,236,225,0.8)" raw>
              {clock(cut)}
            </Txt>
            <Txt v="small" size={11.5} color="rgba(244,236,225,0.7)" raw>
              {`${tr(pack.name)} · ${pack.kg} kg`}
            </Txt>
          </View>
        </Row>
      </Card>

      <View style={{ gap: 4 }}>
        <SectionHead kicker="De dag" title="Van marinade tot snede" />
        {SPIT_STEPS.map((s, i) => {
          const isDone = done.has(s.id);
          const isNext = next?.id === s.id;
          const at = new Date(cut.getTime() + s.at * 60000);
          return (
            <Row key={s.id} gap={14} align="flex-start">
              <View style={{ alignItems: 'center', width: 28 }}>
                <View {...fx(isDone ? 'ember-btn' : isNext ? 'live' : '')} style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: isDone ? 'transparent' : isNext ? C.amber : C.line2, backgroundColor: isDone ? C.ember : 'transparent' }}>
                  {isDone ? <Icon name="check" size={14} color="#1A0A04" stroke={2.2} /> : <Txt v="num" size={10} color={isNext ? C.amber : C.muted} raw>{String(i + 1)}</Txt>}
                </View>
                {i < SPIT_STEPS.length - 1 ? <View style={{ width: 1, height: 58, backgroundColor: isDone ? C.ember : C.line2, opacity: isDone ? 0.6 : 1 }} /> : null}
              </View>
              <View style={{ flex: 1, gap: 3, paddingBottom: 14, opacity: isDone || isNext ? 1 : 0.6 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Txt v="h3">{s.title}</Txt>
                  <Txt v="num" size={10.5} color={C.muted} raw>{`${dayShort(at)} · ${clock(at)}`}</Txt>
                </Row>
                <Txt v="small" color={C.muted}>
                  {s.line}
                </Txt>
                {isDone ? (
                  <Txt v="label" size={8} color={C.ember}>
                    Gedaan
                  </Txt>
                ) : isNext ? (
                  <Txt v="label" size={8} color={C.amber}>
                    Volgende stap
                  </Txt>
                ) : null}
              </View>
            </Row>
          );
        })}
      </View>

      <LiveSpit ours={onFire} />

      <PopIn style={{ gap: 12 }}>
        <SectionHead kicker="Gasten" title="Nodig ze uit" />
        <Row gap={8} wrap>
          {ME_GUESTS.map((g) => {
            const on = invited.includes(g);
            return <Chip key={g} label={g} raw icon={on ? 'check' : 'plus'} on={on} onPress={() => setSocial((s) => ({ invited: on ? s.invited.filter((x) => x !== g) : [...s.invited, g] }))} />;
          })}
        </Row>
        <Txt v="small" color={C.muted}>
          {t('{n} van {max} uitgenodigd. Elke gast krijgt een link met de dag, het uur en de spies live.', { n: invited.length, max: booking.guests })}
        </Txt>
        <Button title="Deel de uitnodiging" kind="bone" size="lg" full icon="share" onPress={invite} />
      </PopIn>
      <DemoNote text="De stappen zet de keuken in het panel: marinade, leggen, aan het vuur, eerste snede." />
    </Screen>
  );
}
