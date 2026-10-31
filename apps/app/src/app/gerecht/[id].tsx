import {
  ALLERGENS,
  COUNTRY_NAMES,
  dishById,
  euro,
  fromSpit,
  INGREDIENTS,
  isVeg,
  kmOf,
  meatIngredients,
  MEATS,
  priceOf,
  type Meat,
  type Portion,
} from '@ninja/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BasketBar } from '../../components/Basket';
import { Icon } from '../../components/Icon';
import { useSpit } from '../../components/live';
import { Backdrop, goBack } from '../../components/Screen';
import { useToast } from '../../components/Toast';
import { Button, Card, Chip, Flip, IconButton, Kicker, Photo, Press, Row, Tag, tap, Txt } from '../../components/ui';
import { tr } from '../../i18n';
import { addLine, fitsDiet } from '../../lib/order';
import { PHOTOS } from '../../photos';
import { useApp } from '../../state/app';
import { C, MAX_WIDTH, PAD } from '../../theme';

/** What a slice would measure if it were cut now, for dishes from the spit. */
function SpitNow({ meat }: { meat?: Meat }) {
  const { reading: r } = useSpit(meat === 'chicken' ? 'kip' : 'rund');
  return (
    <Press onPress={() => router.push('/spies')} accessibilityLabel={tr('Live spies')}>
      <Card tone="oxblood" pad={16}>
        <Row gap={14}>
          <Icon name="thermo" size={22} color={C.flame} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt v="label" size={8.5} color={C.flame}>
              Als je nu bestelt
            </Txt>
            <Txt v="h3">
              {tr('± {c} °C in het vlees bij de snede, korst {k} °C').replace('{c}', r.core.toFixed(1).replace('.', ',')).replace('{k}', String(Math.round(r.crust)))}
            </Txt>
          </View>
          <Flip>
            <Icon name="chevron" size={16} color={C.soft} />
          </Flip>
        </Row>
      </Card>
    </Press>
  );
}

export default function DishScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const d = dishById(String(id));
  const { saved, update } = useApp();
  const [meat, setMeat] = useState<Meat | undefined>(d.meats?.[0]);
  const [portion, setPortion] = useState<Portion>('1x');
  const [iskender, setIskender] = useState(false);
  const total = priceOf(d, portion, iskender);
  const ings = [...new Set([...(d.meats ? meatIngredients(meat) : []), ...d.ingredients])].filter((i) => (d.meats ? !['beef', 'veal', 'lamb', 'chicken'].includes(i) || meatIngredients(meat).includes(i) : true));
  const fits = fitsDiet(d, saved.diet, meat);

  const add = () => {
    update((s) => ({ basket: addLine(s.basket, { dish: d.id, meat, portion: d.price15 ? portion : undefined, qty: 1, iskender: d.id === 'ninja-menu' ? iskender : undefined }) }));
    tap('success');
    toast(tr('{dish} in je bestelling').replace('{dish}', d.name), { icon: 'check' });
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Backdrop />
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' }}>
          {d.photo ? (
            <Photo source={PHOTOS[d.photo]} style={{ height: 420 }}>
              <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 180, backgroundImage: 'linear-gradient(180deg,rgba(11,8,7,0),rgba(11,8,7,1))' } as never} />
            </Photo>
          ) : (
            <View style={{ height: insets.top + 70 }} />
          )}
          <View style={{ paddingHorizontal: PAD, gap: 18, marginTop: d.photo ? -60 : 0 }}>
            <View style={{ gap: 10 }}>
              <Row gap={6} wrap>
                {d.signature ? <Tag label="Signature" color={C.black} bg={C.ink} /> : null}
                {d.isNew ? <Tag label="Nieuw" /> : null}
                {fromSpit(d) ? <Tag label="Van de spies" icon="fire" color={C.flame} /> : null}
                {isVeg(d, meat) ? <Tag label="Vegetarisch" icon="leaf" color={C.ok} /> : null}
                <Tag label="Halal" />
              </Row>
              <Txt v="hero" raw>
                {d.size ? `${d.name} · ${d.size}` : d.name}
              </Txt>
              {d.desc ? (
                <Txt v="body" color={C.soft}>
                  {d.desc}
                </Txt>
              ) : null}
              {d.note ? (
                <Row gap={8}>
                  <Icon name="info" size={14} color={C.amber} />
                  <Txt v="small" color={C.amber}>
                    {d.note}
                  </Txt>
                </Row>
              ) : null}
              {!fits ? (
                <Row gap={8}>
                  <Icon name="leaf" size={14} color={C.alert} />
                  <Txt v="small" color={C.alert}>
                    Past niet bij je dieet.
                  </Txt>
                </Row>
              ) : null}
            </View>

            {d.meats ? (
              <View style={{ gap: 10 }}>
                <Kicker>Vlees</Kicker>
                <Row gap={8} wrap>
                  {d.meats.map((m) => (
                    <Chip key={m} label={MEATS[m].label} on={meat === m} onPress={() => setMeat(m)} />
                  ))}
                </Row>
              </View>
            ) : null}

            {d.price15 ? (
              <View style={{ gap: 10 }}>
                <Kicker>Portie</Kicker>
                <Row gap={8}>
                  <Chip label={`1× · ${euro(d.price)}`} on={portion === '1x'} onPress={() => setPortion('1x')} raw />
                  <Chip label={`1,5× · ${euro(d.price15)}`} on={portion === '1,5x'} onPress={() => setPortion('1,5x')} raw />
                </Row>
              </View>
            ) : null}

            {d.id === 'ninja-menu' ? (
              <View style={{ gap: 10 }}>
                <Kicker>Platter of Iskender</Kicker>
                <Row gap={8}>
                  <Chip label="Platter" on={!iskender} onPress={() => setIskender(false)} />
                  <Chip label={`Iskender · + ${euro(10)}`} on={iskender} onPress={() => setIskender(true)} raw />
                </Row>
              </View>
            ) : null}

            {fromSpit(d) && meat !== 'falafel' ? <SpitNow meat={meat} /> : null}

            {ings.length ? (
              <View style={{ gap: 4 }}>
                <Kicker>Waar het vandaan komt</Kicker>
                <View style={{ marginTop: 6 }}>
                  {ings.map((i) => {
                    const g = INGREDIENTS[i];
                    return (
                      <Row key={i} gap={12} style={{ paddingVertical: 11, borderBottomWidth: 1, borderColor: C.line }}>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Txt v="h3">{g.name}</Txt>
                          <Txt v="small" size={12} color={C.muted} raw>
                            {`${g.producer} · ${g.place}, ${tr(COUNTRY_NAMES[g.country])}`}
                          </Txt>
                          {g.real ? (
                            <Txt v="small" size={11.5} color={C.amber}>
                              {g.real}
                            </Txt>
                          ) : null}
                        </View>
                        <Txt v="num" size={12} color={C.soft} raw>
                          {`${kmOf(i).toLocaleString('nl-BE')} km`}
                        </Txt>
                      </Row>
                    );
                  })}
                </View>
                <Txt v="small" size={11} color={C.muted} style={{ marginTop: 8 }}>
                  Producenten en plaatsen zijn voorbeelden voor de demo; Ninja vult zijn eigen leveranciers in. De oranje regels staan zo op Ninja’s kaart.
                </Txt>
              </View>
            ) : null}

            {d.allergens.length ? (
              <View style={{ gap: 8 }}>
                <Kicker>Allergenen</Kicker>
                <Txt v="small" color={C.soft}>
                  {d.allergens.map((a) => tr(ALLERGENS[a])).join(' · ')}
                </Txt>
              </View>
            ) : null}

            <View style={{ height: 8 }} />
            <Button title={tr('Toevoegen · {p}').replace('{p}', euro(total))} icon="plus" size="lg" full onPress={add} label={tr('Toevoegen')} />
            <BasketBar />
          </View>
          <View style={{ height: 60 + insets.bottom }} />
        </View>
      </ScrollView>
      <View style={{ position: 'absolute', top: insets.top + 10, left: PAD }}>
        <Flip>
          <IconButton name="back" label="Terug" onPress={goBack} />
        </Flip>
      </View>
    </View>
  );
}
