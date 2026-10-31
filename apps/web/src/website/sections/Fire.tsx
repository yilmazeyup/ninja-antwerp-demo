import { useEffect, useMemo, useRef, useState } from 'react';
import { CORE_TARGET, clock, decimal, OPENS, spitAt, spitSeries, STATUS_LABEL, tr, type SpitId, type SpitReading } from '@ninja/shared';

import { deg, useInView, useLive, useReducedMotion } from '../live';
import type { SensorName, SpitStage } from '../scenes/stage';
import { Kicker, Roll } from '../ui/ui';

const SHORT_NAME: Record<SensorName, string> = { probe: 'Kern', camera: 'Korst', thermocouple: 'Vuur', scale: 'Gewicht' };

const SENSORS: { id: SensorName; n: string; name: string; where: string; reads: string }[] = [
  { id: 'probe', n: '01', name: 'Kernsonde', where: 'In de snijlaag', reads: 'De temperatuur van de plak die nu gesneden wordt, tot op een tiende graad.' },
  { id: 'camera', n: '02', name: 'Infraroodcamera', where: 'Op het vlees', reads: 'Leest de korst die het vuur net heeft verlaten, rondom de hele spies.' },
  { id: 'thermocouple', n: '03', name: 'Thermokoppel', where: 'In het eikenvuur', reads: 'Meet het vuur zelf, ook als er een nieuw blok eik op gaat.' },
  { id: 'scale', n: '04', name: 'Weegschaal', where: 'Onder de spies', reads: 'Hoeveel kilo er nog op staat, en dus hoe lang de spies nog meegaat.' },
];

export function Fire() {
  const live = useLive();
  const reduced = useReducedMotion();
  const [kind, setKind] = useState<SpitId>('rund');
  const [thermal, setThermal] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<SpitStage | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const near = useInView(box, { margin: '400px 0px', repeat: false });
  const visible = useInView(box, { repeat: true });
  const marks = useRef<Partial<Record<SensorName, HTMLDivElement | null>>>({});

  // The sensors are read every second; the big numbers settle on a four-second beat so they can be read.
  const beat = Math.floor(live.minute * 15) / 15;
  const reading = spitAt(live.ev, kind, beat);
  const other = spitAt(live.ev, kind === 'rund' ? 'kip' : 'rund', beat);

  // Build the stage when it first comes near the viewport.
  useEffect(() => {
    if (!near || !host.current) return;
    let cancelled = false;
    const el = host.current;
    import('../scenes/stage')
      .then(({ createSpitStage }) => createSpitStage(el, { kind, reduced, onReady: () => !cancelled && setReady(true) }))
      .then((s) => {
        if (cancelled) return s.dispose();
        stage.current = s;
        s.setHud(marks.current);
        (window as unknown as { __stage?: string }).__stage = `${s.backend}/${s.quality}`;
      })
      .catch((e) => {
        console.warn('3D unavailable for the spit', e);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      stage.current?.dispose();
      stage.current = null;
    };
    // The stage is built once; kind and thermal are sent to it below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [near, reduced]);

  useEffect(() => stage.current?.setActive(visible), [visible, ready]);
  useEffect(() => stage.current?.setKind(kind), [kind, ready]);
  useEffect(() => stage.current?.setThermal(thermal), [thermal, ready]);
  useEffect(() => {
    stage.current?.setReading(reading);
    stage.current?.setReading(other);
  });

  const onPointer = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    stage.current?.setPointer(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
  };

  const kgShare = reading.kg / reading.kgStart;
  const sinceCut = reading.lastCut < 120 ? `${reading.lastCut} s` : `${Math.round(reading.lastCut / 60)} min`;

  return (
    <section className="w-sec fire" id="vuur">
      <div className="w-wrap">
        <Kicker n="02">Het vuur</Kicker>
        <div className="fire-head">
          <h2 className="w-d1" data-reveal>
            Het vuur
          </h2>
          <p className="w-accent nj-serif" data-reveal>
            nu, tot op de seconde
          </p>
        </div>
        <p className="w-lede fire-lede" data-reveal>
          Vier sensoren lezen de spies elke seconde: de kern van de plak die nu gesneden wordt, de korst, het eikenvuur en het gewicht.
        </p>
      </div>

      <div className="w-wrap fire-grid" ref={box}>
        <div className="stage-col">
          <div className="stage-bar">
            <div className="seg" role="tablist" aria-label="Kies een spies">
              <button role="tab" aria-selected={kind === 'rund'} className={kind === 'rund' ? 'on' : ''} onClick={() => setKind('rund')}>
                Spies 1 · rund, kalf, lam
              </button>
              <button role="tab" aria-selected={kind === 'kip'} className={kind === 'kip' ? 'on' : ''} onClick={() => setKind('kip')}>
                Spies 2 · kip
              </button>
            </div>
            <button className={`switch${thermal ? ' on' : ''}`} role="switch" aria-checked={thermal} onClick={() => setThermal((v) => !v)}>
              <span className="switch-knob" aria-hidden />
              <span>Warmtebeeld</span>
            </button>
          </div>
        <div className={`stage${thermal ? ' is-thermal' : ''}${ready ? ' is-ready' : ''}${failed ? ' is-flat' : ''}`} onPointerMove={onPointer} onPointerLeave={() => stage.current?.setPointer(0, 0)}>
          <div className="stage-host" ref={host} aria-hidden>
            <img className="stage-flat" src={`${import.meta.env.BASE_URL}photos/gal-spit.webp`} alt="" />
          </div>
          <div className="stage-hud" aria-hidden dir="ltr">
            <span className="hud-corner tl" />
            <span className="hud-corner tr" />
            <span className="hud-corner bl" />
            <span className="hud-corner br" />
            <div className="hud-top">
              <span className="hud-rec">
                <span className="nj-live" /> {thermal ? 'IR · 8–14 µm' : 'CAM 1'}
              </span>
              <span className="nj-mono" dir="ltr">
                {clock(live.now)}:{String(live.now.getSeconds()).padStart(2, '0')}
              </span>
            </div>
            {thermal && (
              <div className="hud-scale">
                <span className="nj-mono">140°</span>
                <span className="hud-ramp" />
                <span className="nj-mono">50°</span>
              </div>
            )}
            {SENSORS.map((s) => (
              <div key={s.id} className={`hud-mark mark-${s.id}`} ref={(el) => void (marks.current[s.id] = el)} data-visible="0">
                <span className="hud-dot" />
                <span className="hud-tag">
                  <span className="hud-tag-n nj-mono">{s.n}</span>
                  <span className="hud-tag-k">{SHORT_NAME[s.id]}</span>
                  <span className="hud-tag-v nj-mono" dir="ltr">
                    {s.id === 'probe' ? deg(reading.core) : s.id === 'camera' ? deg(reading.crust, 0) : s.id === 'thermocouple' ? deg(reading.fire, 0) : `${decimal(reading.kg, 1)} kg`}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
        </div>

        <div className="readout">
          <div className="readout-status">
            <span className={`status-dot s-${reading.status}`} aria-hidden />
            <span className="nj-label">{STATUS_LABEL[reading.status]}</span>
            {live.demo && <span className="replay-tag nj-label">{live.reason === 'set' ? 'Demo-tijd' : 'Replay van de laatste avond'}</span>}
          </div>
          <div className="big">
            <span className="nj-label">Kern · in de snijlaag</span>
            <span className="big-row" dir="ltr">
              <Roll text={decimal(reading.core, 1)} className="big-v" />
              <span className="big-u nj-mono">°C</span>
            </span>
            <span className="big-note">
              {reading.core >= CORE_TARGET ? `Boven de ${CORE_TARGET} °C van het huis` : `Nog onder de ${CORE_TARGET} °C van het huis`}
            </span>
          </div>
          <div className="metrics">
            <Metric label="Korst" value={decimal(reading.crust, 0)} unit="°C" note="Naar het vuur" />
            <Metric label="Vuur" value={decimal(reading.fire, 0)} unit="°C" note="Eikenhout" />
            <Metric label="Gewicht" value={decimal(reading.kg, 1)} unit="kg" note={`van ${reading.kgStart} kg`} bar={kgShare} />
            <Metric label="Laatste snede" value={sinceCut.split(' ')[0]} unit={sinceCut.split(' ')[1]} note={`${reading.cuts} snedes vanavond`} />
            <Metric label="Toeren" value={decimal(reading.rpm, 1)} unit="t/min" note="Draait voor het vuur" />
            <Metric label="Afstand" value={String(reading.distance)} unit="cm" note="Tussen vlees en vuur" />
          </div>
          <EveningChart spit={kind} reading={reading} />
          <div className="readout-cta">
            <a className="nj-btn ghost" href="../app/spies">
              Volg de spies in de app
            </a>
            <span className="own-note">Met een melding bij de eerste snede.</span>
          </div>
        </div>
      </div>

      <div className="w-wrap">
        <div className="sensors">
          <div className="sensors-head" data-reveal>
            <span className="proposal nj-label">Voorstel · de installatie</span>
            <p>De waarden op deze pagina zijn die van de demo-avond. In de zaak komen ze van deze vier sensoren, via een kleine gateway in de keuken.</p>
          </div>
          <ol className="sensors-list">
            {SENSORS.map((s, i) => (
              <li key={s.id} className="sensor nj-leather" data-reveal style={{ transitionDelay: `${i * 70}ms` }}>
                <span className="sensor-n nj-mono">{s.n}</span>
                <h3 className="sensor-name">{s.name}</h3>
                <span className="nj-label">{s.where}</span>
                <p>{s.reads}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, unit, note, bar }: { label: string; value: string; unit: string; note: string; bar?: number }) {
  return (
    <div className="metric">
      <span className="nj-label">{label}</span>
      <span className="metric-v" dir="ltr">
        <Roll text={value} />
        <span className="nj-unit nj-mono">{unit}</span>
      </span>
      {bar !== undefined && (
        <span className="metric-bar" aria-hidden>
          <span style={{ width: `${Math.round(Math.max(0, Math.min(1, bar)) * 100)}%` }} />
        </span>
      )}
      <span className="metric-note">{note}</span>
    </div>
  );
}

// ----------------------------------------------------------------------------------------------------------- chart

const W = 640;
const PAD = { l: 44, r: 86, t: 14, b: 26 };
const CORE = '#5A93C9';
const CRUST = '#DB4B22';

type Point = { m: number; core: number; crust: number; fire: number; kg: number };

/** The evening so far: core and crust on one °C scale, the fire and the weight as their own small charts. */
function EveningChart({ spit, reading }: { spit: SpitId; reading: SpitReading }) {
  const live = useLive();
  const minuteKey = Math.floor(live.minute);
  const series = useMemo<Point[]>(() => {
    const from = OPENS;
    const to = Math.max(from + 4, minuteKey);
    return spitSeries(live.ev, spit, from, to, 2);
    // Recomputed once a minute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live.ev.key, spit, minuteKey]);
  const [hover, setHover] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  if (series.length < 2) return null;

  const m0 = series[0].m;
  const m1 = series[series.length - 1].m;
  const x = (m: number) => PAD.l + ((m - m0) / Math.max(1, m1 - m0)) * (W - PAD.l - PAD.r);
  const H1 = 170;
  const H2 = 64;
  const yT = (v: number) => PAD.t + (1 - (v - 60) / (130 - 60)) * (H1 - PAD.t - PAD.b);
  const line = (key: 'core' | 'crust', y: (v: number) => number) => series.map((p, i) => `${i ? 'L' : 'M'}${x(p.m).toFixed(1)},${y(Math.max(60, Math.min(130, p[key]))).toFixed(1)}`).join('');
  const last = series[series.length - 1];
  const hours: number[] = [];
  for (let h = Math.ceil(m0 / 60); h * 60 <= m1; h++) hours.push(h * 60);

  const fireMin = 560;
  const fireMax = 860;
  const yF = (v: number) => 8 + (1 - (Math.max(fireMin, Math.min(fireMax, v)) - fireMin) / (fireMax - fireMin)) * (H2 - 16);
  const fireLine = series.map((p, i) => `${i ? 'L' : 'M'}${x(p.m).toFixed(1)},${yF(p.fire).toFixed(1)}`).join('');
  const yK = (v: number) => 8 + (1 - v / reading.kgStart) * (H2 - 16);
  const kgLine = series.map((p, i) => `${i ? 'L' : 'M'}${x(p.m).toFixed(1)},${yK(p.kg).toFixed(1)}`).join('');

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = svg.current?.getBoundingClientRect();
    if (!r) return;
    const px = ((e.clientX - r.left) / r.width) * W;
    const m = m0 + ((px - PAD.l) / (W - PAD.l - PAD.r)) * (m1 - m0);
    let best = 0;
    for (let i = 1; i < series.length; i++) if (Math.abs(series[i].m - m) < Math.abs(series[best].m - m)) best = i;
    setHover(best);
  };
  const hp = hover !== null ? series[hover] : null;
  const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;

  return (
    <figure className="chart" aria-label={tr('De avond tot nu: kern en korst in °C, het vuur en het gewicht')}>
      <figcaption className="chart-head">
        <span className="nj-label">De avond tot nu</span>
        <span className="chart-legend">
          <span className="lg">
            <i style={{ background: CORE }} /> Kern
          </span>
          <span className="lg">
            <i style={{ background: CRUST }} /> Korst
          </span>
        </span>
      </figcaption>
      <div className="chart-box" dir="ltr">
        <svg
          ref={svg}
          viewBox={`0 0 ${W} ${H1 + H2 * 2 + 28}`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          role="img"
          aria-label={tr('Kern en korst sinds 15:00')}
        >
          {[70, 90, 110, 130].map((v) => (
            <g key={v}>
              <line x1={PAD.l} x2={W - PAD.r} y1={yT(v)} y2={yT(v)} className="grid" />
              <text x={PAD.l - 8} y={yT(v) + 3} className="axis" textAnchor="end">
                {v}°
              </text>
            </g>
          ))}
          <line x1={PAD.l} x2={W - PAD.r} y1={yT(CORE_TARGET)} y2={yT(CORE_TARGET)} className="target" />
          <text x={PAD.l + 4} y={yT(CORE_TARGET) + 12} className="axis">
            {tr('Huisnorm {n} °C').replace('{n}', String(CORE_TARGET))}
          </text>
          <path d={line('crust', yT)} className="ln" style={{ stroke: CRUST }} />
          <path d={line('core', yT)} className="ln" style={{ stroke: CORE }} />
          <circle cx={x(last.m)} cy={yT(Math.min(130, last.crust))} r={4} style={{ fill: CRUST }} className="end" />
          <circle cx={x(last.m)} cy={yT(Math.min(130, last.core))} r={4} style={{ fill: CORE }} className="end" />
          <text x={x(last.m) + 9} y={yT(Math.min(130, last.crust)) + 4} className="dl">
            {tr('Korst {v}').replace('{v}', deg(last.crust, 0))}
          </text>
          <text x={x(last.m) + 9} y={yT(Math.min(130, last.core)) + 4} className="dl">
            {tr('Kern {v}').replace('{v}', deg(last.core))}
          </text>

          <g transform={`translate(0 ${H1})`}>
            <text x={PAD.l} y={4} className="axis strong">
              {tr('Vuur, °C')}
            </text>
            <path d={fireLine} className="ln mute" />
            <text x={x(last.m) + 9} y={yF(last.fire) + 4} className="dl">
              {deg(last.fire, 0)}
            </text>
          </g>
          <g transform={`translate(0 ${H1 + H2})`}>
            <text x={PAD.l} y={4} className="axis strong">
              {tr('Gewicht, kg')}
            </text>
            <path d={kgLine} className="ln mute" />
            <text x={x(last.m) + 9} y={yK(last.kg) + 4} className="dl">
              {`${decimal(last.kg, 1)} kg`}
            </text>
          </g>
          {hours.map((m) => (
            <text key={m} x={x(m)} y={H1 + H2 * 2 + 20} className="axis" textAnchor="middle">
              {hhmm(m)}
            </text>
          ))}
          {hp && (
            <g className="cross">
              <line x1={x(hp.m)} x2={x(hp.m)} y1={PAD.t} y2={H1 + H2 * 2} />
              <circle cx={x(hp.m)} cy={yT(Math.min(130, hp.crust))} r={4} style={{ fill: CRUST }} />
              <circle cx={x(hp.m)} cy={yT(Math.min(130, hp.core))} r={4} style={{ fill: CORE }} />
            </g>
          )}
        </svg>
        {hp && (
          <div className="tip" style={{ left: `${(x(hp.m) / W) * 100}%` }}>
            <span className="tip-t nj-mono">{hhmm(hp.m)}</span>
            <span className="tip-r">
              <i style={{ background: CORE }} />
              <b className="nj-mono">{deg(hp.core)}</b> <span>Kern</span>
            </span>
            <span className="tip-r">
              <i style={{ background: CRUST }} />
              <b className="nj-mono">{deg(hp.crust, 0)}</b> <span>Korst</span>
            </span>
            <span className="tip-r">
              <b className="nj-mono">{deg(hp.fire, 0)}</b> <span>Vuur</span>
            </span>
            <span className="tip-r">
              <b className="nj-mono">{decimal(hp.kg, 1)} kg</b> <span>Gewicht</span>
            </span>
          </div>
        )}
      </div>
    </figure>
  );
}
