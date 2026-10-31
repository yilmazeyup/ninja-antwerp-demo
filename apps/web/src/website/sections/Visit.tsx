import { useState } from 'react';
import { dayLong, FAQ, isOpenAt, JOBS, NINJA, nextOpening, OPEN_DAYS, PARKING, tr, waitFor, weekdayLong, clock } from '@ninja/shared';

import { ZUID } from '../map/zuid';
import { useLive } from '../live';
import { Kicker } from '../ui/ui';

const DAYS = [2, 3, 4, 5, 6, 0, 1];
const sample = new Date(2026, 9, 25); // a Sunday: day i of the week is this + i

export function Visit() {
  const live = useLive();
  const open = isOpenAt(live.wall);
  const wait = waitFor(live.ev, live.minute);
  const today = live.wall.getDay();
  const next = nextOpening(live.wall);
  const [faq, setFaq] = useState<number | null>(1);

  return (
    <section className="w-sec visit" id="bezoek">
      <div className="w-wrap">
        <Kicker n="09">Bezoek</Kicker>
        <div className="visit-head">
          <h2 className="w-d1" data-reveal>
            Vlaamsekaai 52
          </h2>
          <p className="w-accent nj-serif" data-reveal>
            in het Zuid
          </p>
        </div>

        <div className="visit-grid">
          <div className="visit-info">
            <div className="walkin nj-leather" data-reveal>
              <span className="nj-label">Reserveren kan niet</span>
              <p className="walkin-big">Je kan gewoon langskomen.</p>
              <div className="walkin-now">
                <span className={`nj-live${open ? '' : ' is-off'}`} aria-hidden />
                {open ? (
                  <span>{wait > 0 ? tr('Nu open · ± {n} min wachten').replace('{n}', String(wait)) : tr('Nu open · geen wachttijd')}</span>
                ) : (
                  <span>{tr('Nu gesloten · we openen {day} om 15:00').replace('{day}', dayLong(next))}</span>
                )}
              </div>
              {!open && live.demo && (
                <p className="walkin-replay">
                  {wait > 0
                    ? tr('In de replay van de laatste avond: om {t} was het ± {n} min wachten.').replace('{t}', clock(live.now)).replace('{n}', String(wait))
                    : tr('In de replay van de laatste avond: om {t} kon je meteen binnen.').replace('{t}', clock(live.now))}
                </p>
              )}
              <a className="nj-btn" href="../app/rij">
                Schuif digitaal aan
              </a>
              <p className="walkin-note">Neem een plek in de rij met de app, en kom pas als je tafel klaarstaat.</p>
            </div>

            <dl className="facts" data-reveal>
              <div>
                <dt className="nj-label">Adres</dt>
                <dd>
                  <a href={NINJA.maps} target="_blank" rel="noreferrer">
                    {`${NINJA.street}, ${NINJA.postcode} ${NINJA.city}`}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="nj-label">Uren</dt>
                <dd>
                  <ul className="hours">
                    {DAYS.map((d) => {
                      const date = new Date(sample.getTime() + d * 86400000);
                      const isOpen = (OPEN_DAYS as readonly number[]).includes(d);
                      return (
                        <li key={d} className={d === today ? 'today' : ''}>
                          <span className="hours-day">{weekdayLong(date)}</span>
                          <span className="hours-t nj-mono">{isOpen ? '15:00 – 22:00' : tr('gesloten')}</span>
                        </li>
                      );
                    })}
                  </ul>
                </dd>
              </div>
              <div>
                <dt className="nj-label">Parkeren</dt>
                <dd>
                  <ul className="plain">
                    {PARKING.map((p) => (
                      <li key={p.name}>{`${p.name} · ${p.address}`}</li>
                    ))}
                  </ul>
                </dd>
              </div>
              <div>
                <dt className="nj-label">Tram</dt>
                <dd>Met de tram tot aan het Zuid, dan een paar minuten te voet langs de kaaien. Lijnen en haltes op delijn.be.</dd>
              </div>
              <div>
                <dt className="nj-label">Bellen of mailen</dt>
                <dd>
                  <a href={NINJA.phoneHref} dir="ltr">
                    {NINJA.phone}
                  </a>
                  <br />
                  <a href={`mailto:${NINJA.email}`}>{NINJA.email}</a>
                </dd>
              </div>
            </dl>
          </div>

          <figure className="zuid" data-reveal>
            <ZuidMap />
            <figcaption>
              <span className="nj-label">Het Zuid</span>
              <span className="zuid-credit">Kaartgegevens © OpenStreetMap-bijdragers</span>
            </figcaption>
          </figure>
        </div>

        <div className="faq-jobs">
          <div className="faq" data-reveal>
            <h3 className="w-d2">Vragen</h3>
            <ul>
              {FAQ.map((f, i) => (
                <li key={f.question} className={faq === i ? 'open' : ''}>
                  <button onClick={() => setFaq(faq === i ? null : i)} aria-expanded={faq === i}>
                    <span>{f.question}</span>
                    <span className="faq-plus" aria-hidden />
                  </button>
                  <p>{f.answer}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="jobs nj-leather" data-reveal>
            <span className="nj-label">Jobs</span>
            <h3 className="jobs-title">{JOBS.title}</h3>
            <p>{JOBS.text}</p>
            <a className="nj-btn bone" href={`mailto:${NINJA.email}?subject=${encodeURIComponent('Jobs')}`}>
              Mail je cv
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/** The streets around the door, drawn from OpenStreetMap: the Scheldt, the quays, the tram, the two car parks. */
function ZuidMap() {
  // A closer crop than the data: the quays, the two car parks and the door.
  const W = 600;
  const H = 500;
  const line = (l: number[]) => {
    let d = '';
    for (let i = 0; i < l.length; i += 2) d += `${i ? 'L' : 'M'}${l[i]},${l[i + 1]}`;
    return d;
  };
  const poly = (l: number[]) => `${line(l)}Z`;
  const P = ({ at, label, side }: { at: number[]; label: string; side: 'l' | 'r' }) => (
    <g className="zp" transform={`translate(${at[0]} ${at[1]})`}>
      <rect x="-17" y="-17" width="34" height="34" rx="8" />
      <text y="7" textAnchor="middle" className="zp-p">
        P
      </text>
      <text x={side === 'r' ? 28 : -28} y="6" textAnchor={side === 'r' ? 'start' : 'end'} className="zp-l">
        {label}
      </text>
    </g>
  );
  return (
    <svg direction="ltr" viewBox={`${-W} ${-H} ${W * 2} ${H * 2}`} role="img" aria-label={tr('Kaart van het Zuid rond de Vlaamsekaai')}>
      <rect x={-ZUID.halfW} y={-ZUID.halfH} width={ZUID.halfW * 2} height={ZUID.halfH * 2} className="z-bg" />
      {ZUID.water.map((l, i) => (
        <path key={`w${i}`} d={poly(l)} className="z-water" />
      ))}
      {ZUID.parks.map((l, i) => (
        <path key={`p${i}`} d={poly(l)} className="z-park" />
      ))}
      {ZUID.path.map((l, i) => (
        <path key={`f${i}`} d={line(l)} className="z-path" />
      ))}
      {ZUID.minor.map((l, i) => (
        <path key={`m${i}`} d={line(l)} className="z-minor" />
      ))}
      {ZUID.major.map((l, i) => (
        <path key={`M${i}`} d={line(l)} className="z-major" />
      ))}
      {ZUID.tram.map((l, i) => (
        <path key={`t${i}`} d={line(l)} className="z-tram" />
      ))}
      {ZUID.labels.map((l) => (
        <text key={l.name} transform={`translate(${l.x} ${l.y}) rotate(${l.angle})`} className={`z-label${l.name === 'Vlaamsekaai' ? ' main' : ''}`} textAnchor="middle" dy="-8">
          {l.name}
        </text>
      ))}
      <P at={ZUID.steendok} label="Steendok" side="l" />
      <P at={ZUID.kooldok} label="Kooldok" side="r" />
      <g className="z-ninja">
        <circle r="34" className="z-halo" />
        <circle r="13" className="z-pin" />
        <text y="5" textAnchor="middle" className="z-n nj-kanji">
          忍
        </text>
        <text x="26" y="-26" className="z-name">
          Ninja · 52
        </text>
      </g>
    </svg>
  );
}
