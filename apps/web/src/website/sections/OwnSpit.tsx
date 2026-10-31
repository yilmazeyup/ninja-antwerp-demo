import { duration, euro, SPIT_INCLUDES, SPIT_PACKAGES, SPIT_SLOTS, SPIT_STEPS } from '@ninja/shared';

import { photo } from '../live';
import { Film, Kicker } from '../ui/ui';

const before = (minutes: number) => (minutes === 0 ? 'De eerste snede' : `${duration(-minutes)} vooraf`);

export function OwnSpit() {
  return (
    <section className="w-sec own" id="eigen-spies">
      <div className="own-bg" aria-hidden>
        <img src={photo('gal-spit-wide')} alt="" loading="lazy" />
      </div>
      <div className="w-wrap">
        <Kicker n="07">Eigen spies</Kicker>
        <div className="own-head">
          <h2 className="w-d1" data-reveal>
            Jouw spies
          </h2>
          <p className="w-accent nj-serif" data-reveal>
            met je naam in messing
          </p>
        </div>
        <p className="w-lede" data-reveal>
          Een spies voor jullie alleen: met de hand gelegd, jullie naam erop, de hele dag live te volgen in de app, en aan tafel gesneden.
        </p>

        <div className="own-grid">
          <div className="plate-wrap" data-reveal>
            <div className="brass" aria-label="Een messing naamplaatje op de spies">
              <span className="brass-screw l" aria-hidden />
              <span className="brass-screw r" aria-hidden />
              <span className="brass-k">Ninja · Eigen spies</span>
              <span className="brass-name">De spies van Margaux</span>
              <span className="brass-sub nj-mono">12 gasten · 10 kg · zaterdag</span>
            </div>
            <Film src={photo('room-chef')} alt="De keuken: de spies voor het vuur, de witte hoofdband van de chef" className="own-photo" ratio="3 / 4" />
          </div>

          <div className="own-body">
            <div className="packs">
              {SPIT_PACKAGES.map((p) => (
                <article className="pack nj-leather" key={p.id} data-reveal>
                  <span className="proposal nj-label">Voorstel</span>
                  <h3 className="pack-name">{p.name}</h3>
                  <p className="pack-price">
                    <span className="nj-mono">{euro(p.perPerson)}</span>
                    <span className="nj-label">per persoon</span>
                  </p>
                  <p className="pack-meta nj-mono">{`${p.guests[0]}–${p.guests[1]} gasten · ${p.kg} kg`}</p>
                  <p className="pack-line">{p.line}</p>
                </article>
              ))}
            </div>

            <div className="own-cols">
              <div data-reveal>
                <h3 className="nj-label own-sub">Altijd inbegrepen</h3>
                <ul className="incl">
                  {SPIT_INCLUDES.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </div>
              <div data-reveal>
                <h3 className="nj-label own-sub">De dag van je spies</h3>
                <ol className="steps">
                  {SPIT_STEPS.map((s) => (
                    <li key={s.id}>
                      <span className="step-t nj-mono">{before(s.at)}</span>
                      <span className="step-title">{s.title}</span>
                      <span className="step-line">{s.line}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="slots" data-reveal>
              {SPIT_SLOTS.map((s) => (
                <div className="slot" key={s.id}>
                  <span className="slot-label">{s.label}</span>
                  <span className="slot-line nj-mono">{s.line}</span>
                </div>
              ))}
            </div>

            <div className="own-cta" data-reveal>
              <a className="nj-btn" href="../app/eigen-spies">
                Boek je spies in de app
              </a>
              <span className="own-note">Pakketten en prijzen zijn een voorstel voor Ninja.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
