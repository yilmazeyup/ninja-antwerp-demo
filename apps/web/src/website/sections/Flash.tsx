import { useEffect, useMemo, useState } from 'react';
import { eventsOf, WALL_SEED, type BridgeState } from '@ninja/shared';

import { grouped, photo, useBridge } from '../live';
import { Kicker } from '../ui/ui';

type Frame = { key: string; src: string; caption: string; guest?: boolean; passport?: number; likes?: number };

const SLIDER: Frame[] = ['flash-3', 'flash-1', 'flash-6', 'flash-2', 'flash-7', 'flash-4', 'flash-5'].map((k) => ({ key: k, src: photo(k), caption: 'Ninja, op film' }));
const GALLERY: Frame[] = WALL_SEED.map((w) => ({ key: w.photo, src: photo(w.photo), caption: w.caption, likes: w.likes }));

/** Guests' flash photos that the floor approved on the panel (the newest decision per photo counts). */
function approved(state: BridgeState): Frame[] {
  const verdict = new Map<string, boolean>();
  for (const w of eventsOf(state, 'wall')) verdict.set(w.ref, w.ok);
  return eventsOf(state, 'flash')
    .filter((f) => verdict.get(f.ref) === true && f.thumb)
    .reverse()
    .map((f) => ({ key: `guest-${f.id}`, src: f.thumb, caption: f.caption, guest: true, passport: f.passport }));
}

export function FlashWall() {
  const bridge = useBridge();
  const guests = useMemo(() => approved(bridge), [bridge]);
  const [open, setOpen] = useState<Frame | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [open]);

  const rows: { label: string; frames: Frame[] }[] = [
    { label: 'NINJA 400 · 01', frames: [...guests, ...SLIDER] },
    { label: 'NINJA 400 · 02', frames: GALLERY.slice(0, 6) },
    { label: 'NINJA 400 · 03', frames: GALLERY.slice(6) },
  ];

  let count = 0;
  return (
    <section className="w-sec flash" id="flash">
      <div className="w-wrap">
        <Kicker n="06">Flash</Kicker>
        <div className="flash-head">
          <h2 className="w-d1" data-reveal>
            Flash
          </h2>
          <p className="w-accent nj-serif" data-reveal>
            de avond, op film
          </p>
        </div>
        <p className="w-lede" data-reveal>
          Ninja's eigen flitsfoto's, en die van gasten met de Flash-camera in de app: met de live waarden van hun bord erop, op de muur zodra de zaal ze goedkeurt.
        </p>
      </div>

      <div className="sheet" data-reveal data-parallax>
        {rows.map((row) => (
          <div className="strip" key={row.label}>
            <div className="strip-edge top" aria-hidden>
              <span className="nj-mono">{row.label}</span>
            </div>
            <div className="strip-frames">
              {row.frames.map((f) => {
                count += 1;
                const n = count;
                return (
                  <button key={f.key} className={`frame${f.guest ? ' guest' : ''}`} onClick={() => setOpen(f)} aria-label={f.caption}>
                    <img src={f.src} alt="" loading="lazy" decoding="async" />
                    <span className="frame-n nj-mono" aria-hidden>
                      {`${n}A`}
                    </span>
                    {f.guest && <span className="frame-guest nj-label">Gast · via de app</span>}
                  </button>
                );
              })}
              {row.label.endsWith('01') && guests.length === 0 && (
                <a className="frame frame-empty" href="../app/flash">
                  <span className="nj-label">Jouw foto hier</span>
                  <span className="frame-empty-t">Neem een flitsfoto in de app. Na goedkeuring van de zaal hangt ze op de muur, binnen en hier.</span>
                </a>
              )}
            </div>
            <div className="strip-edge bottom" aria-hidden>
              <span className="nj-mono">◀ 400 ▶</span>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={open.caption} onClick={() => setOpen(null)}>
          <figure className="lightbox-fig nj-grain" onClick={(e) => e.stopPropagation()}>
            <img src={open.src} alt={open.caption} />
            <figcaption>
              <span className="lb-cap">{open.caption}</span>
              {open.guest && <span className="nj-label">Gast · goedgekeurd door de zaal</span>}
              {open.passport ? (
                <a className="nj-label lb-pp" href={`#paspoort-${open.passport}`} onClick={() => setOpen(null)}>
                  {`Paspoort No. ${grouped(open.passport)}`}
                </a>
              ) : null}
              {open.likes ? <span className="lb-likes nj-mono">{`♥ ${open.likes}`}</span> : null}
            </figcaption>
            <button className="lb-close" onClick={() => setOpen(null)} aria-label="Sluiten">
              ×
            </button>
          </figure>
        </div>
      )}
    </section>
  );
}
