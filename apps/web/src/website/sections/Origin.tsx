import { useMemo, useRef, useState } from 'react';
import { COUNTRY_NAMES, freshLine, INGREDIENTS, kmOf, NINJA, tr, type Ingredient, type IngredientId } from '@ninja/shared';

import { BELGIUM, BELGIUM_BOX, NEIGHBOURS, PROVINCES, RIVERS, WORLD_BOX, WORLD_DOTS, type Ring } from '../map/geo';
import { grouped, useInView, useLive, useReducedMotion } from '../live';
import { Kicker } from '../ui/ui';

// ------------------------------------------------------------------------------------------------- projections

const RAD = Math.PI / 180;
const KX = Math.cos(50.6 * RAD);
const beX = (lon: number) => (lon - BELGIUM_BOX[0]) * KX * 100;
const beY = (lat: number) => (BELGIUM_BOX[3] - lat) * 100;
const BE_W = beX(BELGIUM_BOX[2]);
const BE_H = beY(BELGIUM_BOX[1]);

const merc = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * RAD) / 2)) / RAD;
const wX = (lon: number) => lon - WORLD_BOX[0];
const wY = (lat: number) => merc(WORLD_BOX[3]) - merc(lat);
const W_W = WORLD_BOX[2] - WORLD_BOX[0];
const W_H = merc(WORLD_BOX[3]) - merc(WORLD_BOX[1]);

const ringPath = (r: Ring, px: (lon: number) => number, py: (lat: number) => number) => {
  let d = '';
  for (let i = 0; i < r.length; i += 2) d += `${i ? 'L' : 'M'}${px(r[i]).toFixed(1)},${py(r[i + 1]).toFixed(1)}`;
  return `${d}Z`;
};

/** A curved flight path from a place to Antwerp, bulging north. */
function arc(x0: number, y0: number, x1: number, y1: number, lift = 0.28) {
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  let nx = -dy / len;
  let ny = dx / len;
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  return `M${x0.toFixed(1)},${y0.toFixed(1)} Q${(mx + nx * len * lift).toFixed(1)},${(my + ny * len * lift).toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
}

// Halftone dots of the world strip, one path per kind of land.
const DOTS = (() => {
  const out: Record<string, string> = {};
  WORLD_DOTS.rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const c = row[i];
      if (c === '.') continue;
      out[c] = (out[c] ?? '') + `M${(i * WORLD_DOTS.step).toFixed(2)},${(j * WORLD_DOTS.step).toFixed(2)}h0`;
    }
  });
  return out;
})();

/** Labels for the Belgian places: which side of the dot they sit on. */
const LABEL_SIDE: Record<string, [number, number, 'start' | 'end']> = {
  Geel: [5, 10, 'start'],
  Bree: [6, 3, 'start'],
  Bastogne: [6, 3, 'start'],
  Torhout: [-6, 3, 'end'],
  'La Roche-en-Ardenne': [-6, 3, 'end'],
  Brecht: [-6, 1, 'end'],
  Hoogstraten: [6, -3, 'start'],
  Mechelen: [-7, 8, 'end'],
  'Sint-Katelijne-Waver': [7, 9, 'start'],
  Duffel: [-7, 0, 'end'],
  Herentals: [4, -6, 'start'],
};

type Place = { key: string; place: string; country: Ingredient['country']; lat: number; lon: number; ids: IngredientId[]; km: number };

const PLACES: Place[] = (() => {
  const map = new Map<string, Place>();
  for (const g of Object.values(INGREDIENTS)) {
    const key = `${g.place}|${g.country}`;
    const p = map.get(key) ?? { key, place: g.place, country: g.country, lat: g.lat, lon: g.lon, ids: [], km: kmOf(g.id) };
    p.ids.push(g.id);
    map.set(key, p);
  }
  return [...map.values()].sort((a, b) => a.km - b.km);
})();

const GROUP_LABEL: Record<Ingredient['group'], string> = {
  vlees: 'Vlees',
  groente: 'Groente',
  kruid: 'Kruiden',
  brood: 'Brood',
  zuivel: 'Zuivel',
  specerij: 'Specerijen',
  vuur: 'Vuur',
  graan: 'Graan',
  noot: 'Noten',
  peulvrucht: 'Peulvruchten',
  drank: 'Drank',
};

export function Origin() {
  const live = useLive();
  const reduced = useReducedMotion();
  const [view, setView] = useState<'be' | 'world'>('be');
  const [selected, setSelected] = useState<IngredientId>('lettuce');
  const [filter, setFilter] = useState<'alle' | 'be' | 'ver'>('alle');
  const mapRef = useRef<HTMLDivElement>(null);
  const seen = useInView(mapRef, { margin: '0px 0px -20% 0px' });

  const all = useMemo(() => Object.values(INGREDIENTS).sort((a, b) => kmOf(a.id) - kmOf(b.id)), []);
  const list = all.filter((g) => (filter === 'alle' ? true : filter === 'be' ? g.country === 'BE' : g.country !== 'BE'));
  const sel = INGREDIENTS[selected];
  const selPlace = PLACES.find((p) => p.ids.includes(selected));
  const belgian = all.filter((g) => g.country === 'BE').length;
  const avg = Math.round(all.reduce((s, g) => s + kmOf(g.id), 0) / all.length);
  const median = kmOf(all[Math.floor(all.length / 2)].id);

  const choose = (id: IngredientId) => {
    setSelected(id);
    setView(INGREDIENTS[id].country === 'BE' ? 'be' : 'world');
  };

  const home = { x: beX(NINJA.lon), y: beY(NINJA.lat) };
  const homeW = { x: wX(NINJA.lon), y: wY(NINJA.lat) };

  return (
    <section className="w-sec origin" id="herkomst">
      <div className="w-wrap">
        <Kicker n="04">Herkomst</Kicker>
        <div className="origin-head">
          <h2 className="w-d1" data-reveal>
            Herkomst
          </h2>
          <p className="w-accent nj-serif" data-reveal>
            tot op de akker
          </p>
        </div>
        <p className="w-lede" data-reveal>
          Waar elk ingrediënt vandaan komt, hoe ver het reisde, en wanneer het geoogst, gebakken of geleverd werd.
        </p>
        <div className="origin-stats" data-reveal>
          <div>
            <span className="stat-v nj-mono">{all.length}</span>
            <span className="nj-label">Ingrediënten</span>
          </div>
          <div>
            <span className="stat-v nj-mono">{`${Math.round((belgian / all.length) * 100)}%`}</span>
            <span className="nj-label">Uit België</span>
          </div>
          <div>
            <span className="stat-v nj-mono">{`${median} km`}</span>
            <span className="nj-label">Mediaan</span>
          </div>
          <div>
            <span className="stat-v nj-mono">{`0 km`}</span>
            <span className="nj-label">Lavash en desem, uit onze oven</span>
          </div>
        </div>
      </div>

      <div className="w-wrap origin-grid">
        <div className={`map-card${seen ? ' is-in' : ''}${reduced ? ' still' : ''}`} ref={mapRef}>
          <div className="map-bar">
            <div className="seg" role="tablist" aria-label="Kaart">
              <button role="tab" aria-selected={view === 'be'} className={view === 'be' ? 'on' : ''} onClick={() => setView('be')}>
                België
              </button>
              <button role="tab" aria-selected={view === 'world'} className={view === 'world' ? 'on' : ''} onClick={() => setView('world')}>
                Tot in Pakistan
              </button>
            </div>
            <span className="nj-label map-km">{`${grouped(avg)} km gemiddeld`}</span>
          </div>

          <div className="map-views" dir="ltr">
            <svg className={`map map-be${view === 'be' ? ' is-shown' : ''}`} viewBox={`0 0 ${BE_W.toFixed(0)} ${BE_H.toFixed(0)}`} role="img" aria-label={tr('Kaart van België met de herkomst van de ingrediënten')}>
              <defs>
                <pattern id="dotfill" width="2.2" height="2.2" patternUnits="userSpaceOnUse">
                  <circle cx="1.1" cy="1.1" r="0.42" className="dotfill" />
                </pattern>
              </defs>
              {NEIGHBOURS.map((nb, i) => (
                <path key={i} d={ringPath(nb.ring, beX, beY)} className="nb" />
              ))}
              {BELGIUM.map((r, i) => (
                <path key={i} d={ringPath(r, beX, beY)} className="land" />
              ))}
              {PROVINCES.map((p) => p.rings.map((r, i) => <path key={`${p.name}${i}`} d={ringPath(r, beX, beY)} className="prov" />))}
              {RIVERS.map((rv) =>
                rv.lines.map((l, i) => {
                  let d = '';
                  for (let k = 0; k < l.length; k += 2) d += `${k ? 'L' : 'M'}${beX(l[k]).toFixed(1)},${beY(l[k + 1]).toFixed(1)}`;
                  return <path key={`${rv.name}${i}`} d={d} className="river" />;
                }),
              )}
              {BELGIUM.map((r, i) => (
                <path key={`o${i}`} d={ringPath(r, beX, beY)} className="land-line" />
              ))}
              {PLACES.filter((p) => p.country === 'BE' && p.km > 0).map((p, i) => {
                const x = beX(p.lon);
                const y = beY(p.lat);
                const on = p.ids.includes(selected);
                const [dx, dy, anchor] = LABEL_SIDE[p.place] ?? [6, 3, 'start'];
                return (
                  <g key={p.key} className={`pin${on ? ' on' : ''}`} onClick={() => choose(p.ids[0])} style={{ ['--i' as string]: i }}>
                    <path id={`arc-be-${i}`} d={arc(x, y, home.x, home.y, 0.22)} className="arc" pathLength={1} />
                    {!reduced && on && (
                      <circle r="1.6" className="spark">
                        <animateMotion dur="2.4s" repeatCount="indefinite" path={arc(x, y, home.x, home.y, 0.22)} />
                      </circle>
                    )}
                    <circle cx={x} cy={y} r={on ? 3.2 : 2.2} className="pin-dot" />
                    <circle cx={x} cy={y} r="9" className="pin-hit" />
                    <text x={x + dx} y={y + dy} textAnchor={anchor} className="pin-label">
                      {p.place}
                    </text>
                  </g>
                );
              })}
              <g className="home">
                <circle cx={home.x} cy={home.y} r="7" className="home-ring" />
                <circle cx={home.x} cy={home.y} r="3.4" className="home-dot" />
                <text x={home.x - 8} y={home.y - 7} textAnchor="end" className="home-label">
                  Ninja · Antwerpen
                </text>
              </g>
            </svg>

            <svg className={`map map-world${view === 'world' ? ' is-shown' : ''}`} viewBox={`0 0 ${W_W.toFixed(1)} ${W_H.toFixed(1)}`} role="img" aria-label={tr('Kaart van Europa tot Pakistan met de herkomst van de ingrediënten')}>
              {Object.entries(DOTS).map(([k, d]) => (
                <path key={k} d={d} className={`dots dots-${k}`} />
              ))}
              {PLACES.filter((p) => p.country !== 'BE').map((p, i) => {
                const x = wX(p.lon);
                const y = wY(p.lat);
                const on = p.ids.includes(selected);
                const d = arc(x, y, homeW.x, homeW.y, 0.2);
                return (
                  <g key={p.key} className={`pin${on ? ' on' : ''}`} onClick={() => choose(p.ids[0])} style={{ ['--i' as string]: i }}>
                    <path d={d} className="arc" pathLength={1} />
                    {!reduced && on && (
                      <circle r="0.45" className="spark">
                        <animateMotion dur="3.2s" repeatCount="indefinite" path={d} />
                      </circle>
                    )}
                    <circle cx={x} cy={y} r={on ? 0.75 : 0.5} className="pin-dot" />
                    <circle cx={x} cy={y} r="2.2" className="pin-hit" />
                    {on && (
                      <text x={x} y={y + 2.4} textAnchor="middle" className="pin-label w">
                        {p.place}
                      </text>
                    )}
                  </g>
                );
              })}
              <g className="home">
                <circle cx={homeW.x} cy={homeW.y} r="1.6" className="home-ring" />
                <circle cx={homeW.x} cy={homeW.y} r="0.8" className="home-dot" />
                <text x={homeW.x + 1.6} y={homeW.y - 1.4} className="home-label w">
                  Antwerpen
                </text>
              </g>
            </svg>
          </div>

          <div className="map-card-foot">
            <p className="map-note">Producenten, plaatsen en loten zijn voorbeelden: Ninja vult zijn eigen leveranciers in, en elk paspoort toont ze dan.</p>
            <p className="map-credit">Kaart: Natural Earth</p>
          </div>
        </div>

        <div className="ingredients">
          <div className="seg small" role="tablist" aria-label="Filter">
            <button className={filter === 'alle' ? 'on' : ''} onClick={() => setFilter('alle')}>
              Alles
            </button>
            <button className={filter === 'be' ? 'on' : ''} onClick={() => setFilter('be')}>
              België
            </button>
            <button className={filter === 'ver' ? 'on' : ''} onClick={() => setFilter('ver')}>
              Van verder
            </button>
          </div>

          <article className="ing-card nj-leather" aria-live="polite">
            <div className="ing-card-top">
              <span className="nj-label">{GROUP_LABEL[sel.group]}</span>
              {sel.real && <span className="real-seal" title={sel.real}>Echt bij Ninja</span>}
            </div>
            <h3 className="ing-name">{sel.name}</h3>
            <p className="ing-place">{`${sel.place}, ${COUNTRY_NAMES[sel.country]}`}</p>
            <div className="ing-facts">
              <div>
                <span className="nj-label">Afstand</span>
                <span className="nj-mono ing-km">{`${grouped(kmOf(sel.id))} km`}</span>
              </div>
              <div>
                <span className="nj-label">Vers</span>
                <span className="ing-fresh">{freshLine(sel.id, live.minute)}</span>
              </div>
            </div>
            <p className="ing-story">{sel.story}</p>
            {sel.real && <p className="ing-real">{`Echt: ${sel.real}.`}</p>}
            <p className="ing-producer">
              <span className="nj-label">Voorbeeld</span> <span>{sel.producer}</span>
            </p>
            {selPlace && selPlace.ids.length > 1 && (
              <p className="ing-also">{`Ook van hier: ${selPlace.ids.filter((id) => id !== sel.id).map((id) => INGREDIENTS[id].name).join(', ')}`}</p>
            )}
          </article>

          <ul className="ing-list">
            {list.map((g) => (
              <li key={g.id}>
                <button className={g.id === selected ? 'on' : ''} onClick={() => choose(g.id)}>
                  <span className="ing-l-name">{g.name}</span>
                  <span className="ing-l-place">{g.place}</span>
                  <span className="ing-l-km nj-mono">{`${grouped(kmOf(g.id))} km`}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
