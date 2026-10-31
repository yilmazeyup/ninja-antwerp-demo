import { ALLERGENS, CATEGORIES, dishById, DISHES, dishesIn, euro, fromSpit, ME, MEATS, PHILOSOPHY, type CategoryId, type Dish, type ItemLine } from '@ninja/shared';
import { router } from 'expo-router';
import { useMemo, useRef, useState, type ComponentRef } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BasketBar } from '../../components/Basket';
import { Icon } from '../../components/Icon';
import { Backdrop } from '../../components/Screen';
import { Card, Chip, Kicker, Photo, Press, Row, Sheet, Tag, Toggle, Txt } from '../../components/ui';
import { tr } from '../../i18n';
import { addLine, basketTotal, dietActive, fitsDiet } from '../../lib/order';
import { useToast } from '../../components/Toast';
import { tap } from '../../components/ui';
import { PHOTOS } from '../../photos';
import { useApp, type Diet } from '../../state/app';
import { C, fx, MAX_WIDTH, PAD, R } from '../../theme';

const DIET: { key: keyof Diet; label: string }[] = [
  { key: 'veg', label: 'Vegetarisch' },
  { key: 'gluten', label: 'Zonder gluten' },
  { key: 'melk', label: 'Zonder melk' },
  { key: 'sesam', label: 'Zonder sesam' },
  { key: 'noten', label: 'Zonder noten' },
];

function price(d: Dish) {
  return d.price15 ? `${euro(d.price)} · 1,5× ${euro(d.price15)}` : euro(d.price);
}

/** A dish from the kitchen: Ninja's own photo, big, as on a fashion house's lookbook. */
function DishCard({ d, dim }: { d: Dish; dim: boolean }) {
  const signature = d.signature;
  return (
    <Press onPress={() => router.push(`/gerecht/${d.id}`)} accessibilityLabel={d.name} scaleTo={0.985} style={{ opacity: dim ? 0.35 : 1 }}>
      <View style={{ gap: 12 }}>
        <Photo source={d.photo ? PHOTOS[d.photo] : undefined} radius={R.lg} style={{ height: signature ? 300 : 210, borderWidth: 1, borderColor: C.line }}>
          <View style={{ position: 'absolute', top: 12, left: 12, flexDirection: 'row', gap: 6 }}>
            {signature ? <Tag label="Signature" color={C.black} bg={C.ink} /> : null}
            {d.isNew ? <Tag label="Nieuw" color={C.ink} bg="rgba(11,8,7,0.6)" /> : null}
            {fromSpit(d) ? <Tag label="Van de spies" icon="fire" color={C.flame} bg="rgba(11,8,7,0.6)" /> : null}
          </View>
        </Photo>
        <Row align="flex-start" style={{ justifyContent: 'space-between', gap: 14 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Txt v="title" raw>
              {d.name}
            </Txt>
            {d.desc ? (
              <Txt v="small" color={C.soft} numberOfLines={3}>
                {d.desc}
              </Txt>
            ) : null}
            {d.allergens.length ? (
              <Txt v="small" size={11} color={C.muted}>
                {d.allergens.map((a) => tr(ALLERGENS[a])).join(' · ')}
              </Txt>
            ) : null}
          </View>
          <Txt v="num" size={13} color={C.ink} style={{ textAlign: 'right' }} raw>
            {price(d)}
          </Txt>
        </Row>
      </View>
    </Press>
  );
}

/** A drink: a line with a price, as on the back of the card. */
function DrinkRow({ d, dim }: { d: Dish; dim: boolean }) {
  return (
    <Press onPress={() => router.push(`/gerecht/${d.id}`)} accessibilityLabel={d.name} scaleTo={0.99} style={{ opacity: dim ? 0.35 : 1 }}>
      <Row style={{ paddingVertical: 13, borderBottomWidth: 1, borderColor: C.line, justifyContent: 'space-between' }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt v="h3" raw>
            {d.size ? `${d.name} · ${d.size}` : d.name}
          </Txt>
          {d.desc ? (
            <Txt v="small" size={12} color={C.muted}>
              {d.desc}
            </Txt>
          ) : null}
        </View>
        <View {...fx('chrome')} style={{ flex: 0.3, height: 1, marginHorizontal: 12, opacity: 0.25, backgroundColor: C.line2 }} />
        <Txt v="num" size={13} raw>
          {euro(d.price)}
        </Txt>
      </Row>
    </Press>
  );
}

/** Her usual, from her card: one tap and it is in the basket again. */
function Usual() {
  const { update } = useApp();
  const toast = useToast();
  const u = ME.usual;
  const lines: ItemLine[] = [{ dish: u.dish, meat: u.meat, portion: u.portion, qty: 1 }, ...u.extras.map((dish) => ({ dish, qty: 1 }))];
  return (
    <Card tone="cognac" pad={18}>
      <Row style={{ justifyContent: 'space-between' }} align="flex-start">
        <View style={{ flex: 1, gap: 4 }}>
          <Kicker color={C.flame}>Je vaste</Kicker>
          <Txt v="title" raw>
            {`${dishById(u.dish).name} · ${u.portion === '1,5x' ? '1,5×' : '1×'}`}
          </Txt>
          <Txt v="small" color={C.soft} raw>
            {[tr(MEATS[u.meat].label), ...u.extras.map((x) => dishById(x).name)].join(' · ')}
          </Txt>
        </View>
        <Txt v="num" size={13} raw>
          {euro(basketTotal(lines))}
        </Txt>
      </Row>
      <Press
        onPress={() => {
          update((s) => ({ basket: lines.reduce((b, l) => addLine(b, l), s.basket) }));
          tap('success');
          toast(tr('Je vaste staat klaar'), { text: tr('Kijk je bestelling na en stuur ze naar de keuken.'), icon: 'check' });
        }}
        accessibilityLabel={tr('Opnieuw bestellen')}
        fxNames="bone-btn"
        style={{ marginTop: 14, alignSelf: 'flex-start', height: 38, paddingHorizontal: 16, borderRadius: 19, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.ink }}
      >
        <Icon name="refresh" size={15} color={C.black} />
        <Txt v="label" size={9.5} color={C.black}>
          Opnieuw bestellen
        </Txt>
      </Press>
    </Card>
  );
}

export default function Menu() {
  const insets = useSafeAreaInsets();
  const { saved, update } = useApp();
  const [cat, setCat] = useState<CategoryId>('kebab');
  const [dietOpen, setDietOpen] = useState(false);
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const items = useMemo(() => dishesIn(cat), [cat]);
  const drinks = CATEGORIES.find((c) => c.id === cat)?.drinks;
  const active = dietActive(saved.diet);
  const fitting = DISHES.filter((d) => fitsDiet(d, saved.diet)).length;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Backdrop />
      <ScrollView ref={scroller} style={{ flex: 1 }} showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]}>
        <View style={{ width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', paddingTop: insets.top + 18, paddingHorizontal: PAD, gap: 10 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Kicker color={C.amber}>Klein menu · huisgemaakt</Kicker>
            <Press
              onPress={() => router.push('/sensei')}
              accessibilityLabel={tr('Vraag het Sensei')}
              fxNames="glass"
              style={{ height: 36, paddingHorizontal: 13, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: C.line2, backgroundColor: C.glass }}
            >
              <Icon name="sparkle" size={15} color={C.amber} />
              <Txt v="label" size={8.5} color={C.ink}>
                Sensei
              </Txt>
            </Press>
          </Row>
          <Txt v="mega" size={46}>
            Menu
          </Txt>
          <Txt v="serif" size={20} color={C.soft}>
            Geen suiker, geen bewaarmiddelen. Alleen Himalayazout.
          </Txt>
        </View>
        <View style={{ backgroundColor: 'transparent' }}>
          <View {...fx('glass')} style={{ paddingTop: 14, paddingBottom: 12, backgroundColor: C.glass, borderBottomWidth: 1, borderColor: C.line }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: PAD, gap: 8 }}>
              <Chip label={active ? tr('Dieet · {n}').replace('{n}', String(fitting)) : 'Dieet'} icon="sliders" on={active} small onPress={() => setDietOpen(true)} />
              {CATEGORIES.map((c) => (
                <Chip
                  key={c.id}
                  label={c.title}
                  small
                  on={c.id === cat}
                  onPress={() => {
                    setCat(c.id);
                    scroller.current?.scrollTo({ y: 0, animated: true });
                  }}
                />
              ))}
            </ScrollView>
          </View>
        </View>
        <View style={{ width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', paddingHorizontal: PAD, paddingTop: 22, gap: drinks ? 0 : 30 }}>
          <View style={{ gap: 6, marginBottom: drinks ? 8 : 0 }}>
            <Kicker>{CATEGORIES.find((c) => c.id === cat)?.kicker ?? ''}</Kicker>
            <Txt v="display">{CATEGORIES.find((c) => c.id === cat)?.title ?? ''}</Txt>
          </View>
          {cat === 'kebab' ? <Usual /> : null}
          {cat === 'kebab' ? (
            <Card tone="flat" pad={16}>
              <Row gap={12} align="flex-start">
                <Icon name="fire" size={20} color={C.amber} />
                <Txt v="small" color={C.soft} style={{ flex: 1 }}>
                  {PHILOSOPHY[2].text}
                </Txt>
              </Row>
            </Card>
          ) : null}
          {items.map((d) => (drinks ? <DrinkRow key={d.id} d={d} dim={!fitsDiet(d, saved.diet)} /> : <DishCard key={d.id} d={d} dim={!fitsDiet(d, saved.diet)} />))}
          <View style={{ paddingTop: 26, gap: 6 }}>
            <Txt v="small" size={11.5} color={C.muted}>
              Halal. Sauzen: yoghurt-knoflook en ui-tomaat. Allergenen ter indicatie; vraag het ons gerust.
            </Txt>
          </View>
        </View>
        <View style={{ height: 210 + insets.bottom }} />
      </ScrollView>
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 104 + insets.bottom, alignItems: 'center', paddingHorizontal: PAD }}>
        <View style={{ width: '100%', maxWidth: MAX_WIDTH - PAD * 2 }}>
          <BasketBar />
        </View>
      </View>
      <Sheet open={dietOpen} onClose={() => setDietOpen(false)} title={tr('Wat eet je niet?')}>
        {DIET.map((o) => (
          <Row key={o.key} style={{ justifyContent: 'space-between', paddingVertical: 6 }}>
            <Txt v="h3">{o.label}</Txt>
            <Toggle value={saved.diet[o.key]} onChange={(v) => update((s) => ({ diet: { ...s.diet, [o.key]: v } }))} label={o.label} />
          </Row>
        ))}
        <Txt v="small" color={C.muted}>
          Alles bij Ninja is halal. Let op: de frieten worden gebakken in rundvet. Wat niet past, wordt gedimd; Sensei houdt er ook rekening mee.
        </Txt>
      </Sheet>
    </View>
  );
}
