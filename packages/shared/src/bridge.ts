import type { AreaId } from './floor';
import type { Meat, Portion } from './menu';

/**
 * The live link between the guest app, the panel and the website. They are served from the same site, so they share
 * the browser's storage: what the guest does in the app (join the line, order, send a çay, take a flash photo, book a
 * spit) shows up in the panel at once, and what the floor does (call the guest in, carve, deliver, approve a photo)
 * shows up in the app. Also when the two are open side by side on the start page. Nothing leaves the browser.
 *
 * Times: `at` is the real clock (Date.now()); `minute` fields are Ninja's evening minutes (Antwerp wall clock or the
 * replay), so a plate cut in the app lands on the same evening the panel shows.
 */

export type ItemLine = { dish: string; meat?: Meat; portion?: Portion; qty: number; iskender?: boolean; by?: string };

export type CallKind = 'ober' | 'lavash' | 'water' | 'saus' | 'rekening';

export type BridgeEvent = { id: string; /** Real clock, ms. */ at: number } & (
  | { kind: 'line-join'; ref: string; name: string; size: number; rank: string; area: AreaId | 'any'; day: string; minute: number }
  | { kind: 'line-call'; ref: string; table: string }
  | { kind: 'line-seat'; ref: string; table: string; minute: number }
  | { kind: 'line-leave'; ref: string }
  | { kind: 'order'; ref: string; table: string | null; items: ItemLine[]; from: 'rij' | 'tafel'; day: string; minute: number; total: number }
  | { kind: 'carve'; ref: string; dish: string; meat?: Meat; portion: Portion; day: string; minute: number; core: number; seconds: number; table: string }
  | { kind: 'call'; table: string; call: CallKind }
  | { kind: 'call-ok'; table: string; call: CallKind; by: string }
  | { kind: 'pay'; ref: string; table: string; total: number; tip: number; method: string; split: number; invoice?: string }
  | { kind: 'feedback'; ref: string; taste: number; service: number; vibe: number; text: string }
  | { kind: 'feedback-reply'; ref: string; by: string; text: string }
  | { kind: 'match-on'; photo: string; intent: string }
  | { kind: 'match-like'; persona: string }
  | { kind: 'match-mutual'; persona: string }
  | { kind: 'match-chat'; persona: string; text: string; mine: boolean }
  | { kind: 'cay'; persona: string; table: string; dish: string; note: string; fromTable: string }
  | { kind: 'cay-done'; ref: string; by: string }
  | { kind: 'flash'; ref: string; thumb: string; caption: string; passport?: number }
  | { kind: 'wall'; ref: string; ok: boolean }
  | { kind: 'drop-claim'; drop: string; qty: number }
  | { kind: 'spit-booking'; ref: string; name: string; day: string; slot: string; guests: number; pack: string; plate: string }
  | { kind: 'spit-step'; ref: string; step: string }
  | { kind: 'gift'; ref: string; gift: string; to: string; amount: number; note: string }
  | { kind: 'rsvp'; night: string; guests: number }
  | { kind: 'fresh-spit'; spit: string; minute: number }
  | { kind: 'soldout'; dish: string; on: boolean }
  | { kind: 'sensei'; question: string }
);

export type BridgeState = { events: BridgeEvent[] };

const KEY = 'ninja-antwerp-demo-v1';
const CHANNEL = 'ninja-antwerp-demo';
const EMPTY: BridgeState = { events: [] };

const storage = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

let channel: BroadcastChannel | null = null;

/** Listeners in this window: a BroadcastChannel never hears its own messages, nor a page its own storage writes. */
const local = new Set<(state: BridgeState) => void>();
const getChannel = () => {
  if (!channel && typeof BroadcastChannel !== 'undefined') channel = new BroadcastChannel(CHANNEL);
  return channel;
};

export function readBridge(): BridgeState {
  try {
    const raw = storage()?.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<BridgeState>;
    return { events: Array.isArray(parsed.events) ? parsed.events : [] };
  } catch {
    return EMPTY;
  }
}

function write(state: BridgeState) {
  // Flash photos are the heavy part: keep the newest few with their thumbnails, the rest without.
  let photos = 0;
  const events = state.events
    .slice(-260)
    .reverse()
    .map((e) => (e.kind === 'flash' && ++photos > 6 ? { ...e, thumb: '' } : e))
    .reverse();
  try {
    storage()?.setItem(KEY, JSON.stringify({ events }));
  } catch {
    // Private mode or storage full: the demo still works on this screen.
  }
  getChannel()?.postMessage('changed');
  const next = { events };
  queueMicrotask(() => {
    for (const fn of local) fn(next);
  });
}

export function updateBridge(update: (state: BridgeState) => BridgeState) {
  write(update(readBridge()));
}

let seq = 0;

type NewEvent = BridgeEvent extends infer E ? (E extends BridgeEvent ? Omit<E, 'id' | 'at'> & { at?: number } : never) : never;

/** Adds what just happened; returns the event with its id. */
export function emit(event: NewEvent): BridgeEvent {
  const full = { at: Date.now(), ...event, id: `${event.kind}-${Date.now()}-${++seq}` } as BridgeEvent;
  updateBridge((s) => ({ ...s, events: [...s.events, full] }));
  return full;
}

/** Starts the demo over. */
export const resetBridge = () => write(EMPTY);

/** Calls back whenever another screen changes something. */
export function onBridge(callback: (state: BridgeState) => void): () => void {
  const ch = getChannel();
  const onMessage = () => callback(readBridge());
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) callback(readBridge());
  };
  ch?.addEventListener('message', onMessage);
  local.add(callback);
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') window.addEventListener('storage', onStorage);
  return () => {
    local.delete(callback);
    ch?.removeEventListener('message', onMessage);
    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') window.removeEventListener('storage', onStorage);
  };
}

/** The events of one kind, oldest first. */
export function eventsOf<K extends BridgeEvent['kind']>(state: BridgeState, kind: K): Extract<BridgeEvent, { kind: K }>[] {
  return state.events.filter((e): e is Extract<BridgeEvent, { kind: K }> => e.kind === kind);
}

/** The guest's own place in the line, if she joined and has not been seated or left. */
export function myLine(state: BridgeState) {
  const joined = eventsOf(state, 'line-join').at(-1);
  if (!joined) return null;
  const after = (e: { ref: string; at: number }) => e.ref === joined.ref && e.at >= joined.at;
  const left = eventsOf(state, 'line-leave').some(after);
  const seat = eventsOf(state, 'line-seat').filter(after).at(-1) ?? null;
  const call = eventsOf(state, 'line-call').filter(after).at(-1) ?? null;
  if (left) return null;
  return { joined, call, seat };
}

/** The table the guest sits at now (seated from the line, or scanned at the table). */
export function myTable(state: BridgeState): string | null {
  const seat = eventsOf(state, 'line-seat').at(-1);
  const paid = eventsOf(state, 'pay').at(-1);
  if (!seat) return null;
  if (paid && paid.at > seat.at) return null;
  return seat.table;
}

/** Everything the guest ordered since she sat down (or joined the line), not yet paid. */
export function myOrders(state: BridgeState) {
  const paid = eventsOf(state, 'pay').at(-1)?.at ?? 0;
  return eventsOf(state, 'order').filter((o) => o.at > paid);
}

/** The app's plates that were carved, newest last. */
export const myPlates = (state: BridgeState) => eventsOf(state, 'carve');
