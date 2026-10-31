import type { ReactNode } from 'react';

/** The head of a page: a kicker in wide caps, the title (one word in Cormorant italic), a line of explanation. */
export function PageHead({ kicker, title, sub, actions }: { kicker?: ReactNode; title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        {kicker && (
          <div className="nj-label" style={{ color: 'var(--nj-muted)', marginBottom: 8 }}>
            {kicker}
          </div>
        )}
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {actions && <div className="pn-actions">{actions}</div>}
    </div>
  );
}

const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.round(m % 60)).padStart(2, '0')}`;

/** Clock labels for a chart's x axis: every hour, or every half hour on a short stretch. */
export function timeTicks(from: number, to: number) {
  const step = to - from > 300 ? 60 : to - from > 100 ? 30 : 15;
  const out: { x: number; label: string }[] = [];
  for (let m = Math.ceil(from / step) * step; m <= to; m += step) out.push({ x: m, label: hhmm(m) });
  return out;
}

export { hhmm };
