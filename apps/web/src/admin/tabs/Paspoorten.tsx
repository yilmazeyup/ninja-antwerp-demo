import { celsius, COUNTRY_NAMES, findAnyPassport, formatNo, INGREDIENTS, kmOf, lotOf, type IngredientId, type Passport } from '@ninja/shared';
import { useMemo, useState } from 'react';

import { hms, passportsTonight, tableLabel } from '../derive';
import { useLive } from '../live';
import { Empty, Num, Panel, Seal } from '../ui';
import { PageHead } from './common';

/** Passports & provenance: tonight's plates, one passport in full, the (example) suppliers and a recall by lot. */
export function Paspoorten() {
  const live = useLive();
  const key = Math.floor(live.m * 2);
  const list = useMemo(() => passportsTonight(live), [key, live.bridge]); // eslint-disable-line react-hooks/exhaustive-deps
  const [q, setQ] = useState('');
  const [chosen, setChosen] = useState<number | null>(null);
  const digits = q.replace(/\D/g, '');
  const filtered = digits ? list.filter((p) => String(p.no).includes(digits)) : list;
  const found = useMemo(() => {
    if (digits.length < 6) return null;
    const n = Number(digits);
    return list.find((p) => p.no === n) ?? findAnyPassport(n, live.now, live.bridge);
  }, [digits, list, live.now, live.bridge]);
  const current = (chosen !== null ? list.find((p) => p.no === chosen) : null) ?? found ?? filtered[0] ?? null;
  return (
    <>
      <PageHead
        kicker={`${list.length} paspoorten vanavond`}
        title={
          <>
            Paspoorten <em>&amp;</em> herkomst
          </>
        }
        sub="Elk bord van de spies krijgt een nummer: de seconde van de snede, de temperatuur, de snijder en waar elk ingrediënt vandaan komt."
      />
      <div className="pp-grid">
        <Panel kicker="Zoek op nummer" title="Vanavond" className="pp-list-panel">
          <input className="input mono" placeholder="No. 216 875" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Zoek een paspoort" style={{ width: '100%', marginBottom: 12 }} />
          <div className="pp-list">
            {filtered.slice(0, 120).map((p) => (
              <button type="button" key={p.no} className={`pp-item ${current?.no === p.no ? 'on' : ''}`} onClick={() => setChosen(p.no)}>
                <span className="mono">No. {formatNo(p.no)}</span>
                <span className="pp-item-dish">{p.dishName}</span>
                <span className="mono faint">{hms(p.carved)}</span>
                <span className="mono amber">{celsius(p.core)}</span>
              </button>
            ))}
            {!filtered.length && !found && <Empty>Geen paspoort met dat nummer vanavond.</Empty>}
          </div>
        </Panel>
        <div>{current ? <PassportCard p={current} /> : <Empty>Nog geen borden gesneden vanavond.</Empty>}</div>
        <div className="pp-side">
          <Suppliers />
          <Recall list={list} />
        </div>
      </div>
    </>
  );
}

function PassportCard({ p }: { p: Passport }) {
  return (
    <article className="passport nj-leather nj-grain">
      <div className="passport-top">
        <Seal size={54} />
        <div>
          <div className="nj-label">Paspoort · Ninja Antwerp</div>
          <div className="passport-no nj-mono">No. {formatNo(p.no)}</div>
          <div className="mono faint" style={{ fontSize: 10.5 }} translate="no">
            {p.code}
          </div>
        </div>
      </div>
      <h2 className="passport-dish">{p.dishName}</h2>
      <div className="muted" style={{ fontSize: 13 }}>
        {[p.meatLabel, p.portion === '1,5x' ? '1,5 portie' : '1 portie', tableLabel(p.table)].filter(Boolean).join(' · ')}
      </div>
      <div className="nj-chrome" style={{ margin: '16px 0' }} />
      <div className="passport-facts">
        <div>
          <span className="nj-label">Gesneden</span>
          <Num value={hms(p.carved)} />
        </div>
        <div>
          <span className="nj-label">Kern bij de snede</span>
          <Num value={p.core} unit="°C" digits={1} className="amber" />
        </div>
        <div>
          <span className="nj-label">Aan tafel na</span>
          <Num value={p.secondsToTable} unit="s" />
        </div>
        <div>
          <span className="nj-label">Aan tafel</span>
          <Num value={p.tableTemp} unit="°C" digits={1} />
        </div>
        <div>
          <span className="nj-label">Korst</span>
          <Num value={p.crust} unit="°C" digits={0} />
        </div>
        <div>
          <span className="nj-label">Eikenvuur</span>
          <Num value={p.fire} unit="°C" />
        </div>
        <div className="wide">
          <span className="nj-label">Spies</span>
          <span>{p.spits.join(' + ')}</span>
        </div>
        <div className="wide">
          <span className="nj-label">Gesneden door</span>
          <span>
            {p.carver} · {p.carverRole}
          </span>
        </div>
      </div>
      <div className="nj-chrome" style={{ margin: '16px 0 10px' }} />
      <div className="nj-label" style={{ color: 'var(--nj-muted)', marginBottom: 6 }}>
        Op dit bord · {p.lines.length} ingrediënten · {Math.round(p.km).toLocaleString('nl-BE')} km samen
      </div>
      <div className="pp-lines">
        {p.lines.map((l) => (
          <div className="pp-line" key={l.id}>
            <span className="pp-ing">{l.name}</span>
            <span className="muted">
              {l.producer} · {l.place}
            </span>
            <span className="mono faint">{l.km} km</span>
            <span className="mono">{l.lot}</span>
            <span className="faint pp-when">{l.when}</span>
          </div>
        ))}
      </div>
      <p className="note" style={{ marginTop: 12 }}>
        Producenten en lotnummers zijn voorbeelden voor de demo.
      </p>
    </article>
  );
}

type Supplier = { producer: string; place: string; country: string; km: number; items: IngredientId[] };

function Suppliers() {
  const live = useLive();
  const suppliers = useMemo(() => {
    const map = new Map<string, Supplier>();
    for (const g of Object.values(INGREDIENTS)) {
      const s = map.get(g.producer) ?? { producer: g.producer, place: g.place, country: g.country, km: kmOf(g.id), items: [] };
      s.items.push(g.id);
      map.set(g.producer, s);
    }
    return [...map.values()].sort((a, b) => a.km - b.km);
  }, []);
  return (
    <Panel kicker="Leveranciers" title="Waar het vandaan komt" actions={<span className="demo-tag">Voorbeeld</span>}>
      <div className="hl" style={{ padding: '10px 12px', marginBottom: 10 }}>
        <span className="nj-label" style={{ color: 'var(--nj-amber)', fontSize: 8.5 }}>
          Voorbeeldleveranciers — vul hier je eigen leveranciers in
        </span>
      </div>
      <div className="sup-list">
        {suppliers.map((s) => (
          <div className="sup" key={s.producer}>
            <div>
              <span className="who">{s.producer}</span>
              <small>
                {s.place} · {COUNTRY_NAMES[s.country as keyof typeof COUNTRY_NAMES]} · {s.km} km
              </small>
            </div>
            <div className="sup-lots">
              {s.items.map((id) => (
                <span key={id} className="sup-lot">
                  {INGREDIENTS[id].name} <b className="mono">{lotOf(id, live.key)}</b>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Recall({ list }: { list: Passport[] }) {
  const live = useLive();
  const [id, setId] = useState<IngredientId>('lettuce');
  const hits = list.filter((p) => p.lines.some((l) => l.id === id));
  const tables = [...new Set(hits.map((p) => p.table))];
  return (
    <Panel kicker="Terugroeping" title="Wie at van dit lot?">
      <select className="select" value={id} onChange={(e) => setId(e.target.value as IngredientId)} style={{ width: '100%', height: 34, marginBottom: 12 }} aria-label="Ingrediënt">
        {Object.values(INGREDIENTS)
          .sort((a, b) => a.name.localeCompare(b.name, 'nl'))
          .map((g) => (
            <option key={g.id} value={g.id}>
              {g.name} · lot {lotOf(g.id, live.key)}
            </option>
          ))}
      </select>
      <div className="recall-sum">
        <div>
          <Num value={hits.length} className="recall-n" />
          <span className="nj-label">borden</span>
        </div>
        <div>
          <Num value={tables.length} className="recall-n" />
          <span className="nj-label">tafels</span>
        </div>
      </div>
      {hits.length ? (
        <div className="recall-list">
          {hits.slice(0, 40).map((p) => (
            <div className="recall-row" key={p.no}>
              <span className="mono">No. {formatNo(p.no)}</span>
              <span>{tableLabel(p.table)}</span>
              <span className="mono faint">{hms(p.carved)}</span>
            </div>
          ))}
        </div>
      ) : (
        <Empty>Dit lot ging vanavond nog niet de deur uit.</Empty>
      )}
    </Panel>
  );
}
