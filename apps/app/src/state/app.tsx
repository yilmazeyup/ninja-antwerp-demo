import {
  dateKey,
  emit,
  evening,
  minuteOf,
  myLine,
  myOrders,
  myPassports,
  myTable,
  ninjaNow,
  offsetFrom,
  onBridge,
  readBridge,
  startOfDay,
  type AreaId,
  type BridgeState,
  type Evening,
  type Intent,
  type ItemLine,
  type NinjaClock,
  type Passport,
} from '@ninja/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';

/**
 * The demo's memory on this device: the guest's diet, her basket, where she likes to sit, her Match profile, what she
 * claimed and booked. It lives in localStorage, so the demo survives a reload; "Demo opnieuw" in Clan clears it. The
 * clock is Ninja's (Antwerp, or the replay of the last evening; `?at=` sets another moment), and the bridge to the
 * panel is read live.
 */

export type Diet = { veg: boolean; gluten: boolean; melk: boolean; sesam: boolean; noten: boolean };

export type Saved = {
  diet: Diet;
  seat: AreaId | 'any';
  size: number;
  /** What she is choosing, before it goes to the kitchen. */
  basket: ItemLine[];
  /** A table scanned with the QR code (without the line). */
  scanned: string | null;
  match: { on: boolean; photo: string; intent: Intent; liked: string[]; passed: string[] };
  push: boolean;
  /** Drops she claimed, nights she said yes to. */
  claimed: string[];
  rsvps: string[];
  /** Ki earned in the demo on top of her card. */
  ki: number;
  flashCount: number;
};

const DEFAULTS: Saved = {
  diet: { veg: false, gluten: false, melk: false, sesam: false, noten: false },
  seat: 'fire',
  size: 2,
  basket: [],
  scanned: null,
  match: { on: false, photo: '', intent: 'vriendschap', liked: [], passed: [] },
  push: true,
  claimed: [],
  rsvps: [],
  ki: 0,
  flashCount: 0,
};

const KEY = 'ninja-app-v1';

function load(): Saved {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Saved>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

function save(s: Saved) {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(s));
  } catch {
    // Private windows or a full disk: the demo keeps working until the page reloads.
  }
}

export const resetSaved = () => {
  try {
    globalThis.localStorage?.removeItem(KEY);
  } catch {
    // Nothing stored.
  }
};

const offset = (() => {
  try {
    return offsetFrom(new URLSearchParams(globalThis.location?.search ?? '').get('at'));
  } catch {
    return 0;
  }
})();

/** Ninja's clock now: live in Antwerp while open, the replay of the last evening otherwise. */
export const clockNow = (): NinjaClock => ninjaNow(new Date(), offset);

/** The evening on the clock, and the minute in it (with seconds as a fraction). */
export function eveningNow() {
  const clock = clockNow();
  const day = startOfDay(clock.now);
  return { clock, ev: evening(day), minute: minuteOf(clock.now), day, key: dateKey(day) };
}

type AppState = {
  clock: NinjaClock;
  now: Date;
  ev: Evening;
  minute: number;
  dayKey: string;
  bridge: BridgeState;
  saved: Saved;
  update: (change: Partial<Saved> | ((s: Saved) => Partial<Saved>)) => void;
  line: ReturnType<typeof myLine>;
  table: string | null;
  orders: ReturnType<typeof myOrders>;
  passports: Passport[];
};

const Context = createContext<AppState | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const [clock, setClock] = useState(clockNow);
  const [bridge, setBridge] = useState<BridgeState>(readBridge);
  const [saved, setSaved] = useState<Saved>(load);
  const latest = useRef(saved);
  latest.current = saved;

  useEffect(() => {
    const t = setInterval(() => setClock(clockNow()), 5000);
    const off = onBridge(setBridge);
    return () => {
      clearInterval(t);
      off();
    };
  }, []);

  const update = useCallback((change: Partial<Saved> | ((s: Saved) => Partial<Saved>)) => {
    const next = { ...latest.current, ...(typeof change === 'function' ? change(latest.current) : change) };
    latest.current = next;
    save(next);
    setSaved(next);
  }, []);

  const day = startOfDay(clock.now);
  const ev = evening(day);
  const minute = minuteOf(clock.now);
  const line = useMemo(() => myLine(bridge), [bridge]);
  const table = useMemo(() => myTable(bridge) ?? saved.scanned, [bridge, saved.scanned]);
  const orders = useMemo(() => myOrders(bridge), [bridge]);
  const passports = useMemo(() => myPassports(bridge), [bridge]);

  const value = useMemo<AppState>(
    () => ({ clock, now: clock.now, ev, minute, dayKey: dateKey(day), bridge, saved, update, line, table, orders, passports }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clock, bridge, saved, update, line, table, orders, passports],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('useApp outside AppProvider');
  return ctx;
}

/** Ninja's clock ticking every `ms` for the component that asks (telemetry, countdowns), without redrawing the app. */
export function useTick(ms = 1000) {
  const [t, setT] = useState(eveningNow);
  useEffect(() => {
    const id = setInterval(() => setT(eveningNow()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return t;
}

export { emit };
