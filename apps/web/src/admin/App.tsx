import { dayLong, getLocale, LOCALE_NAMES, LOCALES, type Locale } from '@ninja/shared';
import type { Quality } from '@ninja/shared/three';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { asset } from '../common/install';
import { chooseLocale } from '../i18n/install';
import { cays, openCalls, spitPlatesOf, tonight } from './derive';
import { LiveContext, useHeartbeat, useLiveState, type Live } from './live';
import { Cijfers } from './tabs/Cijfers';
import { Club } from './tabs/Club';
import { Match } from './tabs/Match';
import { Pas } from './tabs/Pas';
import { Paspoorten } from './tabs/Paspoorten';
import { Rij } from './tabs/Rij';
import { Vuur } from './tabs/Vuur';
import type { TwinScene } from './twin/scene';
import { Twin, type GpuInfo } from './twin/Twin';
import { Segmented } from './ui';

export type TabId = 'live' | 'vuur' | 'rij' | 'pas' | 'paspoorten' | 'match' | 'club' | 'cijfers';

const TABS: { id: TabId; label: string }[] = [
  { id: 'live', label: 'Live' },
  { id: 'vuur', label: 'Vuur' },
  { id: 'rij', label: 'Rij & tafels' },
  { id: 'pas', label: 'Pas' },
  { id: 'paspoorten', label: 'Paspoorten & herkomst' },
  { id: 'match', label: 'Match & Wall' },
  { id: 'club', label: 'Club' },
  { id: 'cijfers', label: 'Cijfers' },
];

const QUALITY_KEY = 'ninja-admin-quality';
const storedQuality = (): Quality | null => {
  try {
    const q = localStorage.getItem(QUALITY_KEY);
    return q === 'low' || q === 'medium' || q === 'high' ? q : null;
  } catch {
    return null;
  }
};

const tabFromHash = (): TabId => {
  const h = location.hash.replace('#', '') as TabId;
  return TABS.some((t) => t.id === h) ? h : 'live';
};

export function App() {
  const live = useLiveState();
  useHeartbeat();
  const [tab, setTab] = useState<TabId>(tabFromHash);
  const [gpu, setGpu] = useState<GpuInfo | null>(null);
  const sceneRef = useRef<TwinScene | null>(null);

  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = (id: TabId) => {
    setTab(id);
    history.replaceState(null, '', `${location.pathname}${location.search}${id === 'live' ? '' : `#${id}`}`);
  };

  const setQuality = useCallback(async (q: Quality) => {
    try {
      localStorage.setItem(QUALITY_KEY, q);
    } catch {
      // Not remembered in a private window; it still applies now.
    }
    const scene = sceneRef.current as unknown as { stage?: { setQuality(q: Quality): Promise<void>; warm(): Promise<void>; gpuLabel: string } } | null;
    if (scene?.stage) {
      await scene.stage.setQuality(q);
      setGpu({ backend: scene.stage.gpuLabel, quality: q });
      void scene.stage.warm();
    }
  }, []);

  return (
    <LiveContext.Provider value={live}>
      <TopBar live={live} tab={tab} go={go} gpu={gpu} setQuality={setQuality} />
      <Twin active={tab === 'live'} quality={storedQuality()} onGpu={setGpu} register={(s) => (sceneRef.current = s)} />
      <Page show={tab === 'vuur'}>
        <Vuur />
      </Page>
      <Page show={tab === 'rij'}>
        <Rij />
      </Page>
      <Page show={tab === 'pas'}>
        <Pas />
      </Page>
      <Page show={tab === 'paspoorten'}>
        <Paspoorten />
      </Page>
      <Page show={tab === 'match'}>
        <Match />
      </Page>
      <Page show={tab === 'club'}>
        <Club />
      </Page>
      <Page show={tab === 'cijfers'}>
        <Cijfers />
      </Page>
    </LiveContext.Provider>
  );
}

/** A tab's page: rendered only while it shows, so the hidden ones cost nothing. */
function Page({ show, children }: { show: boolean; children: ReactNode }) {
  if (!show) return null;
  return (
    <div className="view">
      <div className="page">{children}</div>
    </div>
  );
}

function TopBar({ live, tab, go, gpu, setQuality }: { live: Live; tab: TabId; go: (id: TabId) => void; gpu: GpuInfo | null; setQuality: (q: Quality) => void }) {
  const hh = String(live.now.getHours()).padStart(2, '0');
  const mm = String(live.now.getMinutes()).padStart(2, '0');
  const ss = String(live.now.getSeconds()).padStart(2, '0');
  const counts: Partial<Record<TabId, number>> = {};
  const carved = new Set(tonight(live, 'carve').map((c) => c.ref));
  const toCarve = tonight(live, 'order').reduce((n, o) => n + spitPlatesOf(o).filter((p) => !carved.has(p.ref)).length, 0);
  const appCalls = openCalls(live).filter((c) => c.app).length;
  if (toCarve + appCalls) counts.pas = toCarve + appCalls;
  const judged = new Set(tonight(live, 'wall').map((w) => w.ref));
  const photos = tonight(live, 'flash').filter((f) => !judged.has(f.ref)).length;
  const drinks = cays(live).filter((c) => c.app && c.done === null).length;
  if (photos + drinks) counts.match = photos + drinks;
  const lineJoin = tonight(live, 'line-join').at(-1);
  if (lineJoin && !tonight(live, 'line-seat').some((s) => s.ref === lineJoin.ref) && !tonight(live, 'line-leave').some((s) => s.ref === lineJoin.ref)) counts.rij = 1;

  return (
    <header className="topbar">
      <div className="brand">
        <img src={asset('brand/logo.png')} alt="Ninja" />
        <div className="house">
          <div className="nj-label">Huis</div>
          <small>Vlaamsekaai 52 · Antwerpen</small>
        </div>
      </div>
      <nav className="tabs" aria-label="Tabbladen">
        {TABS.map((t) => (
          <button type="button" key={t.id} className={`tab ${t.id === tab ? 'on' : ''}`} onClick={() => go(t.id)} aria-current={t.id === tab ? 'page' : undefined}>
            {t.label}
            {counts[t.id] ? <span className="count">{counts[t.id]}</span> : null}
          </button>
        ))}
      </nav>
      <div className="status">
        {live.clock.reason === 'live' ? (
          <span className="badge live">
            <span className="nj-live" />
            Live
          </span>
        ) : (
          <span className="badge replay" title={live.clock.reason === 'set' ? 'Een gekozen moment: het panel speelt de avond vanaf daar af.' : 'Ninja is nu gesloten: het panel speelt de laatste avond opnieuw af.'}>
            Herhaling · {dayLong(live.day)}
          </span>
        )}
        <div className="clock">
          <span className="time nj-mono" translate="no">
            {hh}:{mm}
            <span className="sec">:{ss}</span>
          </span>
          <small>Antwerpen · {dayLong(live.day)}</small>
        </div>
        <select className="select" aria-label="Taal" value={getLocale()} onChange={(e) => chooseLocale(e.target.value as Locale)} translate="no">
          {LOCALES.map((l) => (
            <option key={l} value={l} translate="no">
              {LOCALE_NAMES[l]}
            </option>
          ))}
        </select>
        <Segmented
          label="Kwaliteit"
          value={gpu?.quality ?? 'high'}
          onChange={setQuality}
          options={[
            { id: 'high', label: 'Hoog' },
            { id: 'medium', label: 'Midden' },
            { id: 'low', label: 'Laag' },
          ]}
        />
        {gpu && (
          <span className="badge gpu" translate="no" title="De 3D tekent met three.js WebGPURenderer">
            {gpu.backend}
          </span>
        )}
      </div>
    </header>
  );
}
