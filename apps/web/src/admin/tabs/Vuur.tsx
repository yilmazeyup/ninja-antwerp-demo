import { celsius, clock, CORE_TARGET, decimal, emit, fireAt, formatNo, spitSeries, STATUS_LABEL, type SpitId } from '@ninja/shared';
import { useMemo } from 'react';

import { hms, passportsTonight, spitForecast, spitNow } from '../derive';
import { useLive, type Live } from '../live';
import { Gauge, Kpi, LineChart, Num, Panel } from '../ui';
import { PageHead, timeTicks } from './common';

const SPITS: { id: SpitId; title: string; sub: string }[] = [
  { id: 'rund', title: 'Spies 1', sub: 'Rund · kalf · lam' },
  { id: 'kip', title: 'Spies 2', sub: 'Kip' },
];

/** Vuur: every sensor of both spits and the oak fire, the evening in lines, and tonight's carve log. */
export function Vuur() {
  const live = useLive();
  const fire = Math.round(fireAt(live.ev, live.m));
  const lastLog = live.ev.refuels.filter((r) => r <= live.m).at(-1);
  const minuteKey = Math.floor(live.m / 2);
  const fireSeries = useMemo(() => {
    const pts: [number, number][] = [];
    for (let m = 14 * 60; m <= live.m; m += 2) pts.push([m, fireAt(live.ev, m)]);
    pts.push([live.m, fireAt(live.ev, live.m)]);
    return pts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minuteKey, live.ev]);
  return (
    <>
      <PageHead
        kicker="Telemetrie · twee spiezen, één vuur"
        title={
          <>
            Het <em>vuur</em>
          </>
        }
        sub="Een sonde in de snijlaag, een infraroodcamera op de korst, een thermokoppel in het eikenvuur en een weegschaal onder elke spies. Elke snede gaat met zijn paspoort in het logboek."
      />
      <div className="grid cols-2">
        {SPITS.map((s) => (
          <SpitPanel key={s.id} spit={s.id} title={s.title} sub={s.sub} />
        ))}
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 300px) minmax(0, 1fr)', marginTop: 16 }}>
        <Panel kicker="Thermokoppel" title="Eikenvuur" className="center-panel">
          <div style={{ display: 'grid', placeItems: 'center' }}>
            <Gauge value={fire} min={300} max={900} label="Vuur" unit="°C" digits={0} size={210} sub={lastLog ? `eik erbij om ${clock(new Date(live.day.getTime() + lastLog * 60000))}` : undefined} />
          </div>
          <p className="note" style={{ marginTop: 12, textAlign: 'center' }}>
            Elke 20 tot 28 minuten gaat er gedroogd eikenhout op. Het vuur zakt even en vlamt dan op.
          </p>
        </Panel>
        <Panel kicker="Vanavond" title="Het vuur over de avond">
          <LineChart
            height={220}
            x0={14 * 60}
            x1={Math.max(live.m, 15 * 60)}
            y0={300}
            y1={900}
            yTicks={[400, 600, 800]}
            yUnit="°"
            xTicks={timeTicks(14 * 60, Math.max(live.m, 15 * 60))}
            now={live.m}
            series={[{ points: fireSeries, color: '#FF6A2A', area: true, width: 1.6 }]}
            marks={live.ev.refuels.filter((r) => r <= live.m).slice(-1).map((r) => ({ y: fireAt(live.ev, r), label: 'eik', color: '#FFB547' }))}
          />
          <div className="legend">
            <span>
              <i style={{ background: '#FF6A2A' }} />
              Thermokoppel in het vuur
            </span>
            <span className="mono">{live.ev.refuels.filter((r) => r <= live.m).length} keer eik bijgelegd</span>
          </div>
        </Panel>
      </div>
      <CarveLog />
      <Sensors />
    </>
  );
}

function SpitPanel({ spit, title, sub }: { spit: SpitId; title: string; sub: string }) {
  const live = useLive();
  const r = spitNow(live, spit);
  const f = spitForecast(live, spit);
  const plan = live.ev.spits.find((s) => s.id === spit)!;
  const minuteKey = Math.floor(live.m / 2);
  const series = useMemo(() => {
    const from = plan.onFire;
    const pts = spitSeries(live.ev, spit, from, Math.max(from + 2, live.m), 2);
    return { core: pts.map((p) => [p.m, p.core] as [number, number]), crust: pts.map((p) => [p.m, p.crust] as [number, number]) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minuteKey, live.ev, spit]);
  const emptyAt = clock(new Date(live.day.getTime() + Math.min(f.emptyAt, 23.9 * 60) * 60000));
  const fresh = () => emit({ kind: 'fresh-spit', spit, minute: live.m });
  return (
    <Panel
      kicker={sub}
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          {title}
          <span className={`ok-tag ${r.status === 'bijna-op' ? 'warn' : r.status === 'opwarmen' || r.status === 'koud' ? 'warn' : ''}`}>{STATUS_LABEL[r.status]}</span>
        </span>
      }
      actions={
        <button type="button" className="btn small" onClick={fresh}>
          Verse spies aan het vuur
        </button>
      }
    >
      <div className="gauges">
        <Gauge value={r.core} min={20} max={90} target={CORE_TARGET} label="Kern" sub={`doel ${CORE_TARGET} °C`} />
        <Gauge value={r.crust} min={20} max={200} label="Korst" digits={0} sub={`index ${decimal(r.crustIndex * 100, 0)} %`} />
      </div>
      <div className="spit-facts">
        <Kpi label="Over" value={r.kg} digits={1} unit="kg" sub={`van ${plan.kgStart} kg`} tone={r.kg < 6 ? 'alert' : undefined} />
        <Kpi label="Op rond" value={f.emptyAt > 23.5 * 60 ? '—' : emptyAt} sub={`${decimal(f.perHour, 1)} kg per uur`} tone="ember" />
        <Kpi label="Toerental" value={r.rpm} digits={1} unit="tpm" sub={`${r.distance} cm van het vuur`} />
        <Kpi label="Sneden" value={r.cuts} sub={r.lastCut < 3600 ? `laatste ${r.lastCut} s geleden` : 'nog geen'} />
      </div>
      <LineChart
        height={150}
        x0={plan.onFire}
        x1={Math.max(live.m, plan.onFire + 30)}
        y0={0}
        y1={200}
        yTicks={[50, 100, 150]}
        yUnit="°"
        xTicks={timeTicks(plan.onFire, Math.max(live.m, plan.onFire + 30))}
        now={live.m}
        marks={[{ y: CORE_TARGET, label: `${CORE_TARGET} °C`, color: '#9AD8A8' }]}
        series={[
          { points: series.crust, color: '#FFB547', width: 1.3 },
          { points: series.core, color: '#FF6A2A', width: 1.8 },
        ]}
      />
      <div className="legend">
        <span>
          <i style={{ background: '#FF6A2A' }} />
          Kern (sonde)
        </span>
        <span>
          <i style={{ background: '#FFB547' }} />
          Korst (infrarood)
        </span>
        <span>
          <i style={{ background: '#9AD8A8' }} />
          Doel bij het snijden
        </span>
      </div>
    </Panel>
  );
}

function csvOf(live: Live) {
  const rows = passportsTonight(live)
    .slice()
    .reverse()
    .map((p) =>
      [live.key, formatNo(p.no), hms(p.carved), p.dishName, p.meatLabel ?? '', p.portion, p.spits.join(' + '), decimal(p.core, 1), String(CORE_TARGET), p.core >= CORE_TARGET ? 'OK' : 'NIET OK', p.carver, p.table]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(';'),
    );
  const head = ['datum', 'paspoort', 'tijd', 'gerecht', 'vlees', 'portie', 'spies', 'kern_c', 'doel_c', 'controle', 'snijder', 'tafel'].join(';');
  return `﻿${head}\n${rows.join('\n')}\n`;
}

function CarveLog() {
  const live = useLive();
  const count = Math.floor(live.m * 2);
  const list = useMemo(() => passportsTonight(live), [count, live.bridge]); // eslint-disable-line react-hooks/exhaustive-deps
  const okAll = list.every((p) => p.core >= CORE_TARGET);
  const download = () => {
    const blob = new Blob([csvOf(live)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ninja-favv-logboek-${live.key}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  return (
    <Panel
      kicker="Voedselveiligheid"
      title={`Logboek van vanavond · ${list.length} sneden`}
      className="log-panel"
      actions={
        <>
          <span className={`ok-tag ${okAll ? '' : 'alert'}`}>{okAll ? `Alles boven ${CORE_TARGET} °C` : 'Controleer'}</span>
          <button type="button" className="btn small" onClick={download}>
            FAVV-logboek (CSV)
          </button>
        </>
      }
    >
      <div className="log-scroll">
        <table className="tbl">
          <thead>
            <tr>
              <th>Paspoort</th>
              <th>Tijd</th>
              <th>Gerecht</th>
              <th>Spies</th>
              <th>Snijder</th>
              <th>Tafel</th>
              <th className="end">Kern</th>
              <th className="end">Controle</th>
            </tr>
          </thead>
          <tbody>
            {list.slice(0, 80).map((p) => (
              <tr key={p.no}>
                <td className="mono">No. {formatNo(p.no)}</td>
                <td className="mono">{hms(p.carved)}</td>
                <td>
                  {p.dishName}
                  <span className="faint"> · {p.meatLabel}</span>
                </td>
                <td className="muted">{p.spits.map((s) => s.split(' · ')[0]).join(' + ')}</td>
                <td>{p.carver}</td>
                <td className="mono">{p.table}</td>
                <td className="end">
                  <Num value={celsius(p.core)} />
                </td>
                <td className="end">
                  <span className={`ok-tag ${p.core >= CORE_TARGET ? '' : 'alert'}`}>{p.core >= CORE_TARGET ? 'OK' : 'Te koud'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

const SENSORS = [
  { title: 'Kernsonde', sub: 'In de snijlaag van elke spies', rows: [['Batterij', '82 %'], ['Signaal', '−61 dBm'], ['Meting', 'elke seconde'], ['Gekalibreerd', '14 okt 2026']] },
  { title: 'Infraroodcamera', sub: 'Op de korst, 32 × 24 punten', rows: [['Beelden', '25 fps'], ['Lens', '41 °C'], ['Emissiviteit', '0,95'], ['Zicht', 'helder']] },
  { title: 'Thermokoppel', sub: 'Type K, in het eikenvuur', rows: [['Bereik', '0–1100 °C'], ['Reactietijd', '0,4 s'], ['Kabel', 'glasvezel, 2 m'], ['Status', 'stabiel']] },
  { title: 'Weegschaal', sub: 'Onder elke spies', rows: [['Nauwkeurig', '±0,02 kg'], ['Tarra', '3,1 kg'], ['Drift', '0,00 kg/u'], ['Gekalibreerd', '14 okt 2026']] },
];

function Sensors() {
  return (
    <div className="grid cols-4" style={{ marginTop: 16 }}>
      {SENSORS.map((s) => (
        <Panel key={s.title} kicker={s.sub} title={s.title} tight actions={<span className="demo-tag">Demo</span>}>
          <div className="sensor">
            <span className="ok-tag">In orde</span>
            {s.rows.map(([k, v]) => (
              <div className="sensor-row" key={k}>
                <span>{k}</span>
                <span className="mono">{v}</span>
              </div>
            ))}
          </div>
        </Panel>
      ))}
    </div>
  );
}
