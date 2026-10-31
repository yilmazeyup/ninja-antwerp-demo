import {
  addDays,
  clock,
  dateShort,
  dayShort,
  dropsAt,
  dropState,
  EARLY,
  emit,
  euro,
  evening,
  hash,
  lineAt,
  ME,
  nightsAt,
  RANKS,
  seatedAt,
  SPIT_PACKAGES,
  SPIT_SLOTS,
  SPIT_STEPS,
  type Rank,
} from '@ninja/shared';
import { useMemo, useState } from 'react';

import { asset } from '../../common/install';
import { tableLabel, tonight } from '../derive';
import { useLive, type Live } from '../live';
import { Empty, Num, Panel, RankBadge, Segmented } from '../ui';
import { PageHead } from './common';

type Member = { name: string; rank: Rank; visits: number; ki: number; last: Date; now: 'rij' | 'tafel' | null; table: string | null; demo?: boolean };

const VISITS: Record<Rank, [number, number]> = { genin: [1, 4], chunin: [5, 14], jonin: [15, 42], kage: [24, 90] };

/** Members from the last week of evenings: everyone who came with a rank, at their latest visit. */
function roster(live: Live): Member[] {
  const byName = new Map<string, Member>();
  const seatedNow = new Map(seatedAt(live.ev, live.m).map((g) => [g.id, g.table]));
  const lineNow = new Set(lineAt(live.ev, live.m).map((g) => g.id));
  for (let back = 6; back >= 0; back--) {
    const ev = back === 0 ? live.ev : evening(addDays(live.day, -back));
    for (const g of ev.groups) {
      if (!g.rank || (back === 0 && g.arrive > live.m)) continue;
      const h = hash(`member-${g.name}`);
      const [lo, hi] = VISITS[g.rank];
      const visits = lo + (h % (hi - lo + 1));
      byName.set(g.name, {
        name: g.name,
        rank: g.rank,
        visits,
        ki: visits * 240 + (h % 400),
        last: ev.day,
        now: back === 0 ? (seatedNow.has(g.id) ? 'tafel' : lineNow.has(g.id) ? 'rij' : null) : null,
        table: back === 0 ? (seatedNow.get(g.id) ?? null) : null,
      });
    }
  }
  const me: Member = { name: `${ME.first} ${ME.name.split(' ').slice(1).join(' ').charAt(0)}.`, rank: ME.rank, visits: ME.visits, ki: ME.ki, last: live.day, now: null, table: null, demo: true };
  return [me, ...[...byName.values()].sort((a, b) => b.last.getTime() - a.last.getTime() || b.visits - a.visits)];
}

/** Club: ranks, drops, Ninja Nights and private spits — all proposals for Ninja, worked out for tonight. */
export function Club() {
  const live = useLive();
  const members = useMemo(() => roster(live), [live.key, Math.floor(live.m / 5)]); // eslint-disable-line react-hooks/exhaustive-deps
  const [rank, setRank] = useState<Rank | 'alle'>('alle');
  const counts = RANKS.map((r) => ({ r, n: members.filter((m) => m.rank === r.id).length }));
  const shown = rank === 'alle' ? members : members.filter((m) => m.rank === rank);
  return (
    <>
      <PageHead
        kicker="Ninja Clan · voorstel"
        title={
          <>
            De <em>Clan</em>
          </>
        }
        sub="Rangen verdiend met bezoeken, Kage enkel op uitnodiging. Drops, Ninja Nights en de eigen spies voor wie iets te vieren heeft."
      />
      <div className="ranks-row">
        {counts.map(({ r, n }) => (
          <div className={`rank-card nj-leather ${r.id}`} key={r.id}>
            <span className="nj-kanji rank-big" translate="no">
              {r.kanji}
            </span>
            <div>
              <div className="nj-label">{r.name}</div>
              <Num value={n} className="rank-n" />
              <small>{r.visits ? `vanaf ${r.visits} ${r.visits === 1 ? 'bezoek' : 'bezoeken'}` : 'op uitnodiging'}</small>
            </div>
          </div>
        ))}
      </div>
      <div className="club-grid">
        <Panel
          kicker={`${members.length} leden deze week`}
          title="Leden"
          actions={
            <Segmented
              label="Rang"
              value={rank}
              onChange={setRank}
              options={[{ id: 'alle' as const, label: 'Alle' }, ...RANKS.map((r) => ({ id: r.id, label: r.name }))]}
            />
          }
        >
          <div className="member-scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Lid</th>
                  <th>Rang</th>
                  <th className="end">Bezoeken</th>
                  <th className="end">Ki</th>
                  <th>Laatst</th>
                  <th>Nu</th>
                </tr>
              </thead>
              <tbody>
                {shown.slice(0, 60).map((m) => (
                  <tr key={m.name}>
                    <td>
                      <span translate="no" style={{ color: 'var(--nj-ink)' }}>
                        {m.name}
                      </span>
                      {m.demo && <span className="demo-tag" style={{ marginInlineStart: 8 }}>Demo-gast</span>}
                    </td>
                    <td>
                      <RankBadge rank={m.rank} />
                    </td>
                    <td className="end mono">{m.visits}</td>
                    <td className="end mono">{m.ki.toLocaleString('nl-BE')}</td>
                    <td className="muted">{m.last.getTime() === live.day.getTime() ? 'vanavond' : dayShort(m.last)}</td>
                    <td>{m.now === 'tafel' ? <span className="ok-tag">{tableLabel(m.table)}</span> : m.now === 'rij' ? <span className="ok-tag warn">In de rij</span> : <span className="faint">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <div className="club-side">
          <Drops />
          <Nights />
        </div>
      </div>
      <Spits />
    </>
  );
}

const STATE_LABEL = { binnenkort: 'Binnenkort', vroeg: 'Vroege toegang', live: 'Live', uitverkocht: 'Uitverkocht' } as const;

function Drops() {
  const live = useLive();
  const drops = dropsAt(live.now);
  const claims = tonight(live, 'drop-claim');
  return (
    <Panel kicker="Drops · in beperkte oplage" title="Drops" actions={<span className="demo-tag">Voorstel</span>}>
      <div className="drops">
        {drops.map((d) => {
          const claimed = claims.filter((c) => c.drop === d.id).reduce((s, c) => s + c.qty, 0);
          const left = Math.max(0, d.left - claimed);
          const state = left === 0 && dropState(d, live.now) === 'live' ? 'uitverkocht' : dropState(d, live.now, 0);
          const early = dropState(d, live.now, EARLY.jonin);
          return (
            <div className="drop" key={d.id}>
              <img src={d.photo === 'logo-n' ? asset('brand/logo-n.png') : asset(`photos/${d.photo}.webp`)} alt="" className={d.photo === 'logo-n' ? 'contain' : ''} />
              <div className="drop-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span className="who">{d.name}</span>
                  <span className="mono">{euro(d.price)}</span>
                </div>
                <small>
                  {state === 'binnenkort' ? `${dayShort(d.opens)} ${clock(d.opens)}` : `${left} van ${d.stock} over`}
                  {state === 'binnenkort' && early === 'vroeg' ? ' · Jōnin en Kage nu al' : ''}
                </small>
                <div className="kg-bar">
                  <i style={{ width: `${((d.stock - left) / d.stock) * 100}%` }} />
                </div>
              </div>
              <span className={`ok-tag ${state === 'uitverkocht' ? 'alert' : state === 'live' ? '' : 'warn'}`}>{STATE_LABEL[state]}</span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function Nights() {
  const live = useLive();
  const nights = nightsAt(live.now);
  const rsvps = tonight(live, 'rsvp');
  return (
    <Panel kicker="Ninja Nights" title="Inschrijvingen" actions={<span className="demo-tag">Voorstel</span>}>
      <div className="list">
        {nights.map((n) => {
          const extra = rsvps.filter((r) => r.night === n.id).reduce((s, r) => s + r.guests, 0);
          const going = Math.min(n.seats, n.going + extra);
          return (
            <div className="row-item night-row" key={n.id}>
              <div>
                <span className="who">{n.title}</span>
                <small>
                  {dayShort(n.at)} · {clock(n.at)}
                  {extra ? ` · ${extra} via de app` : ''}
                </small>
                <div className="kg-bar" style={{ maxWidth: 220 }}>
                  <i style={{ width: `${(going / n.seats) * 100}%` }} />
                </div>
              </div>
              <span className="mono">
                {going}/{n.seats}
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

type Booking = { ref: string; name: string; day: string; slot: string; guests: number; pack: string; plate: string; demo?: boolean };

function Spits() {
  const live = useLive();
  const demoDay = addDays(live.day, ((8 - live.day.getDay()) % 7) || 7);
  const bookings: Booking[] = [
    ...tonight(live, 'spit-booking').map((b) => ({ ref: b.ref, name: b.name, day: b.day, slot: b.slot, guests: b.guests, pack: b.pack, plate: b.plate })),
    ...eventsBeyondTonight(live),
    { ref: 'demo-spit-1', name: 'Familie Aerts', day: `${demoDay.getFullYear()}-${String(demoDay.getMonth() + 1).padStart(2, '0')}-${String(demoDay.getDate()).padStart(2, '0')}`, slot: 'maandag', guests: 13, pack: 'spies-14', plate: 'AERTS · 50', demo: true },
  ].filter((b, i, all) => all.findIndex((x) => x.ref === b.ref) === i);
  const steps = tonight(live, 'spit-step').concat(eventsOfAll(live, 'spit-step'));
  return (
    <Panel kicker="Eigen Spies · privé" title="Spiezen op naam" className="spits-panel">
      {bookings.length ? (
        <div className="bookings">
          {bookings.map((b) => {
            const pack = SPIT_PACKAGES.find((p) => p.id === b.pack) ?? SPIT_PACKAGES[0];
            const slot = SPIT_SLOTS.find((s) => s.id === b.slot);
            const done = steps.filter((s) => s.ref === b.ref).map((s) => s.step);
            const reached = SPIT_STEPS.reduce((k, s, i) => (done.includes(s.id) ? i : k), b.demo ? 0 : -1);
            const next = SPIT_STEPS[reached + 1];
            const day = parseDay(b.day);
            return (
              <div className="booking" key={b.ref}>
                <div className="booking-head">
                  <div>
                    <span className="who" translate="no">
                      {b.name}
                    </span>
                    <small>
                      {day ? dateShort(day) : b.day} · {slot?.label ?? b.slot} · {b.guests} pers. · {pack.name} · {euro(pack.perPerson * b.guests)}
                    </small>
                  </div>
                  {b.demo ? <span className="demo-tag">Demo</span> : <span className="demo-tag">Via de app</span>}
                </div>
                <div className="plate-name">
                  <span className="nj-label">Naamplaatje</span>
                  <span className="brass-plate" translate="no">
                    {b.plate || b.name}
                  </span>
                </div>
                <ol className="steps">
                  {SPIT_STEPS.map((s, i) => (
                    <li key={s.id} className={i <= reached ? 'on' : i === reached + 1 ? 'next' : ''}>
                      <span className="step-dot" />
                      <div>
                        <span className="who">{s.title}</span>
                        <small>{s.line}</small>
                      </div>
                    </li>
                  ))}
                </ol>
                <button type="button" className="btn small" disabled={!next} onClick={() => next && emit({ kind: 'spit-step', ref: b.ref, step: next.id })}>
                  {next ? `Volgende stap: ${next.title}` : 'Klaar: eerste snede gezet'}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <Empty>Nog geen eigen spiezen geboekt.</Empty>
      )}
    </Panel>
  );
}

const parseDay = (d: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};

/** Bookings and steps are not tied to tonight: show every one the bridge holds. */
function eventsBeyondTonight(live: Live): Booking[] {
  return live.bridge.events.filter((e) => e.kind === 'spit-booking').map((e) => {
    const b = e as Extract<typeof e, { kind: 'spit-booking' }>;
    return { ref: b.ref, name: b.name, day: b.day, slot: b.slot, guests: b.guests, pack: b.pack, plate: b.plate };
  });
}

function eventsOfAll(live: Live, kind: 'spit-step') {
  return live.bridge.events.filter((e): e is Extract<typeof e, { kind: 'spit-step' }> => e.kind === kind);
}
