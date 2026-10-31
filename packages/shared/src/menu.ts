// Ninja's menu as printed in June 2026 (NinjaMenu.pdf on ninja-antwerp.be): the names as Ninja writes them, the
// descriptions in Dutch, every price as on the card. Photos are Ninja's own, cut from the same PDF. Allergens and the
// diet marks are an indication worked out from the descriptions; the kitchen confirms them.

import type { IngredientId } from './provenance';

export type CategoryId = 'menu' | 'kebab' | 'dips' | 'sides' | 'dessert' | 'cold' | 'iced' | 'hot' | 'alcohol';

export const CATEGORIES: { id: CategoryId; title: string; kicker: string; drinks?: boolean }[] = [
  { id: 'menu', title: 'Ninja Menu', kicker: 'Alles van het huis' },
  { id: 'kebab', title: 'Ninja Kebab', kicker: 'Van de spies' },
  { id: 'dips', title: 'Dips & salades', kicker: 'Huisgemaakt' },
  { id: 'sides', title: 'Bijgerechten', kicker: 'Uit de steenoven en de friteuse' },
  { id: 'dessert', title: 'Dessert', kicker: 'Om af te sluiten' },
  { id: 'cold', title: 'Fris', kicker: 'Koud', drinks: true },
  { id: 'iced', title: 'IJskoffie', kicker: 'Koud', drinks: true },
  { id: 'hot', title: 'Warm', kicker: 'Thee en koffie', drinks: true },
  { id: 'alcohol', title: 'Bar', kicker: 'Met alcohol', drinks: true },
];

/** Beef is Ninja's marinated beef with veal and lamb; mix is beef and chicken together. */
export type Meat = 'beef' | 'chicken' | 'mix' | 'falafel';

export const MEATS: Record<Meat, { label: string; short: string }> = {
  beef: { label: 'Rund · kalf · lam', short: 'Rund' },
  chicken: { label: 'Kip', short: 'Kip' },
  mix: { label: 'Mix van rund en kip', short: 'Mix' },
  falafel: { label: 'Falafel', short: 'Falafel' },
};

/** The fourteen EU allergens that occur on this card. */
export type Allergen = 'gluten' | 'melk' | 'sesam' | 'noten' | 'selder' | 'sulfiet' | 'mosterd' | 'ei';

export const ALLERGENS: Record<Allergen, string> = {
  gluten: 'Gluten',
  melk: 'Melk',
  sesam: 'Sesam',
  noten: 'Noten',
  selder: 'Selder',
  sulfiet: 'Sulfiet',
  mosterd: 'Mosterd',
  ei: 'Ei',
};

/** Where the plate is made: the spit and its carver, the stone oven, the cold kitchen, the fryer, the pot, the bar. */
export type Station = 'spit' | 'oven' | 'cold' | 'fryer' | 'pot' | 'bar';

export type Dish = {
  id: string;
  name: string;
  cat: CategoryId;
  /** Dutch, after the card. */
  desc?: string;
  price: number;
  /** The 1,5× portion. */
  price15?: number;
  meats?: Meat[];
  photo?: string;
  isNew?: boolean;
  signature?: boolean;
  station: Station;
  allergens: Allergen[];
  /** Vegetarian; falafel versions count when `meats` holds falafel. */
  veg?: boolean;
  /** A detail worth knowing before you order. */
  note?: string;
  /** What goes into it, for the plate passport. */
  ingredients: IngredientId[];
  /** Sizes for drinks, as the card writes them. */
  size?: string;
};

const MEAT_BASE: IngredientId[] = ['beef', 'veal', 'lamb', 'himalayan_salt', 'oak'];
const PLATTER: IngredientId[] = ['lavash', 'flour', 'onion', 'sumac', 'parsley', 'lettuce', 'tomato'];

export const DISHES: Dish[] = [
  {
    id: 'ninja-menu',
    name: 'Ninja Menu',
    cat: 'menu',
    desc: 'Soep van de dag, twee dips naar keuze (yoghurt, ezme, hummus of wortel), een platter per persoon met lavash, uiensalade en frieten in rundvet of rijst, en Turkse rijstpudding. Iskender in plaats van de platter: + € 10.',
    price: 42.5,
    meats: ['beef', 'chicken', 'mix'],
    photo: 'menu-platter',
    station: 'spit',
    allergens: ['gluten', 'melk', 'sesam', 'noten', 'selder'],
    ingredients: [...MEAT_BASE, ...PLATTER, 'potato', 'tallow', 'yoghurt', 'chickpeas', 'tahini', 'rice', 'milk', 'pistachio'],
    note: 'Per persoon.',
  },
  {
    id: 'ninja-kebab',
    name: 'Ninja Kebab',
    cat: 'kebab',
    desc: 'Platter per persoon, met lavash en uiensalade.',
    price: 22.5,
    price15: 26.5,
    meats: ['beef', 'chicken', 'mix'],
    photo: 'kebab-platter',
    station: 'spit',
    allergens: ['gluten'],
    ingredients: [...MEAT_BASE, ...PLATTER],
  },
  {
    id: 'durum',
    name: 'Durum',
    cat: 'kebab',
    desc: 'Gerold in lavash uit de steenoven.',
    price: 16.5,
    price15: 21,
    meats: ['beef', 'chicken', 'mix', 'falafel'],
    photo: 'durum',
    station: 'spit',
    allergens: ['gluten', 'melk'],
    ingredients: [...MEAT_BASE, 'lavash', 'flour', 'lettuce', 'tomato', 'onion', 'yoghurt', 'garlic'],
  },
  {
    id: 'iskender',
    name: 'Iskender',
    cat: 'kebab',
    desc: 'Het Turkse nationale gerecht: het vlees op brood met pikante tomatensaus, schapenboter en yoghurt.',
    price: 29.5,
    price15: 34.5,
    meats: ['beef', 'chicken', 'mix'],
    photo: 'iskender',
    signature: true,
    station: 'spit',
    allergens: ['gluten', 'melk'],
    ingredients: [...MEAT_BASE, 'sourdough', 'flour', 'tomato', 'sheep_butter', 'yoghurt', 'pepper'],
  },
  {
    id: 'soup',
    name: 'Homemade Soup',
    cat: 'kebab',
    desc: 'Altijd vers. Vraag naar de soep van vandaag.',
    price: 8.5,
    photo: 'soup',
    isNew: true,
    station: 'pot',
    allergens: ['selder'],
    veg: true,
    ingredients: ['lentils', 'onion', 'carrot', 'himalayan_salt', 'lemon'],
  },
  {
    id: 'platter-rice',
    name: 'Platter Rice',
    cat: 'kebab',
    desc: 'Het vlees van de spies op Turkse rijst, met uiensalade.',
    price: 24.5,
    price15: 28.5,
    meats: ['beef', 'chicken', 'mix'],
    photo: 'platter-rice',
    isNew: true,
    station: 'spit',
    allergens: ['melk'],
    ingredients: [...MEAT_BASE, 'rice', 'onion', 'parsley', 'tomato'],
  },
  {
    id: 'ninja-rolls',
    name: 'Ninja Rolls',
    cat: 'kebab',
    desc: 'Opgerolde kebab met knoflookyoghurt en onze tomatensaus.',
    price: 33,
    meats: ['beef', 'chicken'],
    photo: 'ninja-rolls',
    isNew: true,
    station: 'spit',
    allergens: ['gluten', 'melk'],
    ingredients: [...MEAT_BASE, 'lavash', 'flour', 'yoghurt', 'garlic', 'tomato', 'parsley'],
  },
  {
    id: 'yoghurt-dip',
    name: 'Yoghurt Dip',
    cat: 'dips',
    desc: 'Komkommer, munt, dille en za’atar.',
    price: 11.5,
    photo: 'yoghurt-dip',
    station: 'cold',
    allergens: ['melk', 'sesam'],
    veg: true,
    ingredients: ['yoghurt', 'cucumber', 'mint', 'dill', 'zaatar', 'himalayan_salt'],
  },
  {
    id: 'carrot-dip',
    name: 'Carrot Dip',
    cat: 'dips',
    desc: 'Met knoflookyoghurt.',
    price: 11.5,
    photo: 'carrot-dip',
    isNew: true,
    station: 'cold',
    allergens: ['melk'],
    veg: true,
    ingredients: ['carrot', 'yoghurt', 'garlic', 'himalayan_salt'],
  },
  {
    id: 'hummus',
    name: 'Hummus',
    cat: 'dips',
    desc: 'Met tahin.',
    price: 11.5,
    photo: 'hummus',
    station: 'cold',
    allergens: ['sesam'],
    veg: true,
    ingredients: ['chickpeas', 'tahini', 'lemon', 'garlic', 'himalayan_salt'],
  },
  {
    id: 'ezme',
    name: 'Ezme',
    cat: 'dips',
    desc: 'Met ui en paprika.',
    price: 12.5,
    photo: 'ezme',
    station: 'cold',
    allergens: [],
    veg: true,
    ingredients: ['tomato', 'onion', 'pepper', 'pulbiber', 'parsley', 'sumac'],
  },
  {
    id: 'shepherd-salad',
    name: 'Turkish Shepherd Salad',
    cat: 'dips',
    desc: 'De Turkse herderssalade.',
    price: 13,
    photo: 'shepherd-salad',
    station: 'cold',
    allergens: [],
    veg: true,
    ingredients: ['tomato', 'cucumber', 'onion', 'pepper', 'parsley', 'lemon', 'sumac'],
  },
  {
    id: 'falafel-hummus',
    name: 'Falafel Hummus',
    cat: 'dips',
    desc: 'Huisgemaakte, verse falafel op hummus.',
    price: 16,
    photo: 'falafel-hummus',
    station: 'fryer',
    allergens: ['sesam'],
    veg: true,
    ingredients: ['chickpeas', 'tahini', 'parsley', 'garlic', 'himalayan_salt'],
  },
  {
    id: 'lavash',
    name: 'Lavash',
    cat: 'sides',
    desc: 'Twee stuks, uit de steenoven.',
    price: 4.9,
    photo: 'lavash',
    station: 'oven',
    allergens: ['gluten'],
    veg: true,
    ingredients: ['lavash', 'flour', 'himalayan_salt', 'oak'],
  },
  {
    id: 'fries',
    name: 'Beef Tallow Fries',
    cat: 'sides',
    desc: 'Frieten gebakken in rundvet.',
    price: 5.5,
    photo: 'fries',
    station: 'fryer',
    allergens: [],
    note: 'Gebakken in rundvet: niet vegetarisch.',
    ingredients: ['potato', 'tallow', 'himalayan_salt'],
  },
  {
    id: 'turkish-rice',
    name: 'Turkish Rice',
    cat: 'sides',
    desc: 'Turkse rijst.',
    price: 7,
    photo: 'turkish-rice',
    isNew: true,
    station: 'pot',
    allergens: ['melk'],
    veg: true,
    ingredients: ['rice', 'sheep_butter', 'himalayan_salt'],
  },
  {
    id: 'rice-pudding',
    name: 'Turkish Rice Pudding',
    cat: 'dessert',
    desc: 'Met pistache.',
    price: 8.5,
    photo: 'rice-pudding',
    station: 'cold',
    allergens: ['melk', 'noten'],
    veg: true,
    ingredients: ['milk', 'rice', 'pistachio'],
  },
  // Drinks, cold.
  { id: 'ayran', name: 'Ayran', cat: 'cold', desc: 'Huisgemaakt.', price: 3.5, station: 'bar', allergens: ['melk'], veg: true, ingredients: ['yoghurt', 'himalayan_salt'] },
  { id: 'cola', name: 'Cola', cat: 'cold', price: 3.9, station: 'bar', allergens: [], veg: true, ingredients: [] },
  { id: 'cola-zero', name: 'Cola Zero', cat: 'cold', price: 3.9, station: 'bar', allergens: [], veg: true, ingredients: [] },
  { id: 'fanta', name: 'Fanta', cat: 'cold', price: 3.9, station: 'bar', allergens: [], veg: true, ingredients: [] },
  { id: 'sprite', name: 'Sprite', cat: 'cold', price: 3.9, station: 'bar', allergens: [], veg: true, ingredients: [] },
  { id: 'fuze-lemon', name: 'Fuze Tea Sparkling Lemon', cat: 'cold', price: 3.9, station: 'bar', allergens: [], veg: true, ingredients: [] },
  { id: 'fuze-mango', name: 'Fuze Tea Green Mango', cat: 'cold', price: 3.9, station: 'bar', allergens: [], veg: true, ingredients: [] },
  { id: 'limonata', name: 'San Pellegrino Limonata', cat: 'cold', price: 3.9, station: 'bar', allergens: [], veg: true, ingredients: [] },
  { id: 'aranciata', name: 'San Pellegrino Aranciata', cat: 'cold', price: 3.9, station: 'bar', allergens: [], veg: true, ingredients: [] },
  { id: 'tonic', name: 'Schweppes Tonic', cat: 'cold', price: 3.9, station: 'bar', allergens: [], veg: true, ingredients: [] },
  { id: 'ginger-ale', name: 'Schweppes Ginger Ale', cat: 'cold', price: 3.9, station: 'bar', allergens: [], veg: true, ingredients: [] },
  { id: 'agrum', name: 'Schweppes Agrum', cat: 'cold', price: 3.9, station: 'bar', allergens: [], veg: true, ingredients: [] },
  { id: 'water-still', name: 'Plat water', cat: 'cold', size: '0,5 L', price: 7, station: 'bar', allergens: [], veg: true, ingredients: [] },
  { id: 'water-sparkling', name: 'Bruisend water', cat: 'cold', size: '0,5 L', price: 7, station: 'bar', allergens: [], veg: true, ingredients: [] },
  // Iced coffee.
  { id: 'iced-latte', name: 'Iced Latte', cat: 'iced', price: 5.5, station: 'bar', allergens: ['melk'], veg: true, ingredients: ['milk'] },
  { id: 'iced-caramel', name: 'Iced Caramel Latte', cat: 'iced', price: 6, station: 'bar', allergens: ['melk'], veg: true, ingredients: ['milk'] },
  { id: 'iced-hazelnut', name: 'Iced Hazelnut Latte', cat: 'iced', price: 6, station: 'bar', allergens: ['melk', 'noten'], veg: true, ingredients: ['milk'] },
  { id: 'iced-americano', name: 'Iced Americano', cat: 'iced', price: 5, station: 'bar', allergens: [], veg: true, ingredients: [] },
  // Hot.
  { id: 'cay', name: 'Turkse thee', cat: 'hot', desc: 'Çay, in het tulpglas.', price: 2.5, station: 'bar', allergens: [], veg: true, ingredients: ['tea'] },
  { id: 'americano', name: 'Americano', cat: 'hot', price: 4, station: 'bar', allergens: [], veg: true, ingredients: [] },
  { id: 'espresso', name: 'Espresso', cat: 'hot', price: 3.5, station: 'bar', allergens: [], veg: true, ingredients: [] },
  { id: 'double-espresso', name: 'Dubbele espresso', cat: 'hot', price: 4.5, station: 'bar', allergens: [], veg: true, ingredients: [] },
  { id: 'cappuccino', name: 'Cappuccino', cat: 'hot', price: 4.5, station: 'bar', allergens: ['melk'], veg: true, ingredients: ['milk'] },
  { id: 'latte', name: 'Latte', cat: 'hot', price: 5, station: 'bar', allergens: ['melk'], veg: true, ingredients: ['milk'] },
  // Bar.
  { id: 'stella', name: 'Stella Artois', cat: 'alcohol', price: 3.9, station: 'bar', allergens: ['gluten'], veg: true, ingredients: [] },
  { id: 'raki', name: 'Rakı', cat: 'alcohol', price: 9.5, station: 'bar', allergens: [], veg: true, ingredients: ['raki'] },
  { id: 'wine-white', name: 'Witte wijn', cat: 'alcohol', size: 'glas', price: 7.5, station: 'bar', allergens: ['sulfiet'], veg: true, ingredients: [] },
  { id: 'wine-red', name: 'Rode wijn', cat: 'alcohol', size: 'glas', price: 7.5, station: 'bar', allergens: ['sulfiet'], veg: true, ingredients: [] },
  { id: 'wine-rose', name: 'Rosé', cat: 'alcohol', size: 'glas', price: 7.5, station: 'bar', allergens: ['sulfiet'], veg: true, ingredients: [] },
  { id: 'cava', name: 'Cava', cat: 'alcohol', size: 'glas', price: 7.5, station: 'bar', allergens: ['sulfiet'], veg: true, ingredients: [] },
  { id: 'aperol', name: 'Aperol Spritz', cat: 'alcohol', price: 11, station: 'bar', allergens: ['sulfiet'], veg: true, ingredients: [] },
  { id: 'gin', name: 'Gin', cat: 'alcohol', price: 9, station: 'bar', allergens: [], veg: true, ingredients: [] },
  { id: 'whiskey', name: 'Whiskey', cat: 'alcohol', price: 9.5, station: 'bar', allergens: [], veg: true, ingredients: [] },
  { id: 'rum', name: 'Rum', cat: 'alcohol', price: 9, station: 'bar', allergens: [], veg: true, ingredients: [] },
  { id: 'wine-bottle', name: 'Fles wijn', cat: 'alcohol', size: 'fles', price: 29, station: 'bar', allergens: ['sulfiet'], veg: true, ingredients: [] },
];

const BY_ID = new Map(DISHES.map((d) => [d.id, d]));

export const dishById = (id: string): Dish => BY_ID.get(id) ?? DISHES[1];

export const dishesIn = (cat: CategoryId) => DISHES.filter((d) => d.cat === cat);

/** Comes off the spit: these get a plate passport with the moment and the temperature of the cut. */
export const fromSpit = (d: Dish) => d.station === 'spit';

/** Iskender instead of the platter in the Ninja Menu. */
export const ISKENDER_SUPPLEMENT = 10;

export type Portion = '1x' | '1,5x';

/** The price of one dish as ordered. */
export function priceOf(d: Dish, portion: Portion = '1x', iskender = false): number {
  const base = portion === '1,5x' && d.price15 ? d.price15 : d.price;
  return base + (iskender && d.id === 'ninja-menu' ? ISKENDER_SUPPLEMENT : 0);
}

/** Vegetarian as ordered: falafel makes a durum vegetarian; the fries are fried in beef fat and never are. */
export const isVeg = (d: Dish, meat?: Meat) => (d.veg ?? false) || meat === 'falafel';
