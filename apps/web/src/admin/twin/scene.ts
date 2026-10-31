import * as THREE from 'three/webgpu';
import {
  celsius,
  daylight,
  euro,
  fireAt,
  formatNo,
  lineAt,
  myLine,
  RANK_PRIORITY,
  seatedAt,
  tableById,
  TABLES,
  trHtml,
  waitFor,
  WALL_SEED,
  type Rank,
} from '@ninja/shared';
import { createRoom, roomEnvironment, type Room } from '@ninja/shared/three/room';
import type { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

import { asset } from '../../common/install';
import { appTable, arcs, CALLS, openCalls, phaseOf, PHASES, platesInFlight, spitNow, tableLabel, twinPlates } from '../derive';
import type { Live } from '../live';
import type { Stage, Vec } from '../three/stage';

export type ViewId = 'overzicht' | 'vuur' | 'zaal' | 'bar' | 'rij';

export const VIEWS: Record<ViewId, { label: string; camera: Vec; target: Vec }> = {
  overzicht: { label: 'Overzicht', camera: [0.9, 17.6, 21.9], target: [-0.45, 0.0, 1.1] },
  vuur: { label: 'Vuur', camera: [-4.9, 3.5, 3.6], target: [-7.0, 1.2, -1.4] },
  zaal: { label: 'Zaal', camera: [5.4, 6.4, 7.6], target: [-0.4, 0.5, -1.2] },
  bar: { label: 'Bar', camera: [1.7, 3.5, 4.0], target: [5.6, 0.85, -0.3] },
  rij: { label: 'Rij', camera: [12.6, 3.3, 11.6], target: [5.4, 0.9, 5.4] },
};

const HEART = '<svg viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.4 4.5 6.9 4.5c2 0 3.6 1.1 5.1 3 1.5-1.9 3.1-3 5.1-3 3.5 0 5.5 3.5 4.2 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" fill="none" stroke="#FF7A8A" stroke-width="1.6"/></svg>';
const GLASS = '<svg viewBox="0 0 24 24"><path d="M8 3h8l-1 5c-.4 2 1.6 3.6 1.6 6.5C16.6 18 14.6 21 12 21s-4.6-3-4.6-6.5C7.4 11.6 9.4 10 9 8z" fill="none" stroke="#FFB547" stroke-width="1.5"/></svg>';

type Chip = { object: CSS2DObject; el: HTMLDivElement; html: string; priority: number };

/**
 * The live twin: Ninja's room (shared builder), and on top of it what is happening now — guests at their tables, the
 * line along the glass, plates on their way with their passport, calls, drinks and matches across the room — with
 * labels that never pile up.
 */
export class TwinScene {
  room: Room;
  private readonly labels = new THREE.Group();
  private readonly chips = new Map<string, Chip>();
  private readonly tags = new Map<string, { object: CSS2DObject; el: HTMLDivElement }>();
  private readonly beaconLabels: { object: CSS2DObject; el: HTMLDivElement; html: string }[] = [];
  private readonly hearts: { object: CSS2DObject; el: HTMLDivElement; html: string }[] = [];
  private lineLabel: { object: CSS2DObject; el: HTMLDivElement; html: string } | null = null;
  private live: Live | null = null;
  private hovered: string | null = null;
  selected: string | null = null;
  onSelect: ((table: string | null) => void) | null = null;
  private readonly loader = new THREE.TextureLoader();
  private readonly textures = new Map<string, THREE.Texture>();
  private slide = -1;

  constructor(private readonly stage: Stage) {
    const { scene } = stage;
    scene.environment = roomEnvironment(stage.renderer);
    scene.environmentIntensity = 1.0;
    this.room = this.build();
    scene.background = this.room.sky;
    scene.fog = new THREE.Fog(this.room.sky.clone(), 28, 72);
    this.labels.name = 'labels';
    scene.add(this.labels);
    this.makeLabels();

    stage.onQuality = () => {
      this.room.dispose();
      this.room = this.build();
      scene.background = this.room.sky;
      this.slide = -1;
      if (this.live) this.sync(this.live);
    };
    stage.onFrame((t, dt) => {
      if (this.live) this.room.setMinute(this.live.m + (performance.now() - this.live.perf) / 60000);
      this.room.update(t, dt);
      (scene.fog as THREE.Fog).color.copy(this.room.sky);
      const k = Math.floor(t / 8) % WALL_SEED.length;
      if (k !== this.slide) {
        this.slide = k;
        this.room.setScreen(this.texture(`photos/${WALL_SEED[k].photo}.webp`));
      }
    });
    stage.onSelect((o) => {
      const id = (o?.userData.table as string | undefined) ?? null;
      this.select(id);
    });
  }

  private texture(path: string) {
    let t = this.textures.get(path);
    if (!t) {
      t = this.loader.load(asset(path));
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      this.textures.set(path, t);
    }
    return t;
  }

  private build(): Room {
    const room = createRoom({ quality: this.stage.quality, people: true, outside: true });
    this.stage.scene.add(room.group);
    room.setSign(this.texture('brand/logo.png'));
    this.stage.setHoverTargets(room.pickables, (o) => {
      this.hovered = (o?.userData.table as string | undefined) ?? null;
      this.paintHalos();
    });
    return room;
  }

  select(id: string | null) {
    this.selected = id;
    this.paintHalos();
    this.refreshChips();
    this.onSelect?.(id);
  }

  private paintHalos() {
    const ids = [this.selected, this.hovered].filter((x): x is string => !!x);
    this.room.highlight([...new Set(ids)], this.selected && !this.hovered ? '#F4ECE1' : '#FFB547');
  }

  private makeLabels() {
    const { stage } = this;
    for (const t of TABLES) {
      const el = document.createElement('div');
      el.className = 'chip free';
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.select(this.selected === t.id ? null : t.id);
      });
      const a = this.room.anchor(t.id);
      const lift = t.area === 'fire' ? 0.75 : t.area === 'bar' ? 0.9 : t.area === 'terrace' ? 1.05 : 0.95;
      const chip: Chip = { object: null as unknown as CSS2DObject, el, html: '', priority: 0 };
      chip.object = stage.label(el, this.labels, [a.x, a.y + lift, a.z], { priority: () => chip.priority, far: 34 });
      this.chips.set(t.id, chip);
    }
    const lineEl = document.createElement('div');
    lineEl.className = 'line-label';
    const head = this.room.lineHead();
    this.lineLabel = { object: stage.label(lineEl, this.labels, [head.x + 0.6, head.y + 0.25, head.z + 0.1], { priority: () => 40, pinned: () => true }), el: lineEl, html: '' };
  }

  private refreshChips() {
    for (const [id, c] of this.chips) c.el.classList.toggle('sel', id === this.selected);
  }

  /** Brings the room to `live`: called every second and whenever the bridge changes. */
  sync(live: Live) {
    this.live = live;
    const { ev, m, now, bridge } = live;
    const room = this.room;

    room.setDaylight(daylight(now));
    const fire = fireAt(ev, m);
    room.setFire(0.25 + Math.max(0, Math.min(1.15, (fire - 560) / 260)));
    const rund = spitNow(live, 'rund');
    const kip = spitNow(live, 'kip');
    room.setSpits({ rund: rund.kg / rund.kgStart, kip: kip.kg / kip.kgStart });
    const lastCut = Math.min(rund.lastCut, kip.lastCut);
    room.carving(lastCut < 8 ? (rund.lastCut <= kip.lastCut ? 'rund' : 'kip') : null);

    // Guests at their tables, the app guest included.
    const seated = seatedAt(ev, m);
    const app = appTable(live);
    const guests = seated.map((g) => ({ table: g.table!, size: g.size, seed: g.id }));
    const mine = myLine(bridge);
    if (app && !seated.some((g) => g.table === app) && mine?.seat) guests.push({ table: app, size: mine.joined.size, seed: 'app-guest' });
    room.setGuests(guests);

    // The line, by rank and then arrival, the app guest in her place.
    const line = lineAt(ev, m).sort((a, b) => (b.rank ? RANK_PRIORITY[b.rank] + 1 : 0) - (a.rank ? RANK_PRIORITY[a.rank] + 1 : 0) || a.arrive - b.arrive);
    const queue = line.map((g) => ({ seed: g.id, size: g.size, rank: g.rank }));
    if (mine && !mine.seat && !mine.call) {
      const r = mine.joined.rank as Rank;
      const p = RANK_PRIORITY[r] !== undefined ? RANK_PRIORITY[r] + 1 : 0;
      const at = queue.findIndex((q) => (q.rank ? RANK_PRIORITY[q.rank] + 1 : 0) < p);
      queue.splice(at < 0 ? queue.length : at, 0, { seed: 'app-guest', size: mine.joined.size, rank: r });
    }
    room.setLine(queue);

    room.setMinute(live.m + (performance.now() - live.perf) / 60000);
    room.setPlates(twinPlates(live));
    const calls = openCalls(live);
    room.setBeacons(calls.slice(0, 8).map((c) => ({ table: c.table, color: c.call === 'rekening' ? '#FFB547' : '#FF5B4D' })));
    // Arcs across the room read from afar; up close they would cross the picture.
    const arcList = this.stage.distance < 9 ? [] : arcs(live);
    room.setArcs(arcList.map((a) => ({ from: a.from, to: a.to, color: a.color })));

    this.syncChips(live, seated, app);
    this.syncTags(live);
    this.syncBeacons(calls);
    this.syncHearts(arcList);
    this.syncLine(live, line.length + (mine && !mine.seat && !mine.call ? 1 : 0), queue.reduce((s, q) => s + q.size, 0));
  }

  private syncChips(live: Live, seated: ReturnType<typeof seatedAt>, app: string | null) {
    const byTable = new Map(seated.map((g) => [g.table!, g]));
    for (const [id, chip] of this.chips) {
      const g = byTable.get(id);
      const t = tableById(id)!;
      let html: string;
      if (g) {
        const phase = phaseOf(live.ev, g, live.m);
        const minutes = Math.max(0, Math.round(live.m - (g.seated ?? live.m)));
        const spend = g.orderAt !== null && g.orderAt <= live.m ? euro(g.spend) : '—';
        html = `<div class="bar" style="background:${PHASES[phase].color}"></div><div class="in"><div class="t">${t.label}</div><div class="n">${g.name} · ${g.size} pers.</div><div class="m">${minutes} min · ${spend}</div></div>`;
        chip.priority = { rekening: 6, besteld: 5, binnen: 4, eet: 3 }[phase];
        chip.el.classList.remove('free');
      } else if (id === app) {
        html = `<div class="bar" style="background:#FFB547"></div><div class="in"><div class="t">${t.label}</div><div class="n">App-gast</div><div class="m">via de app</div></div>`;
        chip.priority = 7;
        chip.el.classList.remove('free');
      } else {
        html = `<div class="in"><div class="t">${t.label} · vrij</div></div>`;
        // Free tables only show up close, or while the room is quiet.
        chip.priority = this.stage.distance < 13 ? 0.5 : -1;
        chip.el.classList.add('free');
      }
      chip.el.classList.toggle('app', id === app);
      if (id === this.selected) chip.priority = 100;
      if (html !== chip.html) {
        chip.html = html;
        chip.el.innerHTML = trHtml(html);
      }
    }
  }

  private syncTags(live: Live) {
    const flying = platesInFlight(live);
    const keep = new Set(flying.map((f) => f.id));
    for (const [id, tag] of this.tags) {
      if (keep.has(id) && this.room.plateObject(id) === tag.object.parent) continue;
      this.stage.forgetLabel(tag.object);
      this.tags.delete(id);
    }
    for (const f of flying) {
      if (this.tags.has(f.id)) continue;
      const parent = this.room.plateObject(f.id);
      if (!parent) continue;
      const el = document.createElement('div');
      el.className = 'tag';
      el.innerHTML = trHtml(`<span class="nj-kanji" translate="no">忍</span>No. ${f.no ? formatNo(f.no) : '—'} · ${celsius(f.core)}`);
      const object = this.stage.label(el, parent, [0, 0.2, 0], { priority: () => 9 });
      this.tags.set(f.id, { object, el });
    }
  }

  private syncBeacons(calls: ReturnType<typeof openCalls>) {
    const list = calls.slice(0, 8);
    while (this.beaconLabels.length < list.length) {
      const el = document.createElement('div');
      el.className = 'beacon-label';
      this.beaconLabels.push({ object: this.stage.label(el, this.labels, [0, 0, 0], { priority: () => 30, pinned: () => false }), el, html: '' });
    }
    this.beaconLabels.forEach((b, i) => {
      const c = list[i];
      b.object.visible = !!c;
      if (!c) return;
      const a = this.room.anchor(c.table);
      const t = tableById(c.table)!;
      b.object.position.set(t.area === 'fire' ? t.x : a.x, 2.72, t.area === 'fire' ? t.z : a.z);
      const html = `<span class="nj-live"></span>${CALLS[c.call]} · ${tableLabel(c.table)}`;
      b.el.style.borderColor = c.call === 'rekening' ? 'rgba(255,181,71,0.7)' : '';
      if (html !== b.html) {
        b.html = html;
        b.el.innerHTML = trHtml(html);
      }
    });
  }

  private syncHearts(list: ReturnType<typeof arcs>) {
    while (this.hearts.length < list.length) {
      const el = document.createElement('div');
      el.className = 'heart';
      this.hearts.push({ object: this.stage.label(el, this.labels, [0, 0, 0], { priority: () => 12, center: [0.5, 0.5] }), el, html: '' });
    }
    this.hearts.forEach((h, i) => {
      const a = list[i];
      h.object.visible = !!a;
      if (!a) return;
      const top = this.room.arcTop(a.from, a.to);
      h.object.position.copy(top);
      h.el.classList.toggle('cay', a.kind === 'cay');
      const html = `${a.kind === 'cay' ? GLASS : HEART}<span>${a.label}</span>`;
      if (html !== h.html) {
        h.html = html;
        h.el.innerHTML = trHtml(html);
      }
    });
  }

  private syncLine(live: Live, groups: number, people: number) {
    if (!this.lineLabel) return;
    const wait = waitFor(live.ev, live.m);
    const html =
      groups > 0
        ? `<div class="nj-label">De rij aan de Vlaamsekaai</div><div class="big"><span class="nj-mono">${groups}</span><small>${groups === 1 ? 'groep' : 'groepen'} · ${people} pers. · ±${wait} min</small></div>`
        : `<div class="nj-label">De rij aan de Vlaamsekaai</div><div class="big"><small>Niemand wacht: meteen binnen</small></div>`;
    if (html !== this.lineLabel.html) {
      this.lineLabel.html = html;
      this.lineLabel.el.innerHTML = trHtml(html);
    }
  }

  fly(view: ViewId) {
    const v = VIEWS[view];
    this.stage.flyTo(v.camera, v.target, 1700);
  }

  /** Flies to a table and keeps it in view beside the drawer. */
  focus(table: string) {
    const t = tableById(table);
    if (!t) return;
    const a = this.room.anchor(table);
    this.stage.flyTo([a.x + 2.6, 4.6, a.z + 5.2], [a.x - 0.4, 0.6, a.z], 1400);
  }

  dispose() {
    for (const c of this.chips.values()) this.stage.forgetLabel(c.object);
    for (const t of this.tags.values()) this.stage.forgetLabel(t.object);
    for (const t of this.textures.values()) t.dispose();
    this.room.dispose();
    this.stage.dispose();
  }
}
