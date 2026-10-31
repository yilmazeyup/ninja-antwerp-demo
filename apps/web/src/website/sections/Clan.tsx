import { dayShort, clock, dropsAt, dropState, euro, RANKS, tr } from '@ninja/shared';

import { photo, until, useLive } from '../live';
import { Kicker } from '../ui/ui';

const STATE_LABEL = { binnenkort: 'Binnenkort', vroeg: 'Vroege toegang', live: 'Live', uitverkocht: 'Uitverkocht' } as const;

export function Clan() {
  const live = useLive();
  const now = live.now;
  const drops = dropsAt(now);

  return (
    <section className="w-sec clan" id="clan">
      <div className="w-wrap">
        <Kicker n="08">Clan & drops</Kicker>
        <div className="clan-head">
          <h2 className="w-d1" data-reveal>
            De clan
          </h2>
          <p className="w-accent nj-serif" data-reveal>
            wie eerst komt, wordt gezien
          </p>
        </div>
        <p className="w-lede" data-reveal>
          Rangen, verdiend met bezoeken. Hoe hoger, hoe korter de rij en hoe vroeger je bij een drop bent. Kage is alleen op uitnodiging.
        </p>

        <ol className="ranks">
          {RANKS.map((r, i) => (
            <li key={r.id} className={`rank rank-${r.id}`} data-reveal style={{ transitionDelay: `${i * 80}ms` }}>
              <span className="rank-kanji nj-kanji" aria-hidden translate="no">
                {r.kanji}
              </span>
              <div className="rank-body">
                <span className="nj-label rank-visits">{r.visits === null ? 'Op uitnodiging' : r.visits === 1 ? 'Vanaf je eerste bezoek' : `Vanaf ${r.visits} bezoeken`}</span>
                <h3 className="rank-name" translate="no">
                  {r.name}
                </h3>
                <p className="rank-line">{r.line}</p>
                <ul className="rank-perks">
                  {r.perks.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>

        <div className="drops-head" data-reveal>
          <h3 className="w-d2">Drops</h3>
          <p className="w-lede small">Een gerecht of een stuk merch, één keer, in een beperkt aantal. Jōnin en Kage zien elke drop een uur eerder, Chūnin een kwartier.</p>
        </div>
        <div className="drops">
          {drops.map((d) => {
            const state = dropState(d, now);
            const ms = d.opens.getTime() - now.getTime();
            const share = d.left / d.stock;
            return (
              <article key={d.id} className={`drop is-${state}`} data-reveal>
                <div className="drop-photo nj-grain">
                  <img src={photo(d.photo)} alt="" loading="lazy" />
                  <span className={`drop-state nj-label s-${state}`}>{STATE_LABEL[state]}</span>
                </div>
                <div className="drop-body">
                  <span className="nj-label">{d.kind === 'gerecht' ? 'Gerecht' : 'Merch'}</span>
                  <h4 className="drop-name">{d.name}</h4>
                  <p className="drop-line">{d.line}</p>
                  {d.real && <p className="drop-real">{`Echt: ${d.real}.`}</p>}
                  <div className="drop-meta">
                    <span className="drop-price nj-mono">{euro(d.price)}</span>
                    {state === 'binnenkort' || state === 'vroeg' ? (
                      <span className="drop-count">
                        <span className="nj-label">{tr('Opent {day} om {t}').replace('{day}', dayShort(d.opens)).replace('{t}', clock(d.opens))}</span>
                        <span className="nj-mono drop-timer" dir="ltr">
                          {until(ms)}
                        </span>
                      </span>
                    ) : (
                      <span className="drop-count">
                        <span className="nj-label">{state === 'live' ? tr('Nog {n} van {m}').replace('{n}', String(d.left)).replace('{m}', String(d.stock)) : tr('Alle {m} weg').replace('{m}', String(d.stock))}</span>
                      </span>
                    )}
                  </div>
                  <span className="stock" aria-hidden>
                    <span style={{ width: `${Math.round(share * 100)}%` }} />
                  </span>
                </div>
              </article>
            );
          })}
        </div>
        <div className="clan-cta" data-reveal>
          <a className="nj-btn" href="../app/clan">
            Word lid in de app
          </a>
          <a className="nj-btn ghost" href="../app/drops">
            Naar de drops
          </a>
          <span className="own-note">Rangen, drops en de prijzen van nieuwe producten zijn een voorstel voor Ninja.</span>
        </div>
      </div>
    </section>
  );
}
