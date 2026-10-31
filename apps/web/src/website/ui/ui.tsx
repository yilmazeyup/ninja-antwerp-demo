// Small pieces the sections share: the numbered kicker, rolling digits, a photo on film, the seal.

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

/** "03 ——— HET VUUR": the section's number, a chrome rule and its name in wide caps. */
export function Kicker({ n, children, tone }: { n: string; children: ReactNode; tone?: 'dark' }) {
  return (
    <div className={`w-kicker${tone === 'dark' ? ' on-light' : ''}`} data-reveal>
      <span className="nj-mono w-kicker-n" translate="no">
        {n}
      </span>
      <span className="w-kicker-rule" aria-hidden />
      <span className="nj-label">{children}</span>
    </div>
  );
}

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * A number whose digits roll to their new value, like a mechanical counter; other characters (comma, unit) stay put.
 * Digits are keyed from the right, so 9,9 → 10,0 rolls each column the short way.
 */
export function Roll({ text, className, style }: { text: string; className?: string; style?: CSSProperties }) {
  const chars = [...text];
  return (
    <span className={`roll ${className ?? ''}`} style={style} aria-label={text} role="text" translate="no" dir="ltr">
      {chars.map((c, i) => {
        const key = chars.length - i;
        if (/\d/.test(c)) {
          return (
            <span key={`d${key}`} className="roll-d" aria-hidden>
              <span className="roll-s" style={{ transform: `translateY(${-Number(c) * 10}%)` }}>
                {DIGITS.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </span>
            </span>
          );
        }
        return (
          <span key={`c${key}`} className={c === ' ' || c === ' ' ? 'roll-sp' : 'roll-c'} aria-hidden>
            {c === ' ' ? ' ' : c}
          </span>
        );
      })}
    </span>
  );
}

/** One of Ninja's photos, on film: fine grain, a slight vignette, a slow reveal. */
export function Film({
  src,
  alt,
  className,
  ratio,
  priority,
  children,
}: {
  src: string;
  alt: string;
  className?: string;
  ratio?: string;
  priority?: boolean;
  children?: ReactNode;
}) {
  return (
    <figure className={`film nj-grain ${className ?? ''}`} style={ratio ? { aspectRatio: ratio } : undefined} data-reveal>
      <img src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} decoding="async" />
      {children}
    </figure>
  );
}

/** The oxblood seal with 忍. */
export const Seal = ({ size = 46 }: { size?: number }) => (
  <span className="nj-seal" style={{ width: size, height: size, fontSize: size * 0.56 }} aria-hidden translate="no">
    忍
  </span>
);

/** A value that updates on a timer without re-rendering its parents. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Calls back with the element's size whenever it changes. */
export function useSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}
