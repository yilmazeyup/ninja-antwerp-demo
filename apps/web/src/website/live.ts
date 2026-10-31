// The website's live data: Ninja's clock (the real evening while it is open, a replay of the last one otherwise,
// or a moment set with ?at=), the demo evening of that day, the bridge to the app and the panel, and a few hooks.

import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react';
import {
  decimal,
  evening,
  minuteOf,
  ninjaNow,
  offsetFrom,
  onBridge,
  readBridge,
  startOfDay,
  wallClock,
  type BridgeState,
  type Evening,
  type NinjaClock,
} from '@ninja/shared';

const params = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
const OFFSET = offsetFrom(params.get('at'));

export type Live = NinjaClock & {
  /** Minutes after midnight on Ninja's clock, with seconds as a fraction. */
  minute: number;
  /** The evening on that clock. */
  ev: Evening;
  /** The real wall clock in Antwerp (opening hours, "today"). */
  wall: Date;
};

function compute(): Live {
  const c = ninjaNow(new Date(), OFFSET);
  return { ...c, minute: minuteOf(c.now), ev: evening(startOfDay(c.now)), wall: wallClock() };
}

let current = compute();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    timer = setInterval(() => {
      current = compute();
      for (const l of listeners) l();
    }, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/** Ninja's clock, ticking every second, shared by every section. */
export function useLive(): Live {
  return useSyncExternalStore(subscribe, () => current, () => current);
}

/** The bridge state (flash photos, carvings, …), updated when the app or the panel changes something. */
export function useBridge(): BridgeState {
  const [state, setState] = useState<BridgeState>(readBridge);
  useEffect(() => onBridge(setState), []);
  return state;
}

/** True once the element has come into view (and stays true), or every time when `repeat`. */
export function useInView<T extends Element>(ref: RefObject<T | null>, opts: { margin?: string; repeat?: boolean; threshold?: number } = {}): boolean {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setSeen(true);
            if (!opts.repeat) io.disconnect();
          } else if (opts.repeat) setSeen(false);
        }
      },
      { rootMargin: opts.margin ?? '0px', threshold: opts.threshold ?? 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, opts.margin, opts.repeat, opts.threshold]);
  return seen;
}

/** Elements with `data-reveal` fade and rise into place as they come into view (once). */
export function useReveal() {
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    const scan = () => document.querySelectorAll('[data-reveal]:not(.is-in)').forEach((el) => io.observe(el));
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
}

/** Elements with `data-parallax` get `--p`: −1 below the middle of the screen, 0 in it, 1 above it. */
export function useParallax() {
  useEffect(() => {
    if (prefersReduced()) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const h = innerHeight || 1;
      document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -h || r.top > h * 2) return;
        const p = (h / 2 - (r.top + r.height / 2)) / h;
        el.style.setProperty('--p', Math.max(-1.5, Math.min(1.5, p)).toFixed(3));
      });
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    return () => {
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
}

export const prefersReduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(prefersReduced);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

/** Page scroll progress through an element: 0 when its top meets the viewport's top, 1 when it has scrolled away. */
export function useScrollProgress<T extends HTMLElement>(ref: RefObject<T | null>): RefObject<number> {
  const progress = useRef(0);
  useEffect(() => {
    const update = () => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      progress.current = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height)));
    };
    update();
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    return () => {
      removeEventListener('scroll', update);
      removeEventListener('resize', update);
    };
  }, [ref]);
  return progress;
}

/** "76,4 °C" in the current language's decimal style. */
export const deg = (v: number, digits = 1) => `${decimal(v, digits)} °C`;

/** "216 875": thousands with a thin space, as on the passport. */
export const grouped = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/** "2 d 04:12:33" or "04:12:33" until a moment. */
export function until(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const hms = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return d > 0 ? `${d} d ${hms}` : hms;
}

/** A file in public/, under the site's base path. */
export const photo = (key: string) => (key === 'logo-n' ? `${import.meta.env.BASE_URL}brand/logo-n.png` : `${import.meta.env.BASE_URL}photos/${key}.webp`);
