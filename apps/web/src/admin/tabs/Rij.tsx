import {
  AREAS,
  emit,
  lineAt,
  myLine,
  RANK_PRIORITY,
  ROOM,
  seatedAt,
  TABLES,
  tableById,
  waitFor,
  waitForecast,
  type Rank,
} from '@ninja/shared';
import { useMemo, useState } from 'react';

import { appTable, freeTableFor, nextTableFor, phaseOf, PHASES, tableLabel } from '../derive';
import { useLive } from '../live';
import { Empty, Kpi, Num, Panel, RankBadge } from '../ui';
import { hhmm, PageHead } from './common';

/** Rij & tafels: who waits outside and in what order, the app guest's own place, the room's tables, the evening's wait. */
export function Rij() {
  const live = useLive();
  const { ev, m } = live;
  const line = lineAt(ev, m).sort((a, b) => (b.rank ? RANK_PRIORITY[b.rank] + 1 : 0) - (a.rank ? RANK_PRIORITY[a.rank] + 1 : 0) || a.arrive - b.arrive);
  const people = line.reduce((s, g) => s + g.size, 0);
  const wait = waitFor(ev, m);
  return (
    <>
      <PageHead
        kicker="Geen reservaties: wie komt, schuift aan"
        title={
          <>
            Rij <em>&amp;</em> tafels
          </>
        }
        sub="De digitale rij naast de echte: Kage en Jōnin schuiven voor, wie via de app in de rij staat bestelt al terwijl hij wacht."
      />
      <div className="rij-grid">
        <div className="rij-left">
          <AppGuest />
          <Panel kicker={`${line.length} groepen · ${people} personen · ±${wait} min`} title="De rij buiten">
            {line.length ? (
              <div className="list">
                {line.map((g, i) => {
                  const waited = Math.max(0, Math.round(m - g.arrive));
                  const preordered = g.orderAt !== null && g.orderAt <= m;
                  return (
                    <div className="row-item line-row" key={g.id}>
                      <span className="mono faint">{String(i + 1).padStart(2, '0')}</span>
                      <RankBadge rank={g.rank} compact />
                      <div>
                        <span className="who" translate="no">
                          {g.name}
                        </span>
                        <small>{g.area === 'any' ? `${g.size} pers. · geen voorkeur` : `${g.size} pers. · ${AREAS[g.area].label}`}</small>
                      </div>
                      <div className="line-tags">
                        {g.viaApp && <span className="demo-tag">App</span>}
                        {preordered && <span className="ok-tag">Voorbesteld</span>}
                      </div>
                      <Num value={waited} unit="min" className={waited > 25 ? 'amber' : ''} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <Empty>Niemand in de rij: wie nu komt, zit meteen.</Empty>
            )}
          </Panel>
        </div>
        <FloorPlan />
        <Forecast />
      </div>
    </>
  );
}

function AppGuest() {
  const live = useLive();
  const mine = myLine(live.bridge);
  if (!mine || mine.joined.day !== live.key) {
    return (
      <Panel kicker="Via de app" title="Digitale rij" tight>
        <p className="note" style={{ margin: 0 }}>
          Zodra een gast zich in de app in de rij zet, verschijnt ze hier: roep haar binnen of zet haar aan tafel.
        </p>
      </Panel>
    );
  }
  const j = mine.joined;
  const free = freeTableFor(live, j.size, j.area === 'any' ? undefined : j.area);
  const next = free ? null : nextTableFor(live, j.size);
  const table = mine.call?.table ?? free ?? next?.table ?? null;
  const waited = Math.max(0, Math.round((Date.now() - j.at) / 60000));
  const call = () => table && emit({ kind: 'line-call', ref: j.ref, table });
  const seat = () => table && emit({ kind: 'line-seat', ref: j.ref, table, minute: live.m });
  return (
    <div className="hl app-guest">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div className="nj-label" style={{ color: 'var(--nj-amber)' }}>
          Via de app · nu
        </div>
        <RankBadge rank={(j.rank as Rank) || null} />
      </div>
      <div className="app-guest-name" translate="no">
        {j.name}
      </div>
      <div className="facts" style={{ marginBottom: 12 }}>
        <Kpi label="Gasten" value={j.size} />
        <Kpi label="Wacht" value={waited} unit="min" />
        <Kpi label="Tafel" value={mine.seat ? tableLabel(mine.seat.table) : table ? tableLabel(table) : '—'} sub={!mine.seat && !mine.call && next ? `vrij om ${hhmm(next.at)}` : undefined} />
      </div>
      {mine.seat ? (
        <p className="note" style={{ margin: 0 }}>
          Zit aan {tableLabel(mine.seat.table)}. Smakelijk.
        </p>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn" onClick={call} disabled={!table || !!mine.call}>
            {mine.call ? 'Binnengeroepen' : 'Roep binnen'}
          </button>
          <button type="button" className="btn bone" onClick={seat} disabled={!table}>
            Aan tafel
          </button>
        </div>
      )}
    </div>
  );
}

function FloorPlan() {
  const live = useLive();
  const [sel, setSel] = useState<string | null>(null);
  const seated = seatedAt(live.ev, live.m);
  const app = appTable(live);
  const byTable = new Map(seated.map((g) => [g.table!, g]));
  const X = (x: number) => (x + 8.6) * 46;
  const Z = (z: number) => (z + 4.9) * 46;
  const selected = sel ? tableById(sel) : null;
  const g = sel ? byTable.get(sel) : undefined;
  return (
    <Panel kicker={`${seated.length + (app ? 1 : 0)} van ${TABLES.length} tafels bezet`} title="De zaal">
      <svg className="plan" viewBox={`0 0 ${X(8.6)} ${Z(8.2)}`} role="img" aria-label="Grondplan van Ninja">
        <defs>
          <pattern id="slats" width="5" height="5" patternUnits="userSpaceOnUse">
            <rect width="5" height="5" fill="#2A140C" />
            <rect width="2" height="5" fill="#3B1C11" />
          </pattern>
        </defs>
        <rect x={X(-8)} y={Z(-4.5)} width={16 * 46} height={9 * 46} rx="6" fill="#140D0A" stroke="rgba(244,236,225,0.22)" />
        <rect x={X(-8)} y={Z(-4.5)} width={16 * 46} height={6} fill="url(#slats)" />
        <rect x={X(ROOM.kitchen.x0)} y={Z(ROOM.kitchen.z0)} width={(ROOM.kitchen.x1 - ROOM.kitchen.x0) * 46} height={(ROOM.kitchen.z1 - ROOM.kitchen.z0) * 46} fill="rgba(123,21,26,0.18)" stroke="rgba(255,106,42,0.25)" strokeDasharray="4 4" />
        <text x={X(-7.85)} y={Z(-4.5) + 22} className="plan-label">
          Open keuken
        </text>
        <rect x={X(ROOM.fire.x - 0.25)} y={Z(ROOM.fire.z - ROOM.fire.d / 2)} width={0.5 * 46} height={ROOM.fire.d * 46} fill="#FF6A2A" opacity="0.65" rx="3" />
        {ROOM.spits.map((s) => (
          <circle key={s.id} cx={X(s.x)} cy={Z(s.z)} r={9} fill="#5E2D18" stroke="#FFB547" strokeWidth="1.2" />
        ))}
        <circle cx={X(ROOM.oven.x)} cy={Z(ROOM.oven.z)} r={ROOM.oven.r * 46} fill="#2A2019" stroke="#CDBFAF" strokeOpacity="0.4" />
        <rect x={X(ROOM.pass.x - ROOM.pass.w / 2)} y={Z(ROOM.pass.z - ROOM.pass.d / 2)} width={ROOM.pass.w * 46} height={ROOM.pass.d * 46} fill="#CDB89A" opacity="0.55" rx="2" />
        <ellipse cx={X(ROOM.bar.x)} cy={Z(ROOM.bar.z)} rx={ROOM.bar.rx * 46} ry={ROOM.bar.rz * 46} fill="none" stroke="#C9CDD3" strokeWidth="9" opacity="0.5" />
        <ellipse cx={X(ROOM.bar.x)} cy={Z(ROOM.bar.z)} rx={ROOM.bar.rx * 46 + 8} ry={ROOM.bar.rz * 46 + 8} fill="none" stroke="#FFE2BC" strokeWidth="1" opacity="0.6" />
        <rect x={X(-3.15)} y={Z(-4.5)} width={7.3 * 46} height={0.55 * 46} fill="#5E1D14" rx="4" opacity="0.9" />
        <line x1={X(-8)} x2={X(8)} y1={Z(4.5)} y2={Z(4.5)} stroke="#9DB2B2" strokeWidth="3" opacity="0.6" />
        <rect x={X(ROOM.door.x - ROOM.door.w / 2)} y={Z(4.5) - 3} width={ROOM.door.w * 46} height={6} fill="#0B0807" />
        <text x={X(-7.7)} y={Z(5.35)} className="plan-label">
          Vlaamsekaai · terras
        </text>
        <line x1={X(ROOM.line.x0)} x2={X(ROOM.line.x1)} y1={Z(ROOM.line.z)} y2={Z(ROOM.line.z)} stroke="#FFB547" strokeDasharray="3 5" strokeWidth="2" opacity="0.7" />
        <text x={X(ROOM.line.x0)} y={Z(ROOM.line.z) + 18} className="plan-label">
          De rij
        </text>
        {TABLES.map((t) => {
          const grp = byTable.get(t.id);
          const isApp = app === t.id && !grp;
          const color = grp ? PHASES[phaseOf(live.ev, grp, live.m)].color : isApp ? '#FFB547' : 'rgba(244,236,225,0.18)';
          const w = (t.shape === 'stool' ? 0.42 : t.w) * 46;
          const h = (t.shape === 'stool' ? 0.42 : t.d) * 46;
          const on = sel === t.id;
          return (
            <g key={t.id} className="plan-table" onClick={() => setSel(on ? null : t.id)}>
              {t.shape === 'round' || t.shape === 'stool' ? (
                <circle cx={X(t.x)} cy={Z(t.z)} r={w / 2} fill={grp || isApp ? color : 'transparent'} fillOpacity={grp || isApp ? 0.22 : 0} stroke={color} strokeWidth={on ? 2.5 : 1.4} />
              ) : (
                <rect x={X(t.x) - w / 2} y={Z(t.z) - h / 2} width={w} height={h} rx="4" fill={grp || isApp ? color : 'transparent'} fillOpacity={grp || isApp ? 0.22 : 0} stroke={color} strokeWidth={on ? 2.5 : 1.4} />
              )}
              <text x={X(t.x)} y={Z(t.z) + 3.5} textAnchor="middle" className="plan-id">
                {t.id}
              </text>
              {grp && (
                <text x={X(t.x)} y={Z(t.z) - (t.shape === 'stool' ? 14 : h / 2 + 6)} textAnchor="middle" className="plan-size">
                  {grp.size}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="legend">
        {(Object.keys(PHASES) as (keyof typeof PHASES)[]).map((p) => (
          <span key={p}>
            <i style={{ background: PHASES[p].color }} />
            {PHASES[p].label}
          </span>
        ))}
        <span>
          <i style={{ background: 'rgba(244,236,225,0.3)' }} />
          Vrij
        </span>
      </div>
      {selected && (
        <div className="plan-detail">
          <div className="nj-label">{AREAS[selected.area].label}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
            <strong>{selected.label}</strong>
            <span className="muted">{selected.seats} plaatsen</span>
          </div>
          {g ? (
            <p className="note" style={{ margin: '6px 0 0' }}>
              {g.name} · {g.size} pers. · {Math.round(live.m - (g.seated ?? live.m))} min aan tafel · {PHASES[phaseOf(live.ev, g, live.m)].label}
            </p>
          ) : (
            <p className="note" style={{ margin: '6px 0 0' }}>
              Vrij. {AREAS[selected.area].line}
            </p>
          )}
        </div>
      )}
    </Panel>
  );
}

function Forecast() {
  const live = useLive();
  const key = Math.floor(live.m / 5);
  const { steps, calm } = useMemo(() => waitForecast(live.ev, live.m), [key, live.ev]); // eslint-disable-line react-hooks/exhaustive-deps
  const max = Math.max(30, ...steps.map((s) => s.wait));
  return (
    <Panel kicker="Rest van de avond" title="Wachttijd per kwartier">
      {steps.length ? (
        <>
          <div className="forecast">
            {steps.map((s) => (
              <div className={`fc ${calm && s.minute === calm.minute ? 'calm' : ''}`} key={s.minute}>
                <div className="fc-bar">
                  <i style={{ height: `${Math.max(3, (s.wait / max) * 100)}%` }} />
                  <b style={{ height: `${s.occupancy * 100}%` }} />
                </div>
                <span className="mono">{hhmm(s.minute)}</span>
                <span className="mono fc-v">{s.wait}′</span>
              </div>
            ))}
          </div>
          <div className="legend">
            <span>
              <i style={{ background: '#FF6A2A' }} />
              Wachttijd (min)
            </span>
            <span>
              <i style={{ background: 'rgba(244,236,225,0.35)' }} />
              Bezetting
            </span>
          </div>
          {calm && (
            <div className="hl" style={{ marginTop: 14 }}>
              <div className="nj-label" style={{ color: 'var(--nj-amber)' }}>
                Rustigst
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
                <Num value={hhmm(calm.minute)} className="calm-time" />
                <span className="muted">±{calm.wait} min wachten</span>
              </div>
              <p className="note" style={{ margin: '6px 0 0' }}>
                Het moment om vaste gasten een bericht te sturen.
              </p>
            </div>
          )}
        </>
      ) : (
        <Empty>De keuken is dicht voor vanavond.</Empty>
      )}
    </Panel>
  );
}
