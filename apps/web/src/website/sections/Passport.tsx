import { useEffect, useMemo, useRef, useState } from 'react';
import { clockSeconds, COUNTRY_NAMES, dayLong, dayOfPassport, findAnyPassport, platesBy, tr, type Passport } from '@ninja/shared';

import { deg, grouped, useBridge, useLive } from '../live';
import { Kicker, Seal } from '../ui/ui';

const HASH = /^#paspoort-(\d{5,7})$/;

/** A guilloche rosette, as on banknotes and certificates, drawn once as an SVG background. */
const GUILLOCHE = (() => {
  const paths: string[] = [];
  for (let k = 0; k < 7; k++) {
    const R = 150 + k * 11;
    const r = 14 + k * 1.6;
    const petals = 36;
    let d = '';
    for (let i = 0; i <= 1440; i++) {
      const t = (i / 1440) * Math.PI * 2;
      const rad = R + r * Math.sin(petals * t + k * 0.45) + 6 * Math.sin(5 * t + k);
      d += `${i ? 'L' : 'M'}${(200 + rad * Math.cos(t)).toFixed(1)},${(200 + rad * Math.sin(t)).toFixed(1)}`;
    }
    paths.push(`<path d="${d}" fill="none" stroke="%237B151A" stroke-width="0.45" opacity="${(0.55 - k * 0.05).toFixed(2)}"/>`);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">${paths.join('')}</svg>`;
  return `url("data:image/svg+xml;utf8,${svg.replace(/"/g, "'").replace(/</g, '%3C').replace(/>/g, '%3E')}")`;
})();

export function PassportSection() {
  const live = useLive();
  const bridge = useBridge();
  const tonight = useMemo(() => {
    const carved = platesBy(live.ev, live.minute).length;
    return live.ev.firstNo + Math.max(0, carved - 1);
    // Only when the evening changes: the field keeps what the guest typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live.ev.key]);
  const fromHash = () => {
    const m = HASH.exec(typeof location === 'undefined' ? '' : location.hash);
    return m ? Number(m[1]) : null;
  };
  const [no, setNo] = useState<number>(() => fromHash() ?? tonight);
  const [input, setInput] = useState<string>(() => grouped(fromHash() ?? tonight));
  const [note, setNote] = useState<string | null>(null);
  const section = useRef<HTMLElement>(null);

  const passport: Passport | null = useMemo(() => findAnyPassport(no, live.now, bridge), [no, bridge, live.now.getDate()]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // A shared link lands on the card itself (on a phone it sits below the lookup).
    const reveal = (n: number, smooth: boolean) => {
      const card = document.getElementById(`paspoort-${n}`) ?? section.current;
      card?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
    };
    const onHash = () => {
      const n = fromHash();
      if (n) {
        setNo(n);
        setInput(grouped(n));
        setTimeout(() => reveal(n, true), 60);
      }
    };
    const first = fromHash();
    if (first) setTimeout(() => reveal(first, false), 500);
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);

  const show = (n: number) => {
    setNo(n);
    setInput(grouped(n));
    setNote(null);
    history.replaceState(null, '', `#paspoort-${n}`);
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(input.replace(/\D/g, ''));
    if (n) show(n);
  };
  const share = async () => {
    const url = `${location.origin}${location.pathname}#paspoort-${no}`;
    const title = tr('Mijn paspoort bij Ninja: No. {n}').replace('{n}', grouped(no));
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        setNote(tr('Link gekopieerd'));
      }
    } catch {
      // The guest closed the share sheet.
    }
  };

  return (
    <section className="w-sec passport" id="paspoort" ref={section}>
      <div className="w-wrap">
        <Kicker n="05">Paspoort</Kicker>
        <div className="origin-head">
          <h2 className="w-d1" data-reveal>
            Paspoort
          </h2>
          <p className="w-accent nj-serif" data-reveal>
            van elk bord
          </p>
        </div>
      </div>
      <div className="w-wrap passport-grid">
        <div className="passport-intro">
          <p className="w-lede" data-reveal>
            Elk bord van de spies krijgt een nummer: de seconde van de snede, de temperatuur in de plak en aan tafel, en waar alles op je bord vandaan komt.
          </p>
          <form className="lookup" onSubmit={submit} data-reveal>
            <label className="nj-label" htmlFor="pp-no">
              Zoek je nummer
            </label>
            <div className="lookup-row" dir="ltr">
              <span className="lookup-no nj-mono" aria-hidden>
                No.
              </span>
              <input id="pp-no" className="nj-mono" inputMode="numeric" autoComplete="off" value={input} onChange={(e) => setInput(e.target.value)} />
              <button className="nj-btn" type="submit">
                Toon
              </button>
            </div>
            <p className="lookup-hint">Het nummer staat op het kaartje bij je bord en in de app. Vooraf ingevuld: een bord dat vanavond gesneden werd.</p>
          </form>
          <div className="lookup-step">
            <button className="nj-btn ghost" onClick={() => show(no - 1)} aria-label="Vorig bord">
              ← Vorig bord
            </button>
            <button className="nj-btn ghost" onClick={() => show(no + 1)} aria-label="Volgend bord">
              Volgend bord →
            </button>
          </div>
        </div>

        <div className="passport-card-wrap" data-reveal>
          {passport ? (
            <PassportCard p={passport} onShare={share} note={note} />
          ) : (
            <div className="pp-missing nj-leather">
              <span className="nj-label">No. {grouped(no)}</span>
              <p>Dit nummer vinden we niet. Probeer een nummer van de laatste avonden.</p>
              <button className="nj-btn bone" onClick={() => show(tonight)}>
                Toon een bord van vanavond
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function PassportCard({ p, onShare, note }: { p: Passport; onShare: () => void; note: string | null }) {
  const day = dayOfPassport(p);
  return (
    <article className="pp" id={`paspoort-${p.no}`} style={{ ['--guilloche' as string]: GUILLOCHE }}>
      <div className="pp-frame">
        <header className="pp-head">
          <div>
            <span className="pp-house">Ninja Antwerp · Vlaamsekaai 52</span>
            <span className="pp-title">Paspoort van het bord</span>
          </div>
          <Seal size={58} />
        </header>
        <div className="pp-serial nj-mono" translate="no">
          No. {grouped(p.no)}
        </div>
        <h3 className="pp-dish">
          {p.dishName}
          {p.meatLabel ? <span className="pp-meat">{p.meatLabel}</span> : null}
          <span className="pp-portion nj-mono">{p.portion === '1,5x' ? '1,5×' : '1×'}</span>
        </h3>

        <dl className="pp-facts">
          <div>
            <dt>Gesneden om</dt>
            <dd className="nj-mono">{clockSeconds(p.carved)}</dd>
          </div>
          <div>
            <dt>Kern bij de snede</dt>
            <dd className="nj-mono">{deg(p.core)}</dd>
          </div>
          <div>
            <dt>Aan tafel</dt>
            <dd className="nj-mono">{deg(p.tableTemp)}</dd>
          </div>
          <div>
            <dt>Van spies tot tafel</dt>
            <dd className="nj-mono">{`${p.secondsToTable} s`}</dd>
          </div>
          <div>
            <dt>Korst</dt>
            <dd className="nj-mono">{deg(p.crust, 0)}</dd>
          </div>
          <div>
            <dt>Eikenvuur</dt>
            <dd className="nj-mono">{deg(p.fire, 0)}</dd>
          </div>
          <div className="wide">
            <dt>Spies</dt>
            <dd>{p.spits.join(' + ')}</dd>
          </div>
          <div>
            <dt>Gesneden door</dt>
            <dd>{`${p.carver} · ${p.carverRole}`}</dd>
          </div>
          <div>
            <dt>Tafel</dt>
            <dd className="nj-mono">{p.table}</dd>
          </div>
          <div className="wide">
            <dt>Avond</dt>
            <dd>{dayLong(day)}</dd>
          </div>
        </dl>

        <div className="pp-lines">
          <div className="pp-lines-head">
            <span>Wat er op je bord ligt</span>
            <span>Plaats</span>
            <span>Km</span>
            <span>Lot</span>
            <span>Vers</span>
          </div>
          {p.lines.map((l) => (
            <div className={`pp-line${l.real ? ' real' : ''}`} key={l.id}>
              <span className="pp-l-name">{l.name}</span>
              <span className="pp-l-place">{`${l.place}, ${COUNTRY_NAMES[l.country as keyof typeof COUNTRY_NAMES] ?? l.country}`}</span>
              <span className="pp-l-km nj-mono">{grouped(l.km)}</span>
              <span className="pp-l-lot nj-mono">{l.lot}</span>
              <span className="pp-l-when">{l.when}</span>
            </div>
          ))}
        </div>

        <p className="pp-legend">
          <span className="pp-dot" aria-hidden /> Zoals Ninja het zelf vermeldt; de rest van de regel is een voorbeeld.
        </p>
        <footer className="pp-foot">
          <span className="pp-code nj-mono" translate="no">
            {p.code}
          </span>
          <span className="pp-sum">{tr('{km} km samen · {local} van {n} uit België').replace('{km}', grouped(p.km)).replace('{local}', String(p.local)).replace('{n}', String(p.lines.length))}</span>
        </footer>
      </div>
      <div className="pp-actions">
        <button className="nj-btn" onClick={onShare}>
          Deel dit paspoort
        </button>
        <a className="nj-btn ghost" href={`../app/paspoort/${p.no}`}>
          Open in de app
        </a>
        {note && <span className="pp-note">{note}</span>}
        <span className="pp-honest">Echt: het gerecht, de huisregels en wat Ninja zelf over zijn ingrediënten zegt. Demo: de sensorwaarden, de snijder, de leveranciers en de loten.</span>
      </div>
    </article>
  );
}
