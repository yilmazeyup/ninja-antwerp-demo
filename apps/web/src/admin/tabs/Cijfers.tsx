import { addDays, CLOSES, dayLong, decimal, dishById, dishMix, euro, evening, guestsAt, OPENS, platesBy, takingsAt, waitFor, type Evening } from '@ninja/shared';
import { useMemo } from 'react';

import { tonight } from '../derive';
import { useLive } from '../live';
import { Bars, Kpi, LineChart, Panel } from '../ui';
import { hhmm, PageHead, timeTicks } from './common';

/** Takings per hour (by the hour the order was placed) up to minute `m`. */
function hourly(ev: Evening, m: number) {
  const hours: { h: number; total: number; covers: number }[] = [];
  for (let h = OPENS / 60; h < CLOSES / 60; h++) hours.push({ h, total: 0, covers: 0 });
  for (const g of ev.groups) {
    if (g.orderAt === null || g.orderAt > m) continue;
    const slot = hours.find((x) => x.h === Math.floor(g.orderAt! / 60));
    if (!slot) continue;
    slot.total += g.spend;
    slot.covers += g.size;
  }
  return hours;
}

/** Cijfers: tonight in numbers, and against the same weekday last week. */
export function Cijfers() {
  const live = useLive();
  const { ev, m } = live;
  const last = useMemo(() => evening(addDays(live.day, -7)), [live.key]); // eslint-disable-line react-hooks/exhaustive-deps
  const t = takingsAt(ev, m);
  const app = tonight(live, 'order').filter((o) => o.minute <= m);
  const total = t.total + app.reduce((s, o) => s + o.total, 0);
  const covers = t.covers + (app.length ? 1 : 0);
  const prev = takingsAt(last, m);
  const delta = prev.total ? (total - prev.total) / prev.total : 0;
  const plates = platesBy(ev, m).length;
  const key = Math.floor(m / 3);
  const curves = useMemo(() => {
    const line: [number, number][] = [];
    const wait: [number, number][] = [];
    const seated: [number, number][] = [];
    for (let x = OPENS; x <= Math.min(m, CLOSES); x += 5) {
      const g = guestsAt(ev, x);
      line.push([x, g.linePeople]);
      seated.push([x, g.seated]);
      wait.push([x, waitFor(ev, x)]);
    }
    return { line, wait, seated };
  }, [key, ev]); // eslint-disable-line react-hooks/exhaustive-deps
  const hours = useMemo(() => hourly(ev, m), [key, ev]); // eslint-disable-line react-hooks/exhaustive-deps
  const hoursLast = useMemo(() => hourly(last, CLOSES), [last]);
  const mix = useMemo(() => dishMix(ev, m).filter((d) => dishById(d.dish).cat !== 'cold' && dishById(d.dish).cat !== 'hot' && dishById(d.dish).cat !== 'alcohol' && dishById(d.dish).cat !== 'iced'), [key, ev]); // eslint-disable-line react-hooks/exhaustive-deps
  const drinks = useMemo(() => dishMix(ev, m).filter((d) => ['cold', 'hot', 'alcohol', 'iced'].includes(dishById(d.dish).cat)), [key, ev]); // eslint-disable-line react-hooks/exhaustive-deps
  const maxHour = Math.max(1, ...hours.map((h) => h.total), ...hoursLast.map((h) => h.total));
  const peakWait = Math.max(0, ...curves.wait.map((p) => p[1]));
  const avgWait = curves.wait.length ? curves.wait.reduce((s, p) => s + p[1], 0) / curves.wait.length : 0;
  return (
    <>
      <PageHead
        kicker={`${dayLong(live.day)} · tot ${hhmm(m)}`}
        title={
          <>
            In <em>cijfers</em>
          </>
        }
        sub={`Vergeleken met ${dayLong(last.day)} op hetzelfde uur.`}
      />
      <div className="grid cols-4 kpi-row">
        <Panel tight>
          <Kpi big label="Omzet tot nu" value={euro(total)} tone="ember" sub={`${delta >= 0 ? '+' : '−'}${decimal(Math.abs(delta) * 100, 0)} % tegenover vorige week (${euro(prev.total)})`} />
        </Panel>
        <Panel tight>
          <Kpi big label="Couverts" value={covers} sub={`${t.groups + (app.length ? 1 : 0)} groepen · vorige week ${prev.covers}`} />
        </Panel>
        <Panel tight>
          <Kpi big label="Per gast" value={euro(covers ? total / covers : 0)} sub={`vorige week ${euro(prev.perGuest)}`} />
        </Panel>
        <Panel tight>
          <Kpi big label="Van de spies" value={plates} unit="borden" sub={`gemiddeld ${decimal(avgWait, 0)} min wachten · piek ${peakWait} min`} />
        </Panel>
      </div>
      <div className="grid cols-2" style={{ marginTop: 16 }}>
        <Panel kicker="Per uur" title="Omzet per uur, met vorige week">
          <div className="hours">
            {hours.map((h, i) => (
              <div className="hour" key={h.h}>
                <div className="hour-bars">
                  <span className="hour-last" style={{ height: `${(hoursLast[i].total / maxHour) * 100}%` }} />
                  <span className="hour-now" style={{ height: `${(h.total / maxHour) * 100}%` }} />
                </div>
                <span className="mono hour-v">{h.total ? euro(Math.round(h.total)) : '—'}</span>
                <span className="mono faint">{`${String(h.h).padStart(2, '0')}:00`}</span>
              </div>
            ))}
          </div>
          <div className="legend">
            <span>
              <i style={{ background: 'linear-gradient(90deg,#7b151a,#ff6a2a)' }} />
              Vanavond
            </span>
            <span>
              <i style={{ background: 'rgba(244,236,225,0.35)' }} />
              {dayLong(last.day)}
            </span>
          </div>
        </Panel>
        <Panel kicker="De deur" title="Rij en wachttijd over de avond">
          <LineChart
            height={210}
            x0={OPENS}
            x1={Math.max(m, OPENS + 60)}
            y0={0}
            y1={Math.max(60, ...curves.seated.map((p) => p[1]), ...curves.line.map((p) => p[1])) * 1.1}
            yTicks={[20, 40, 60]}
            xTicks={timeTicks(OPENS, Math.max(m, OPENS + 60))}
            now={m}
            series={[
              { points: curves.seated, color: '#9AD8A8', width: 1.4 },
              { points: curves.line, color: '#FF6A2A', area: true, width: 1.8 },
              { points: curves.wait, color: '#FFB547', dashed: true, width: 1.2 },
            ]}
          />
          <div className="legend">
            <span>
              <i style={{ background: '#9AD8A8' }} />
              Gasten binnen
            </span>
            <span>
              <i style={{ background: '#FF6A2A' }} />
              Personen in de rij
            </span>
            <span>
              <i style={{ background: '#FFB547' }} />
              Wachttijd (min)
            </span>
          </div>
        </Panel>
      </div>
      <div className="grid cols-2" style={{ marginTop: 16 }}>
        <Panel kicker="Wat de keuken uitstuurde" title="Gerechten vanavond">
          <Bars items={mix.slice(0, 12).map((d) => ({ label: dishById(d.dish).name, value: d.n }))} />
        </Panel>
        <Panel kicker="Aan de bar" title="Drankjes vanavond">
          <Bars items={drinks.slice(0, 12).map((d) => ({ label: dishById(d.dish).name, value: d.n }))} />
        </Panel>
      </div>
    </>
  );
}
