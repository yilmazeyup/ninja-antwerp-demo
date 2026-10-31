import { celsius, dishById, DISHES, emit, eventsOf, formatNo, spitAt, type Dish } from '@ninja/shared';
import { useMemo } from 'react';

import { appPassports, CALLS, hms, meatLabel, openCalls, spitPlatesOf, STATIONS, stationDone, tableLabel, tickets, tonight, type Ticket } from '../derive';
import { useLive, type Live } from '../live';
import { Empty, Panel, Toggle } from '../ui';
import { PageHead } from './common';

/** The pass: tickets per station, the app's plates to carve (with their passport), service calls, sold-out dishes. */
export function Pas() {
  const live = useLive();
  const key = Math.floor(live.m * 4);
  const list = useMemo(() => tickets(live), [key, live.bridge]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <PageHead
        kicker="De pas · bonnen per post"
        title={
          <>
            Van de <em>pas</em>
          </>
        }
        sub="Elke bestelling van het laatste halfuur, verdeeld over de posten. Wat via de app binnenkomt snijdt de spiesmeester hier: de gast krijgt meteen haar paspoort."
      />
      <div className="pas-top">
        <Calls />
        <Soldout />
      </div>
      <div className="stations">
        {STATIONS.map((s) => {
          const here = list.filter((t) => t.lines.some((l) => l.station === s.id));
          const open = here.filter((t) => !stationDone(live, t, s.id));
          return (
            <section className="station nj-leather" key={s.id}>
              <header>
                <span className="nj-label">{s.label}</span>
                <span className="mono">{open.length}</span>
              </header>
              <div className="station-list">
                {here.length ? here.slice(0, 14).map((t) => <TicketCard key={`${t.id}-${s.id}`} t={t} station={s.id} live={live} />) : <Empty>Niets op deze post.</Empty>}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

function TicketCard({ t, station, live }: { t: Ticket; station: Ticket['lines'][number]['station']; live: Live }) {
  const lines = t.lines.filter((l) => l.station === station);
  const done = stationDone(live, t, station);
  const age = Math.max(0, Math.round(live.m - t.at));
  const carved = new Set(tonight(live, 'carve').map((c) => c.ref));
  const plates = t.app && station === 'spit' && t.ref ? spitPlatesOf({ ref: t.ref, items: t.lines }) : [];
  const mine = appPassports(live);
  const carve = (p: (typeof plates)[number]) => {
    const spit = p.meat === 'chicken' ? 'kip' : 'rund';
    const r = spitAt(live.ev, spit, live.m);
    emit({ kind: 'carve', ref: p.ref, dish: p.dish, meat: p.meat, portion: p.portion, day: live.key, minute: live.m, core: r.core, seconds: 35 + Math.round(Math.random() * 45), table: t.table || 'S1' });
  };
  return (
    <article className={`ticket ${done ? 'done' : ''} ${t.app ? 'app' : ''}`}>
      <div className="ticket-head">
        <span className="mono">{t.table || 'Rij'}</span>
        <span className="ticket-name" translate="no">
          {t.name}
        </span>
        <span className={`mono ticket-age ${!done && age > 12 ? 'late' : ''}`}>{age}′</span>
      </div>
      {t.app && <span className="demo-tag ticket-app">Via de app</span>}
      {lines.map((l, i) => (
        <div className="ticket-line" key={i}>
          <span className="mono">{l.qty}×</span>
          <span>
            {l.name}
            {(l.meat || l.portion === '1,5x') && <small>{[meatLabel(l.meat), l.portion === '1,5x' ? '1,5×' : ''].filter(Boolean).join(' · ')}</small>}
          </span>
        </div>
      ))}
      {plates.length > 0 && (
        <div className="carve-list">
          {plates.map((p) => {
            const isCut = carved.has(p.ref);
            const ev = isCut ? eventsOf(live.bridge, 'carve').find((c) => c.ref === p.ref) : undefined;
            const pp = ev ? mine.find((x) => Math.abs(x.carved - ev.minute) < 1e-6 && x.table === ev.table) : undefined;
            return (
              <div className="carve-row" key={p.ref}>
                <span>
                  {dishById(p.dish).name}
                  <small>{meatLabel(p.meat)}</small>
                </span>
                {isCut ? (
                  <span className="mono amber">
                    {pp ? `No. ${formatNo(pp.no)}` : 'Gesneden'} · {ev ? celsius(ev.core) : ''}
                  </span>
                ) : (
                  <button type="button" className="btn small" onClick={() => carve(p)}>
                    Snijden
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div className="ticket-foot">
        <span className="mono faint">{hms(t.at)}</span>
        <span className={`ok-tag ${done ? '' : 'warn'}`}>{done ? 'Klaar' : station === 'spit' ? 'Aan de spies' : 'Bezig'}</span>
      </div>
    </article>
  );
}

function Calls() {
  const live = useLive();
  const calls = openCalls(live);
  const ok = (table: string, call: (typeof calls)[number]['call']) => emit({ kind: 'call-ok', table, call, by: call === 'lavash' ? 'Deniz' : 'Fien' });
  return (
    <Panel kicker="Oproepen aan tafel" title={calls.length ? `${calls.length} open` : 'Geen oproepen'}>
      {calls.length ? (
        <div className="list">
          {calls.map((c) => (
            <div className="row-item call-row" key={c.id}>
              <span className="nj-live" style={{ background: c.call === 'rekening' ? 'var(--nj-amber)' : 'var(--nj-alert)' }} />
              <div>
                <span className="who">{CALLS[c.call]}</span>
                <small>
                  {tableLabel(c.table)} · {Math.max(0, Math.round((live.m - c.at) * 60))} s geleden
                </small>
              </div>
              {c.app ? (
                <button type="button" className="btn small" onClick={() => ok(c.table, c.call)}>
                  Onderweg
                </button>
              ) : (
                <span className="muted" style={{ fontSize: 11 }}>
                  Fien gaat
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Empty>Iedereen heeft wat hij nodig heeft.</Empty>
      )}
    </Panel>
  );
}

const SOLDOUT_CATS = new Set(['menu', 'kebab', 'dips', 'sides', 'dessert']);

function Soldout() {
  const live = useLive();
  const state = new Map<string, boolean>();
  for (const e of eventsOf(live.bridge, 'soldout')) state.set(e.dish, e.on);
  const dishes = DISHES.filter((d: Dish) => SOLDOUT_CATS.has(d.cat));
  const off = dishes.filter((d) => state.get(d.id)).length;
  return (
    <Panel kicker="Kaart in de app" title={off ? `${off} uitverkocht` : 'Alles beschikbaar'} className="soldout">
      <div className="soldout-grid">
        {dishes.map((d) => {
          const on = state.get(d.id) ?? false;
          return (
            <label className={`soldout-item ${on ? 'on' : ''}`} key={d.id}>
              <span>{d.name}</span>
              <Toggle on={on} label={`${d.name}: uitverkocht`} onChange={(v) => emit({ kind: 'soldout', dish: d.id, on: v })} />
            </label>
          );
        })}
      </div>
      <p className="note" style={{ margin: '10px 0 0' }}>
        Aan = uitverkocht: de app toont het gerecht dan als op voor vanavond.
      </p>
    </Panel>
  );
}
