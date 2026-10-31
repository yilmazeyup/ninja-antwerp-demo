import {
  dishById,
  emit,
  eventsOf,
  fromSpit,
  matchTonight,
  myLine,
  readBridge,
  seatedAt,
  spitAt,
  TABLES,
  type BridgeState,
} from '@ninja/shared';
import { useEffect } from 'react';

import { eveningNow, useApp } from './app';

/**
 * The floor's hands when nobody runs the panel: the host calls the guest in from the line, the spit master cuts her
 * plates, the floor answers a call, brings a çay and lets a flash photo onto the Wall. With the panel open (it leaves a
 * heartbeat), the app waits much longer, so the person at the panel does it.
 */

const PANEL_KEY = 'ninja-panel-alive';

export function panelAlive(): boolean {
  try {
    return Date.now() - Number(globalThis.localStorage?.getItem(PANEL_KEY) ?? 0) < 12000;
  } catch {
    return false;
  }
}

const done = new Set<string>();
const once = (key: string, act: () => void) => {
  if (done.has(key)) return;
  done.add(key);
  act();
};

/** A free table for a group, in the area she likes when there is one. */
export function freeTable(area: string, size: number, minute: number): string {
  const { ev } = eveningNow();
  const taken = new Set(seatedAt(ev, minute).map((g) => g.table));
  const fits = TABLES.filter((t) => t.seats >= Math.min(size, 4) && !taken.has(t.id) && (t.area !== 'fire' || size <= 2));
  const wanted = fits.filter((t) => t.area === area);
  return (wanted[0] ?? fits[0] ?? TABLES.find((t) => t.area === area) ?? TABLES[0]).id;
}

function step(state: BridgeState) {
  const now = Date.now();
  const k = panelAlive() ? 5 : 1;
  const { ev, minute, key } = eveningNow();

  // The line: Noor calls her in, then she sits down.
  const line = myLine(state);
  if (line && !line.call && now - line.joined.at > 45000 * k) {
    once(`call-${line.joined.ref}`, () => emit({ kind: 'line-call', ref: line.joined.ref, table: freeTable(line.joined.area, line.joined.size, minute) }));
  }
  if (line?.call && !line.seat && now - line.call.at > 40000 * k) {
    once(`seat-${line.joined.ref}`, () => emit({ kind: 'line-seat', ref: line.joined.ref, table: line.call!.table, minute }));
  }

  // The spit: every plate of an order is cut, a little apart; pre-orders from the line wait until she is called in.
  const carved = new Set(eventsOf(state, 'carve').map((c) => c.ref));
  for (const order of eventsOf(state, 'order')) {
    if (order.from === 'rij' && !(line?.call || line?.seat || eventsOf(state, 'line-seat').some((s) => s.at > order.at))) continue;
    const wait = (order.from === 'rij' ? 8000 : 16000) * k;
    if (now - order.at < wait) continue;
    let i = 0;
    for (const item of order.items) {
      const d = dishById(item.dish);
      if (!fromSpit(d) || item.meat === 'falafel') continue;
      for (let q = 0; q < item.qty; q++, i++) {
        const ref = `${order.ref}-${i}`;
        if (carved.has(ref) || now - order.at < wait + i * 2500) continue;
        const spit = item.meat === 'chicken' ? 'kip' : 'rund';
        const r = spitAt(ev, spit, minute);
        once(`carve-${ref}`, () =>
          emit({ kind: 'carve', ref, dish: item.dish, meat: item.meat, portion: item.portion ?? '1x', day: key, minute, core: r.core, seconds: 34 + Math.round(Math.random() * 40), table: order.table ?? line?.call?.table ?? 'S1' }),
        );
      }
    }
  }

  // Calls are answered, çays are brought, photos go up on the Wall.
  const answered = new Set(eventsOf(state, 'call-ok').map((c) => `${c.table}-${c.call}`));
  for (const c of eventsOf(state, 'call')) {
    if (now - c.at > 9000 * k && !answered.has(`${c.table}-${c.call}`)) once(`ok-${c.id}`, () => emit({ kind: 'call-ok', table: c.table, call: c.call, by: c.call === 'lavash' ? 'Deniz' : 'Fien' }));
  }
  const brought = new Set(eventsOf(state, 'cay-done').map((c) => c.ref));
  for (const c of eventsOf(state, 'cay')) {
    if (now - c.at > 30000 * k && !brought.has(c.id)) once(`cay-${c.id}`, () => emit({ kind: 'cay-done', ref: c.id, by: 'Seppe' }));
  }
  const judged = new Set(eventsOf(state, 'wall').map((w) => w.ref));
  for (const f of eventsOf(state, 'flash')) {
    if (now - f.at > 22000 * k && !judged.has(f.ref)) once(`wall-${f.ref}`, () => emit({ kind: 'wall', ref: f.ref, ok: true }));
  }

  // Match: those who liked her already like her back a few seconds after she likes them.
  const mutual = new Set(eventsOf(state, 'match-mutual').map((m) => m.persona));
  const tonight = matchTonight(ev, minute);
  for (const like of eventsOf(state, 'match-like')) {
    const t = tonight.find((x) => x.persona.id === like.persona);
    const likes = t ? t.likesYou : like.persona.length % 2 === 0;
    if (likes && !mutual.has(like.persona) && now - like.at > 5000) once(`mutual-${like.persona}`, () => emit({ kind: 'match-mutual', persona: like.persona }));
  }
}

export function useAutopilot() {
  const { bridge } = useApp();
  useEffect(() => {
    const t = setInterval(() => step(readBridge()), 1500);
    return () => clearInterval(t);
  }, []);
  void bridge;
}
