import { dishById, emit, isVeg, priceOf, type Dish, type ItemLine, type Meat } from '@ninja/shared';

import type { Diet, Saved } from '../state/app';

/** The price of one line of the basket. */
export const lineTotal = (l: ItemLine) => priceOf(dishById(l.dish), l.portion, l.iskender) * l.qty;

export const basketTotal = (items: ItemLine[]) => items.reduce((s, l) => s + lineTotal(l), 0);

export const basketCount = (items: ItemLine[]) => items.reduce((s, l) => s + l.qty, 0);

const same = (a: ItemLine, b: ItemLine) => a.dish === b.dish && a.meat === b.meat && (a.portion ?? '1x') === (b.portion ?? '1x') && !!a.iskender === !!b.iskender;

/** Adds a line to the basket, or one more of the same. */
export function addLine(items: ItemLine[], line: ItemLine): ItemLine[] {
  const hit = items.find((l) => same(l, line));
  if (hit) return items.map((l) => (l === hit ? { ...l, qty: l.qty + line.qty } : l));
  return [...items, line];
}

export function changeQty(items: ItemLine[], line: ItemLine, delta: number): ItemLine[] {
  return items.map((l) => (same(l, line) ? { ...l, qty: l.qty + delta } : l)).filter((l) => l.qty > 0);
}

/** Can she eat it, given her diet? Vegetarian follows the meat chosen; the fries are fried in beef fat. */
export function fitsDiet(d: Dish, diet: Diet, meat?: Meat): boolean {
  if (diet.veg && !isVeg(d, meat ?? (d.meats?.includes('falafel') ? 'falafel' : undefined))) return false;
  if (diet.gluten && d.allergens.includes('gluten')) return false;
  if (diet.melk && d.allergens.includes('melk')) return false;
  if (diet.sesam && d.allergens.includes('sesam')) return false;
  if (diet.noten && d.allergens.includes('noten')) return false;
  return true;
}

export const dietActive = (diet: Diet) => Object.values(diet).some(Boolean);

let seq = 0;

/** Sends the basket to the kitchen: from the line (it is cut when she is called in) or from her table. */
export function sendOrder(saved: Saved, from: 'rij' | 'tafel', table: string | null, day: string, minute: number) {
  const items = saved.basket;
  const ref = `o${Date.now().toString(36)}${++seq}`;
  emit({ kind: 'order', ref, table, items, from, day, minute, total: basketTotal(items) });
  return ref;
}
