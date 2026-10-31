import {
  dateKey,
  emit,
  evening,
  minuteOf,
  ninjaNow,
  offsetFrom,
  onBridge,
  readBridge,
  startOfDay,
  type BridgeState,
  type Evening,
  type NinjaClock,
} from '@ninja/shared';
import { createContext, useContext, useEffect, useRef, useState } from 'react';

/** Everything the panel shows comes from this moment: Ninja's clock, the evening of that day and the bridge. */
export type Live = {
  clock: NinjaClock;
  now: Date;
  day: Date;
  key: string;
  /** Minutes after midnight, with seconds as a fraction. */
  m: number;
  ev: Evening;
  bridge: BridgeState;
  /** performance.now() when this moment was read: the 3D interpolates between seconds. */
  perf: number;
};

const offset = offsetFrom(new URLSearchParams(location.search).get('at'));

let held: Evening | null = null;

/** The evening of `day`, held here so the shared cache can come and go without recomputing it every second. */
function eveningOf(day: Date): Evening {
  const key = dateKey(day);
  if (!held || held.key !== key) held = evening(day);
  return held;
}

export function readLive(bridge: BridgeState = readBridge()): Live {
  const clock = ninjaNow(new Date(), offset);
  const day = startOfDay(clock.now);
  return { clock, now: clock.now, day, key: dateKey(day), m: minuteOf(clock.now), ev: eveningOf(day), bridge, perf: performance.now() };
}

/** Ninja's moment, every second (on the second), and the bridge as soon as another screen changes it. */
export function useLiveState(): Live {
  const [live, setLive] = useState<Live>(() => readLive());
  const bridgeRef = useRef(live.bridge);
  useEffect(() => {
    let timer = 0;
    const tick = () => {
      setLive(readLive(bridgeRef.current));
      timer = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    };
    timer = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    const off = onBridge((state) => {
      bridgeRef.current = state;
      setLive(readLive(state));
    });
    return () => {
      clearTimeout(timer);
      off();
    };
  }, []);
  return live;
}

/** The panel is open: the guest app's autopilot then leaves the floor's work to the person here. */
export function useHeartbeat() {
  useEffect(() => {
    const beat = () => {
      try {
        localStorage.setItem('ninja-panel-alive', String(Date.now()));
      } catch {
        // Private mode: the app's autopilot simply stays quick.
      }
    };
    beat();
    const t = window.setInterval(beat, 5000);
    return () => clearInterval(t);
  }, []);
}

export const LiveContext = createContext<Live | null>(null);

export function useLive(): Live {
  const live = useContext(LiveContext);
  if (!live) throw new Error('useLive outside the panel');
  return live;
}

export { emit };
