import { dishById, emit, INTENTS, matchTonight, spitAt, WALL_SEED, celsius } from '@ninja/shared';

import { asset } from '../../common/install';
import { cays, hms, tableLabel, tonight } from '../derive';
import { useLive } from '../live';
import { Empty, Kpi, Panel } from '../ui';
import { PageHead } from './common';

/** Match & Wall: drinks sent across the room, who has Match on tonight, and the flash photos for the screen. */
export function Match() {
  return (
    <>
      <PageHead
        kicker="Het sociale leven van de zaal"
        title={
          <>
            Match <em>&amp;</em> Wall
          </>
        }
        sub="Een çay naar een andere tafel, wie Match aan heeft, en de flitsfoto's die op het scherm in de zaal komen. Alles verdwijnt bij sluitingstijd."
      />
      <div className="grid match-grid">
        <Drinks />
        <Tonight />
      </div>
      <Wall />
    </>
  );
}

function Drinks() {
  const live = useLive();
  const list = cays(live).sort((a, b) => (a.done === null ? 0 : 1) - (b.done === null ? 0 : 1) || b.at - a.at);
  const open = list.filter((c) => c.done === null);
  return (
    <Panel kicker="Bar · Seppe" title={open.length === 1 ? '1 drankje te brengen' : open.length ? `${open.length} drankjes te brengen` : 'Alles gebracht'}>
      {list.length ? (
        <div className="list">
          {list.slice(0, 12).map((c) => (
            <div className={`row-item drink-row ${c.done !== null ? 'done' : ''}`} key={c.id}>
              <span className="drink-ico" aria-hidden>
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <path d="M8 3h8l-1 5c-.4 2 1.6 3.6 1.6 6.5C16.6 18 14.6 21 12 21s-4.6-3-4.6-6.5C7.4 11.6 9.4 10 9 8z" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </span>
              <div>
                <span className="who">{dishById(c.dish).name}</span>
                <small>
                  {tableLabel(c.from)} → {tableLabel(c.to)} · {hms(c.at)}
                </small>
                {c.note && <small className="amber">“{c.note}”</small>}
              </div>
              {c.done !== null ? (
                <span className="ok-tag">Gebracht</span>
              ) : c.app ? (
                <button type="button" className="btn small" onClick={() => emit({ kind: 'cay-done', ref: c.id, by: 'Seppe' })}>
                  Gebracht
                </button>
              ) : (
                <span className="ok-tag warn">Onderweg</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Empty>Nog niemand heeft iets laten brengen.</Empty>
      )}
    </Panel>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2);
}

function Tonight() {
  const live = useLive();
  const list = matchTonight(live.ev, live.m);
  const likes = list.filter((t) => t.likesYou).length + tonight(live, 'match-like').length;
  const mutual = tonight(live, 'match-mutual').length + Math.floor(list.length / 3);
  const on = list.length + (tonight(live, 'match-on').length ? 1 : 0);
  return (
    <Panel kicker="Ninja Match · alleen binnen" title="Match vanavond" actions={<span className="demo-tag">Demo-personen</span>}>
      <div className="facts" style={{ marginTop: 0 }}>
        <Kpi label="Match aan" value={on} />
        <Kpi label="Likes" value={likes} />
        <Kpi label="Wederzijds" value={mutual} tone="ember" />
      </div>
      {list.length ? (
        <div className="persona-list">
          {list.map((t) => (
            <div className="persona" key={t.persona.id}>
              <span className="avatar" translate="no">
                {initials(t.persona.name)}
              </span>
              <div>
                <span className="who" translate="no">
                  {t.persona.name}, {t.persona.age}
                </span>
                <small>{t.persona.job}</small>
              </div>
              <span className="intent">{INTENTS[t.persona.intent].label}</span>
              <span className="mono">{t.table}</span>
            </div>
          ))}
        </div>
      ) : (
        <Empty>Nog niemand heeft Match aangezet.</Empty>
      )}
    </Panel>
  );
}

function Wall() {
  const live = useLive();
  const judged = new Map(tonight(live, 'wall').map((w) => [w.ref, w.ok]));
  const flashes = tonight(live, 'flash');
  const pending = flashes.filter((f) => !judged.has(f.ref));
  const approved = flashes.filter((f) => judged.get(f.ref) === true && f.thumb);
  const slides = [...approved.map((f) => ({ src: f.thumb, caption: f.caption || 'Flitsfoto van vanavond', likes: 0, guest: true })), ...WALL_SEED.map((w) => ({ src: asset(`photos/${w.photo}.webp`), caption: w.caption, likes: w.likes, guest: false }))];
  const slide = slides[Math.floor(live.now.getTime() / 7000) % slides.length];
  const r = spitAt(live.ev, 'rund', live.m);
  return (
    <div className="grid wall-grid" style={{ marginTop: 16 }}>
      <Panel kicker="Het scherm in de zaal" title="Nu op de Wall">
        <div className="screen nj-grain">
          <img key={slide.src.slice(0, 80)} src={slide.src} alt={slide.caption} />
          <div className="screen-over">
            <img className="screen-logo" src={asset('brand/logo.png')} alt="" />
            <div className="screen-live">
              <span className="nj-live" />
              <span className="mono">Spies 1 · {celsius(r.core)}</span>
            </div>
            <div className="screen-cap">
              <span className="nj-serif">{slide.caption}</span>
              {slide.guest ? (
                <span className="nj-label">Flits van een gast</span>
              ) : (
                <span className="mono likes">
                  <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden>
                    <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.4 4.5 6.9 4.5c2 0 3.6 1.1 5.1 3 1.5-1.9 3.1-3 5.1-3 3.5 0 5.5 3.5 4.2 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" fill="#FF7A8A" />
                  </svg>
                  {slide.likes}
                </span>
              )}
            </div>
          </div>
        </div>
      </Panel>
      <Panel kicker="Flitsfoto's van gasten" title={pending.length ? `${pending.length} te keuren` : 'Niets te keuren'}>
        {pending.length ? (
          <div className="flash-grid">
            {pending.map((f) => (
              <figure className="flash" key={f.ref}>
                {f.thumb ? <img src={f.thumb} alt={f.caption} /> : <div className="flash-empty">Geen voorbeeld</div>}
                <figcaption>{f.caption || 'Zonder bijschrift'}</figcaption>
                <div className="flash-actions">
                  <button type="button" className="btn small" onClick={() => emit({ kind: 'wall', ref: f.ref, ok: true })}>
                    Op de Wall
                  </button>
                  <button type="button" className="btn ghost small" onClick={() => emit({ kind: 'wall', ref: f.ref, ok: false })}>
                    Weigeren
                  </button>
                </div>
              </figure>
            ))}
          </div>
        ) : (
          <Empty>Flitsfoto's uit de app verschijnen hier, eerst ter goedkeuring.</Empty>
        )}
        <div className="section-label nj-label" style={{ marginTop: 18 }}>
          <span>Ninja's eigen foto's op de Wall</span>
          <span className="mono faint">{WALL_SEED.length}</span>
        </div>
        <div className="seed-grid">
          {WALL_SEED.map((w) => (
            <figure className="seed nj-grain" key={w.photo}>
              <img src={asset(`photos/${w.photo}.webp`)} alt={w.caption} loading="lazy" />
              <figcaption>{w.caption}</figcaption>
            </figure>
          ))}
        </div>
      </Panel>
    </div>
  );
}
