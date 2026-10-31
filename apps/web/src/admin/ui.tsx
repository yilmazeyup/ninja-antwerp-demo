import { decimal, rankInfo, type Rank } from '@ninja/shared';
import { useId, type ReactNode } from 'react';

// The panel's building blocks in Ninja's materials: leather panels with a saddle stitch, chrome bezels, ember lines,
// numbers in Martian Mono with their units smaller and dimmer, labels in wide caps.

export function Panel({ title, kicker, actions, children, className = '', tight }: { title?: ReactNode; kicker?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; tight?: boolean }) {
  return (
    <section className={`pn nj-leather ${tight ? 'tight' : ''} ${className}`}>
      {(title || actions) && (
        <header className="pn-head">
          <div>
            {kicker && <div className="nj-label pn-kicker">{kicker}</div>}
            {title && <h2 className="pn-title">{title}</h2>}
          </div>
          {actions && <div className="pn-actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

/** A number as a sensor sends it: value in mono, unit smaller. */
export function Num({ value, unit, digits = 0, className = '' }: { value: number | string; unit?: string; digits?: number; className?: string }) {
  const text = typeof value === 'number' ? decimal(value, digits) : value;
  return (
    <span className={`nj-mono num ${className}`}>
      {text}
      {unit && <span className="nj-unit">{unit}</span>}
    </span>
  );
}

export function Kpi({ label, value, unit, digits, sub, tone, big }: { label: string; value: number | string; unit?: string; digits?: number; sub?: ReactNode; tone?: 'ember' | 'ok' | 'warn' | 'alert'; big?: boolean }) {
  return (
    <div className={`kpi ${tone ?? ''} ${big ? 'big' : ''}`}>
      <div className="nj-label kpi-label">{label}</div>
      <Num value={value} unit={unit} digits={digits} className="kpi-value" />
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

const polar = (cx: number, cy: number, r: number, a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;

function arcPath(cx: number, cy: number, r: number, a0: number, a1: number) {
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
}

/** A round gauge in a chrome bezel: the arc glows from ember to amber, a needle, a target mark, the value in mono. */
export function Gauge({ value, min, max, target, label, unit = '°C', digits = 1, size = 190, sub }: { value: number; min: number; max: number; target?: number; label: string; unit?: string; digits?: number; size?: number; sub?: ReactNode }) {
  const id = useId().replace(/:/g, '');
  const cx = 100;
  const cy = 100;
  const r = 74;
  const a0 = Math.PI * 0.75;
  const a1 = Math.PI * 2.25;
  const k = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const av = a0 + (a1 - a0) * k;
  const [px0, py0] = polar(cx, cy, r - 24, av);
  const [px1, py1] = polar(cx, cy, r + 9, av);
  const ticks = Array.from({ length: 41 }, (_, i) => i);
  const ta = target !== undefined ? a0 + (a1 - a0) * Math.max(0, Math.min(1, (target - min) / (max - min))) : null;
  return (
    <div className="gauge" style={{ width: size }}>
      <svg viewBox="0 0 200 200" width={size} height={size} aria-label={`${label}: ${decimal(value, digits)} ${unit}`}>
        <defs>
          <linearGradient id={`bezel-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#F7F8FA" />
            <stop offset="0.28" stopColor="#8D939B" />
            <stop offset="0.5" stopColor="#E3E6EA" />
            <stop offset="0.74" stopColor="#5D636B" />
            <stop offset="1" stopColor="#C9CDD3" />
          </linearGradient>
          <radialGradient id={`face-${id}`} cx="0.5" cy="0.35" r="0.75">
            <stop offset="0" stopColor="#2A1A13" />
            <stop offset="1" stopColor="#0B0807" />
          </radialGradient>
          <linearGradient id={`arc-${id}`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#7B151A" />
            <stop offset="0.55" stopColor="#FF6A2A" />
            <stop offset="1" stopColor="#FFE6A8" />
          </linearGradient>
          <filter id={`glow-${id}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>
        <circle cx={cx} cy={cy} r={97} fill={`url(#bezel-${id})`} />
        <circle cx={cx} cy={cy} r={92} fill="#0B0807" />
        <circle cx={cx} cy={cy} r={90} fill={`url(#face-${id})`} />
        {ticks.map((i) => {
          const a = a0 + ((a1 - a0) * i) / 40;
          const [x0, y0] = polar(cx, cy, 86, a);
          const [x1, y1] = polar(cx, cy, i % 5 === 0 ? 78 : 82, a);
          return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={i % 5 === 0 ? 'rgba(244,236,225,0.55)' : 'rgba(244,236,225,0.18)'} strokeWidth={i % 5 === 0 ? 1.4 : 0.8} />;
        })}
        <path d={arcPath(cx, cy, r, a0, a1)} stroke="rgba(244,236,225,0.07)" strokeWidth="7" fill="none" strokeLinecap="round" />
        {k > 0.002 && (
          <>
            <path d={arcPath(cx, cy, r, a0, av)} stroke={`url(#arc-${id})`} strokeWidth="7" fill="none" strokeLinecap="round" filter={`url(#glow-${id})`} opacity="0.7" />
            <path d={arcPath(cx, cy, r, a0, av)} stroke={`url(#arc-${id})`} strokeWidth="5" fill="none" strokeLinecap="round" />
          </>
        )}
        {ta !== null && (
          <g>
            <line x1={polar(cx, cy, 90, ta)[0]} y1={polar(cx, cy, 90, ta)[1]} x2={polar(cx, cy, 66, ta)[0]} y2={polar(cx, cy, 66, ta)[1]} stroke="#9AD8A8" strokeWidth="2" />
          </g>
        )}
        <line x1={px0} y1={py0} x2={px1} y2={py1} stroke="#FFE6A8" strokeWidth="2.4" strokeLinecap="round" filter={`url(#glow-${id})`} opacity="0.8" />
        <line x1={px0} y1={py0} x2={px1} y2={py1} stroke="#FFF4DD" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <div className="gauge-read">
        <Num value={value} unit={unit} digits={digits} className="gauge-value" />
        <div className="nj-label gauge-label">{label}</div>
        {sub && <div className="gauge-sub">{sub}</div>}
      </div>
    </div>
  );
}

export type Series = { points: [number, number][]; color: string; label?: string; dashed?: boolean; width?: number; area?: boolean };

/** A line chart in SVG: hairline grid, ember lines with a soft glow, x labels as clock times. */
export function LineChart({ series, x0, x1, y0, y1, height = 180, xTicks = [], yTicks = [], marks = [], now, yUnit = '' }: { series: Series[]; x0: number; x1: number; y0: number; y1: number; height?: number; xTicks?: { x: number; label: string }[]; yTicks?: number[]; marks?: { y: number; label: string; color: string }[]; now?: number; yUnit?: string }) {
  const id = useId().replace(/:/g, '');
  const W = 600;
  const H = height;
  const pad = { l: 38, r: 10, t: 10, b: 22 };
  const sx = (x: number) => pad.l + ((x - x0) / Math.max(1e-6, x1 - x0)) * (W - pad.l - pad.r);
  const sy = (y: number) => pad.t + (1 - (y - y0) / Math.max(1e-6, y1 - y0)) * (H - pad.t - pad.b);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height }}>
      <defs>
        <filter id={`lg-${id}`} x="-5%" y="-30%" width="110%" height="160%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
        {series.map((s, i) => (
          <linearGradient key={i} id={`ar-${id}-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={s.color} stopOpacity="0.28" />
            <stop offset="1" stopColor={s.color} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>
      {yTicks.map((y) => (
        <g key={y}>
          <line x1={pad.l} x2={W - pad.r} y1={sy(y)} y2={sy(y)} stroke="rgba(244,236,225,0.07)" />
          <text x={pad.l - 6} y={sy(y) + 3} className="chart-y" textAnchor="end">
            {decimal(y, 0)}
            {yUnit}
          </text>
        </g>
      ))}
      {xTicks.map((t) => (
        <text key={t.x} x={sx(t.x)} y={H - 6} className="chart-x" textAnchor="middle">
          {t.label}
        </text>
      ))}
      {marks.map((mk) => (
        <g key={mk.label}>
          <line x1={pad.l} x2={W - pad.r} y1={sy(mk.y)} y2={sy(mk.y)} stroke={mk.color} strokeDasharray="4 4" strokeWidth="1" opacity="0.8" />
          <text x={W - pad.r - 4} y={sy(mk.y) - 4} className="chart-mark" textAnchor="end" fill={mk.color}>
            {mk.label}
          </text>
        </g>
      ))}
      {series.map((s, i) => {
        if (s.points.length < 2) return null;
        const d = s.points.map(([x, y], k) => `${k ? 'L' : 'M'}${sx(x).toFixed(1)},${sy(y).toFixed(1)}`).join(' ');
        const area = `${d} L${sx(s.points[s.points.length - 1][0]).toFixed(1)},${sy(y0)} L${sx(s.points[0][0]).toFixed(1)},${sy(y0)} Z`;
        return (
          <g key={i}>
            {s.area && <path d={area} fill={`url(#ar-${id}-${i})`} />}
            {!s.dashed && <path d={d} stroke={s.color} strokeWidth={(s.width ?? 1.6) + 2} fill="none" opacity="0.35" filter={`url(#lg-${id})`} />}
            <path d={d} stroke={s.color} strokeWidth={s.width ?? 1.6} fill="none" strokeDasharray={s.dashed ? '5 5' : undefined} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          </g>
        );
      })}
      {now !== undefined && now >= x0 && now <= x1 && <line x1={sx(now)} x2={sx(now)} y1={pad.t} y2={H - pad.b} stroke="rgba(255,181,71,0.55)" strokeDasharray="2 3" />}
    </svg>
  );
}

/** Horizontal bars with labels and values (dish mix, comparisons). */
export function Bars({ items, max, unit = '' }: { items: { label: string; value: number; ghost?: number; hint?: string }[]; max?: number; unit?: string }) {
  const top = max ?? Math.max(1, ...items.map((i) => Math.max(i.value, i.ghost ?? 0)));
  return (
    <div className="bars">
      {items.map((it) => (
        <div className="bar-row" key={it.label}>
          <div className="bar-label" title={it.hint}>
            {it.label}
          </div>
          <div className="bar-track">
            {it.ghost !== undefined && <div className="bar-ghost" style={{ width: `${(it.ghost / top) * 100}%` }} />}
            <div className="bar-fill" style={{ width: `${(it.value / top) * 100}%` }} />
          </div>
          <Num value={it.value} unit={unit} className="bar-value" />
        </div>
      ))}
    </div>
  );
}

/** A rank: its kanji in Shippori Mincho, its name in wide caps. */
export function RankBadge({ rank, compact }: { rank: Rank | null; compact?: boolean }) {
  if (!rank) return <span className="rank none nj-label">Gast</span>;
  const r = rankInfo(rank);
  return (
    <span className={`rank ${rank} ${compact ? 'compact' : ''}`} translate="no">
      <span className="nj-kanji rank-kanji">{r.kanji}</span>
      {!compact && <span className="nj-label rank-name">{r.name}</span>}
    </span>
  );
}

export function Seal({ size = 46 }: { size?: number }) {
  return (
    <span className="nj-seal" style={{ width: size, height: size, fontSize: size * 0.56 }} translate="no">
      忍
    </span>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={`toggle ${on ? 'on' : ''}`} onClick={() => onChange(!on)}>
      <span className="toggle-knob" />
    </button>
  );
}

export function Segmented<T extends string>({ options, value, onChange, label }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button type="button" role="radio" aria-checked={o.id === value} key={o.id} className={o.id === value ? 'on' : ''} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

/** A small status dot. */
export const Dot = ({ color }: { color: string }) => <span className="dot" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />;
