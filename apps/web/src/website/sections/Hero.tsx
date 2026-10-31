import { useEffect, useRef, useState } from 'react';
import { CLOSES, dayShort, guestsAt, isOpenAt, nextOpening, platesBy, spitAt, STATUS_LABEL, tr, waitFor, clock, dayLong, type SpitReading } from '@ninja/shared';

import { deg, grouped, useInView, useLive, useReducedMotion } from '../live';
import type { HeroScene } from '../scenes/hero';

const LOGO = `${import.meta.env.BASE_URL}brand/logo.png`;
const MASK = `${import.meta.env.BASE_URL}brand/logo-mask.png`;

export function Hero() {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const scene = useRef<HeroScene | null>(null);
  const reduced = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const visible = useInView(section, { repeat: true });

  useEffect(() => {
    let cancelled = false;
    const host = stage.current;
    if (!host) return;
    import('../scenes/hero')
      .then(({ createHeroScene }) => createHeroScene(host, { maskUrl: MASK, reduced, onReady: () => !cancelled && setReady(true) }))
      .then((s) => {
        if (cancelled) s.dispose();
        else {
          scene.current = s;
          (window as unknown as { __hero?: string }).__hero = `${s.backend}/${s.quality}`;
        }
      })
      .catch((e) => {
        console.warn('3D unavailable, showing the flat logo', e);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      scene.current?.dispose();
      scene.current = null;
    };
  }, [reduced]);

  useEffect(() => scene.current?.setActive(visible), [visible, ready]);

  useEffect(() => {
    const onScroll = () => {
      const el = section.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      scene.current?.setScroll(Math.min(1, Math.max(0, -r.top / Math.max(1, r.height))));
    };
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, []);

  const onPointer = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    scene.current?.setPointer(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
  };

  return (
    <section className="hero" id="top" ref={section} onPointerMove={onPointer} onPointerLeave={() => scene.current?.setPointer(0, 0)}>
      <div className={`hero-stage${ready ? ' is-ready' : ''}${failed ? ' is-flat' : ''}`} ref={stage} aria-hidden>
        <img className="hero-flat" src={LOGO} alt="" />
      </div>
      <div className="hero-shade" aria-hidden />
      <div className="hero-copy w-wrap">
        <h1 className="sr-only">Ninja Antwerp · Authentic Kebab &amp; Grill in Antwerp</h1>
        <p className="hero-tag" translate="no">
          Authentic Kebab &amp; Grill in Antwerp
        </p>
        <p className="hero-line nj-serif">Van de spies, boven open eikenvuur. Aan de Vlaamsekaai, in het Zuid.</p>
        <div className="hero-cta">
          <a className="nj-btn" href="../app/rij">
            Schuif digitaal aan
          </a>
          <a className="nj-btn ghost" href="#vuur">
            Bekijk het vuur
          </a>
        </div>
      </div>
      <Ticker />
    </section>
  );
}

function Ticker() {
  const live = useLive();
  const { ev, minute } = live;
  const rund = spitAt(ev, 'rund', minute);
  const kip = spitAt(ev, 'kip', minute);
  const carved = platesBy(ev, minute).length;
  const lastNo = ev.firstNo + Math.max(0, carved - 1);
  const open = isOpenAt(live.wall);
  const guests = guestsAt(ev, minute);
  const wait = waitFor(ev, minute);
  const next = nextOpening(live.wall);
  const since = (r: SpitReading) => (r.lastCut < 120 ? tr('{n} s geleden').replace('{n}', String(r.lastCut)) : tr('{n} min geleden').replace('{n}', String(Math.round(r.lastCut / 60))));

  const items: [string, string][] = [
    [tr('Spies 1 · kern'), deg(rund.core)],
    [tr('Korst'), deg(rund.crust, 0)],
    [tr('Vuur'), deg(rund.fire, 0)],
    [tr('Laatste snede'), since(rund)],
    [tr('Status'), tr(STATUS_LABEL[rund.status])],
    [tr('Spies 2 · kip'), deg(kip.core)],
    [tr('Borden sinds 2024'), grouped(lastNo - 100000 + 1)],
    [tr('Binnen'), tr('{n} gasten').replace('{n}', String(guests.seated))],
    [tr('Wachttijd'), wait > 0 ? tr('± {n} min').replace('{n}', String(wait)) : tr('geen')],
  ];
  const status = open
    ? tr('Open tot {t}').replace('{t}', `${String(Math.floor(CLOSES / 60)).padStart(2, '0')}:00`)
    : tr('Gesloten · opent {day} om 15:00').replace('{day}', dayLong(next));

  const row = (copy: number) => (
    <div className="tk-run" aria-hidden={copy > 0 || undefined} key={copy}>
      <span className="tk-item tk-open">
        <span className="tk-k">{status}</span>
      </span>
      {items.map(([k, v]) => (
        <span className="tk-item" key={k}>
          <span className="tk-k">{k}</span>
          <span className="tk-v nj-mono" dir="ltr" translate="no">
            {v}
          </span>
        </span>
      ))}
    </div>
  );

  return (
    <div className="ticker" role="status" aria-live="off">
      <div className="tk-badge">
        <span className={`nj-live${live.demo ? ' is-replay' : ''}`} aria-hidden />
        <span className="tk-badge-k">{live.reason === 'set' ? tr('Demo') : live.demo ? tr('Replay') : tr('Live')}</span>
        <span className="tk-badge-v nj-mono" dir="ltr" translate="no">
          {live.demo ? `${dayShort(live.now)} · ` : ''}
          {clock(live.now)}:{String(live.now.getSeconds()).padStart(2, '0')}
        </span>
      </div>
      <div className="tk-track" title={live.demo ? tr('Ninja is nu gesloten: je ziet een herhaling van de laatste avond, op echte snelheid.') : tr('Live uit de keuken, elke seconde.')}>
        <div className="tk-move">{[0, 1].map(row)}</div>
      </div>
    </div>
  );
}
