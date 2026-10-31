import { INTERIOR, MANIFESTO, PHILOSOPHY } from '@ninja/shared';

import { photo } from '../live';
import { Film, Kicker } from '../ui/ui';

const RULE_PHOTOS = ['room-menu', 'room-dips', 'gal-spit', 'gal-oven'];

export function Manifest() {
  return (
    <section className="w-sec manifest" id="manifest">
      <div className="w-wrap">
        <Kicker n="01">Manifest</Kicker>
        <div className="manifest-top">
          <div>
            <p className="manifest-text" data-reveal>
              {MANIFESTO}
            </p>
            <p className="manifest-source nj-label" data-reveal>
              Zo zegt Ninja het zelf
            </p>
          </div>
          <Film src={photo('flash-3')} alt="Een gast eet een durum aan de travertijnen tafel" className="manifest-portrait" ratio="2 / 3">
            <figcaption className="film-cap nj-mono">NINJA 400 · 3A</figcaption>
          </Film>
        </div>
      </div>

      <div className="manifest-band" data-parallax>
        <Film src={photo('room-table')} alt="Een tafel bij Ninja: Iskender, ezme en de uiensalade" className="manifest-hero" />
        <div className="manifest-quote" data-reveal>
          <span className="nj-serif">Een gastronomische ervaring in een snel tempo.</span>
        </div>
      </div>

      <div className="w-wrap">
        <div className="rules">
          <div className="rules-head" data-reveal>
            <h2 className="w-d2">
              Huisregels
            </h2>
            <p className="w-lede">Vier regels van de menukaart, zoals Ninja ze zelf opschrijft.</p>
          </div>
          <ol className="rules-list">
            {PHILOSOPHY.map((r, i) => (
              <li key={r.kicker} className="rule" data-reveal style={{ transitionDelay: `${i * 80}ms` }}>
                <Film src={photo(RULE_PHOTOS[i])} alt="" className="rule-photo" ratio="4 / 5" />
                <div className="rule-body">
                  <span className="rule-n nj-mono" translate="no">
                    {String(i + 1).padStart(2, '0')}/04
                  </span>
                  <h3 className="rule-k">{r.kicker}</h3>
                  <p className="rule-t">{r.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="room">
          <div className="room-copy" data-reveal>
            <span className="nj-label">De zaal</span>
            <ul className="room-list">
              {INTERIOR.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="room-source">Zo beschrijft Le Fooding de zaal aan de Vlaamsekaai.</p>
          </div>
          <div className="room-grid">
            <Film src={photo('room-counter')} alt="De toog met de steenoven en de knoflookstrengen" className="room-a" ratio="3 / 4" />
            <Film src={photo('gal-booth')} alt="Gasten op de leren banken" className="room-b" ratio="3 / 4" />
            <Film src={photo('gal-door')} alt="De deur aan de Vlaamsekaai" className="room-c" ratio="3 / 4" />
          </div>
        </div>
      </div>
    </section>
  );
}
