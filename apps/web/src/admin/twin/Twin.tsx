import {
  celsius,
  clock,
  CORE_TARGET,
  dishById,
  euro,
  formatNo,
  guestsAt,
  lineAt,
  passportOf,
  priceOf,
  STATUS_LABEL,
  tableById,
  tableGroupAt,
  takingsAt,
  TABLES,
  waitFor,
  AREAS,
  type Passport,
  type SpitId,
} from '@ninja/shared';
import type { Quality } from '@ninja/shared/three';
import { useEffect, useMemo, useRef, useState } from 'react';

import { appPassports, appTable, feed, hms, meatLabel, phaseOf, PHASES, platesByGroup, spitNow, tonight, type FeedItem } from '../derive';
import { readLive, useLive } from '../live';
import { Stage } from '../three/stage';
import { Kpi, Num, RankBadge, Seal, Segmented } from '../ui';
import { TwinScene, VIEWS, type ViewId } from './scene';

const railWidth = (w: number) => (w < 1100 ? 286 : w < 1366 ? 312 : 344) + 14;

export type GpuInfo = { backend: string; quality: Quality };

/** Live: the 3D twin of Ninja, full-bleed, with tonight's numbers, both spits and what just happened beside it. */
export function Twin({ active, quality, onGpu, register }: { active: boolean; quality: Quality | null; onGpu: (info: GpuInfo) => void; register: (scene: TwinScene | null) => void }) {
  const live = useLive();
  const host = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<TwinScene | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<ViewId>('overzicht');

  useEffect(() => {
    let alive = true;
    let scene: TwinScene | null = null;
    (async () => {
      try {
        const v = VIEWS.overzicht;
        const stage = await Stage.create(host.current!, {
          camera: v.camera,
          target: v.target,
          intro: [v.camera[0] - 7, v.camera[1] + 9, v.camera[2] + 9],
          fov: 32,
          minDistance: 2.2,
          maxDistance: 32,
          maxPolarAngle: 1.36,
          minAzimuthAngle: -1.25,
          maxAzimuthAngle: 1.25,
          bounds: { minX: -9, maxX: 10, minZ: -5, maxZ: 10, minY: 0, maxY: 3 },
          shift: (w) => railWidth(w) / 2,
          fitAspect: 1.18,
          safeTop: () => document.querySelector('.topbar')?.getBoundingClientRect().bottom ?? 64,
          quality,
        });
        if (!alive) {
          stage.dispose();
          return;
        }
        scene = new TwinScene(stage);
        scene.onSelect = (id) => setSelected(id);
        sceneRef.current = scene;
        register(scene);
        scene.sync(readLive());
        stage.buildPipeline();
        onGpu({ backend: stage.gpuLabel, quality: stage.quality });
        stage.onFirstFrame = () => {
          setReady(true);
          (window as unknown as { __twinReady?: number }).__twinReady = performance.now();
        };
        await stage.warm();
        stage.start();
      } catch (e) {
        console.error(e);
        setFailed(true);
      }
    })();
    return () => {
      alive = false;
      register(null);
      scene?.dispose();
      sceneRef.current = null;
    };
    // The stage lives as long as the panel; quality changes go through setQuality.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    sceneRef.current?.sync(live);
  }, [live]);

  // Escape closes the drawer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') sceneRef.current?.select(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Labels step aside for the drawer as they do for the rail.
  useEffect(() => {
    const s = sceneRef.current as unknown as { stage?: Stage } | null;
    if (s?.stage) s.stage.coverStart = selected ? (window.innerWidth < 1100 ? 358 : 400) : 0;
  }, [selected]);

  useEffect(() => {
    const s = sceneRef.current;
    if (s) (s as unknown as { stage: Stage }).stage.active = active;
  }, [active, ready]);

  const fly = (v: ViewId) => {
    setView(v);
    sceneRef.current?.fly(v);
  };

  return (
    <div className="view" hidden={!active} style={{ paddingTop: 0 }}>
      <div className="twin-host" ref={host} />
      <div className={`veil ${ready ? 'gone' : ''}`}>
        <div className="veil-inner">
          {failed ? (
            <p className="nogpu">Deze browser kan geen 3D tekenen. De andere tabbladen werken gewoon.</p>
          ) : (
            <>
              <Seal size={58} />
              <div className="nj-label">Ninja wordt opgebouwd</div>
              <div className="veil-line" />
            </>
          )}
        </div>
      </div>
      <Legend />
      <div className="title-3d">
        <div className="nj-label">Het Zuid · Antwerpen</div>
        <h1>
          Vlaamsekaai <em>52</em>
        </h1>
      </div>
      <div className="presets glass">
        <Segmented label="Camera" value={view} onChange={fly} options={(Object.keys(VIEWS) as ViewId[]).map((id) => ({ id, label: VIEWS[id].label }))} />
      </div>
      <Rail />
      <TableDrawer
        id={selected}
        onClose={() => sceneRef.current?.select(null)}
        onFocus={(id) => sceneRef.current?.focus(id)}
      />
    </div>
  );
}

function Legend() {
  return (
    <div className="legend-3d glass">
      {(Object.keys(PHASES) as (keyof typeof PHASES)[]).map((p) => (
        <span key={p}>
          <i className="dot" style={{ background: PHASES[p].color, boxShadow: `0 0 8px ${PHASES[p].color}` }} />
          {PHASES[p].label}
        </span>
      ))}
      <span>
        <i className="dot" style={{ background: '#FF5B4D', boxShadow: '0 0 8px #FF5B4D' }} />
        Oproep
      </span>
      <span>
        <i className="dot" style={{ background: '#FF7A8A', boxShadow: '0 0 8px #FF7A8A' }} />
        Match
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------- rail

function Rail() {
  const live = useLive();
  const { ev, m } = live;
  const g = guestsAt(ev, m);
  const app = appTable(live);
  const take = takingsAt(ev, m);
  const appOrders = tonight(live, 'order').filter((o) => o.minute <= m);
  const appTotal = appOrders.reduce((s, o) => s + o.total, 0);
  const total = take.total + appTotal;
  const covers = take.covers + (appOrders.length ? 1 : 0);
  const wait = waitFor(ev, m);
  const line = lineAt(ev, m);
  return (
    <aside className="rail">
      <div className="glass rail-block">
        <div className="rail-head">
          <span className="nj-label">Vanavond</span>
          <span className="nj-serif">{live.clock.reason === 'live' ? 'live' : 'herhaling'}</span>
        </div>
        <div className="rail-kpis">
          <Kpi big label="Gasten binnen" value={g.seated + (app ? 1 : 0)} sub={`${g.tables + (app ? 1 : 0)} van ${TABLES.length} tafels bezet`} />
          <Kpi label="In de rij" value={line.length} unit={line.length === 1 ? 'groep' : 'groepen'} sub={`${g.linePeople} personen`} />
          <Kpi label="Wachttijd nu" value={wait} unit="min" tone={wait >= 30 ? 'ember' : undefined} sub={wait ? 'voor een groep van twee' : 'meteen een tafel'} />
          <Kpi label="Omzet tot nu" value={euro(total)} tone="ember" sub={`${covers} couverts`} />
          <Kpi label="Per gast" value={euro(covers ? total / covers : 0)} sub="gemiddeld vanavond" />
        </div>
      </div>
      <div className="glass rail-block">
        <div className="rail-head">
          <span className="nj-label">Spiezen</span>
          <span className="nj-label">Kern · korst · kg</span>
        </div>
        <div className="spits">
          <SpitMini spit="rund" />
          <SpitMini spit="kip" />
        </div>
      </div>
      <div className="glass feed-block">
        <div className="rail-head" style={{ paddingInlineEnd: 10 }}>
          <span className="nj-label">Net gebeurd</span>
          <span className="nj-live" />
        </div>
        <Feed />
      </div>
    </aside>
  );
}

function SpitMini({ spit }: { spit: SpitId }) {
  const live = useLive();
  const r = spitNow(live, spit);
  const minuteKey = Math.floor(live.m);
  const spark = useMemo(() => {
    const pts: number[] = [];
    for (let k = 30; k >= 0; k -= 1.5) pts.push(spitNowAt(live, spit, live.m - k));
    return pts;
    // A new line once a minute is plenty.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minuteKey, spit]);
  const min = Math.min(...spark, CORE_TARGET - 2);
  const max = Math.max(...spark, CORE_TARGET + 6);
  const path = spark.map((v, i) => `${(i / (spark.length - 1)) * 100},${24 - ((v - min) / (max - min)) * 22}`).join(' ');
  const targetY = 24 - ((CORE_TARGET - min) / (max - min)) * 22;
  return (
    <div className="spit-mini">
      <span className="nj-label">{spit === 'rund' ? 'Spies 1 · rund' : 'Spies 2 · kip'}</span>
      <Num value={r.core} unit="°C" digits={1} className={`core ${r.core >= CORE_TARGET ? 'hot' : ''}`} />
      <svg className="spark" viewBox="0 0 100 26" preserveAspectRatio="none">
        <line x1="0" x2="100" y1={targetY} y2={targetY} stroke="rgba(154,216,168,0.45)" strokeDasharray="2 2" strokeWidth="0.6" />
        <polyline points={path} fill="none" stroke="#FF6A2A" strokeWidth="1.3" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="row">
        <span>Korst</span>
        <Num value={r.crust} unit="°C" digits={0} />
      </div>
      <div className="row">
        <span>Over</span>
        <Num value={r.kg} unit="kg" digits={1} />
      </div>
      <div className="kg-bar">
        <i style={{ width: `${Math.max(3, (r.kg / r.kgStart) * 100)}%` }} />
      </div>
      <div className="row">
        <span className="faint">{STATUS_LABEL[r.status]}</span>
      </div>
    </div>
  );
}

const spitNowAt = (live: ReturnType<typeof useLive>, spit: SpitId, m: number) => spitNow({ ...live, m }, spit).core;

const FEED_ICON: Record<FeedItem['kind'], string> = {
  arrive: 'M4 12h12M12 6l6 6-6 6',
  seat: 'M5 11h14v3H5zM7 14v5M17 14v5',
  carve: 'M4 20L20 4M14 4h6v6',
  call: 'M12 3v4M5 9l3 2M19 9l-3 2M6 17a6 6 0 1112 0z',
  cay: 'M8 3h8l-1 5c-.4 2 1.6 3.6 1.6 6.5C16.6 18 14.6 21 12 21s-4.6-3-4.6-6.5C7.4 11.6 9.4 10 9 8z',
  flash: 'M13 2L5 14h6l-1 8 8-12h-6z',
  leave: 'M14 4h5v16h-5M10 8l-4 4 4 4M6 12h9',
  app: 'M8 2h8v20H8zM11 18h2',
  order: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
};

function Feed() {
  const live = useLive();
  const items = useMemo(() => feed(live, 24), [live]);
  return (
    <div className="feed">
      {items.map((it) => (
        <div className={`feed-item k-${it.kind}`} key={it.id}>
          <time>{hms(it.m)}</time>
          <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d={FEED_ICON[it.kind]} />
          </svg>
          <span>{it.text}</span>
        </div>
      ))}
    </div>
  );
}

// -------------------------------------------------------------------------------------------------------- drawer

function TableDrawer({ id, onClose, onFocus }: { id: string | null; onClose: () => void; onFocus: (id: string) => void }) {
  const live = useLive();
  const [last, setLast] = useState<string | null>(id);
  useEffect(() => {
    if (id) setLast(id);
  }, [id]);
  const shownId = id ?? last;
  const t = shownId ? tableById(shownId) : undefined;
  const g = shownId ? tableGroupAt(live.ev, shownId, live.m) : null;
  const app = appTable(live);
  const appHere = !!shownId && app === shownId;
  const appOrders = appHere ? tonight(live, 'order') : [];
  const passports: Passport[] = useMemo(() => {
    if (!shownId) return [];
    const list: Passport[] = [];
    if (g) for (const p of platesByGroup(live.ev).get(g.id) ?? []) if (p.carved <= live.m) list.push(passportOf(live.ev, p));
    for (const p of appPassports(live)) if (p.table === shownId && p.carved <= live.m + 0.5) list.push(p);
    return list.sort((a, b) => b.carved - a.carved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownId, g?.id, Math.floor(live.m * 4), live.bridge]);
  if (!t) return <aside className="drawer glass closed" aria-hidden />;
  const ordered = g && g.orderAt !== null && g.orderAt <= live.m;
  const lines = g && ordered ? g.orders : [];
  const total = lines.reduce((s, l) => s + priceOf(dishById(l.dish), l.portion, l.iskender) * l.qty, 0) + appOrders.reduce((s, o) => s + o.total, 0);
  const phase = g ? phaseOf(live.ev, g, live.m) : null;
  return (
    <aside className={`drawer glass ${id ? '' : 'closed'}`} aria-hidden={!id}>
      <div className="drawer-head">
        <div>
          <div className="nj-label" style={{ color: 'var(--nj-muted)' }}>
            {t.seats === 1 ? `${AREAS[t.area].label} · 1 plaats` : `${AREAS[t.area].label} · ${t.seats} plaatsen`}
          </div>
          <h2>{t.label}</h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn ghost small" onClick={() => onFocus(t.id)}>
            Inzoomen
          </button>
          <button type="button" className="x" aria-label="Sluiten" onClick={onClose}>
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </button>
        </div>
      </div>
      <div className="drawer-body">
        {g ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0 12px' }}>
              <span style={{ fontSize: 17, fontWeight: 600 }} translate="no">
                {g.name}
              </span>
              <RankBadge rank={g.rank} />
              {g.viaApp && <span className="demo-tag">Via de app</span>}
            </div>
            <div className="facts">
              <Kpi label="Gasten" value={g.size} />
              <Kpi label="Aan tafel" value={Math.max(0, Math.round(live.m - (g.seated ?? live.m)))} unit="min" sub={`sinds ${clock(new Date(live.day.getTime() + (g.seated ?? 0) * 60000))}`} />
              <Kpi label="Rekening" value={euro(total)} tone="ember" />
            </div>
            {phase && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--nj-soft)' }}>
                <i className="dot" style={{ background: PHASES[phase].color, boxShadow: `0 0 8px ${PHASES[phase].color}` }} />
                {PHASES[phase].label}
              </div>
            )}
            <div className="section-label nj-label">
              <span>Bestelling</span>
              {g.orderAt !== null && <span className="mono faint">{hms(g.orderAt)}</span>}
            </div>
            {lines.length ? (
              lines.map((l, i) => {
                const d = dishById(l.dish);
                return (
                  <div className="order-line" key={i}>
                    <span className="q">{l.qty}×</span>
                    <span className="d">
                      {d.name}
                      {(l.meat || l.portion === '1,5x' || l.iskender) && <small>{[meatLabel(l.meat), l.portion === '1,5x' ? '1,5 portie' : '', l.iskender ? 'met Iskender' : ''].filter(Boolean).join(' · ')}</small>}
                    </span>
                    <span className="p">{euro(priceOf(d, l.portion, l.iskender) * l.qty)}</span>
                  </div>
                );
              })
            ) : (
              <p className="note">Nog niet besteld.</p>
            )}
          </>
        ) : appHere ? (
          <div className="hl" style={{ marginTop: 8 }}>
            <div className="nj-label" style={{ color: 'var(--nj-amber)' }}>
              App-gast
            </div>
            <p className="note" style={{ margin: '6px 0 0' }}>
              Deze tafel is vergeven aan de gast die via de app in de rij stond.
            </p>
          </div>
        ) : (
          <p className="note" style={{ marginTop: 12 }}>
            Deze tafel is vrij. {AREAS[t.area].line}
          </p>
        )}
        {appOrders.length > 0 && (
          <>
            <div className="section-label nj-label">
              <span>Via de app</span>
            </div>
            {appOrders.map((o) =>
              o.items.map((l, i) => {
                const d = dishById(l.dish);
                return (
                  <div className="order-line" key={`${o.id}-${i}`}>
                    <span className="q">{l.qty}×</span>
                    <span className="d">
                      {d.name}
                      {l.meat && <small>{meatLabel(l.meat)}</small>}
                    </span>
                    <span className="p">{euro(priceOf(d, l.portion, l.iskender) * l.qty)}</span>
                  </div>
                );
              }),
            )}
          </>
        )}
        {(g || appHere) && (
          <div className="order-total">
            <span>Totaal</span>
            <Num value={euro(total)} />
          </div>
        )}
        {passports.length > 0 && (
          <>
            <div className="section-label nj-label">
              <span>Paspoorten van deze tafel</span>
              <span className="mono faint">{passports.length}</span>
            </div>
            {passports.map((p) => (
              <div className="pp-mini" key={p.no}>
                <Seal size={26} />
                <div>
                  <div className="no">No. {formatNo(p.no)}</div>
                  <small>
                    {p.dishName} · {hms(p.carved)} · {p.secondsToTable} s
                  </small>
                </div>
                <span className="deg">{celsius(p.core)}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </aside>
  );
}
