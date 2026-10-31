import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { createRenderer, prefersReducedMotion, type Backend, type Quality } from '@ninja/shared/three';

import { buildPipeline, type Pipeline } from './pipeline';

export type Vec = [number, number, number];

export type StageOptions = {
  camera: Vec;
  target: Vec;
  intro: Vec;
  fov?: number;
  minDistance?: number;
  maxDistance?: number;
  minPolarAngle?: number;
  maxPolarAngle?: number;
  minAzimuthAngle?: number;
  maxAzimuthAngle?: number;
  bounds?: { minX: number; maxX: number; minZ: number; maxZ: number; minY?: number; maxY?: number };
  /** Pixels covered by a rail on the side (right; left in Arabic): the picture centres in the space that is left. */
  shift?: (width: number) => number;
  /** Pixels at the top covered by the header: labels there step aside. */
  safeTop?: number | (() => number);
  /** The quality chosen in the panel; `?q=` in the address wins. */
  quality?: Quality | null;
  /** Narrowest width-to-height ratio of the free area at which the room still fits; narrower views zoom out. */
  fitAspect?: number;
};

export type Frame = (time: number, delta: number) => void;

type Managed = { object: CSS2DObject; element: HTMLElement; priority: () => number; far: number; pinned: () => boolean };

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const CLICK_SLOP = 6;

function shown(object: THREE.Object3D | null): boolean {
  for (let o = object; o; o = o.parent) if (!o.visible) return false;
  return true;
}

const forcedQuality = (): Quality | null => {
  const q = new URLSearchParams(location.search).get('q');
  return q === 'low' || q === 'medium' || q === 'high' ? q : null;
};

/**
 * The panel's 3D view on three.js's WebGPURenderer (WebGPU, or WebGL 2 as fallback): a camera with damped orbit inside
 * limits, the effects pipeline of the chosen quality, HTML labels that never pile up, hover and click on registered
 * objects, smooth camera flights. It sleeps while hidden and frees the GPU when disposed.
 */
export class Stage {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  readonly reducedMotion = prefersReducedMotion();
  time = 0;
  active = true;
  quality: Quality;
  onQuality: ((q: Quality) => void) | null = null;
  /** Called once, after the first frame is on screen. */
  onFirstFrame: (() => void) | null = null;
  /** Pixels covered on the inline-start side (an open drawer): labels there step aside. */
  coverStart = 0;

  private pipe: Pipeline | null = null;
  private readonly labelRenderer = new CSS2DRenderer();
  private readonly frames = new Set<Frame>();
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly resizeObserver: ResizeObserver;
  private readonly visibility: IntersectionObserver;
  private readonly started = performance.now();
  private last = performance.now();
  private onScreen = true;
  private running = false;
  private flight: { from: THREE.Vector3; to: THREE.Vector3; fromTarget: THREE.Vector3; toTarget: THREE.Vector3; start: number; duration: number } | null = null;
  private hoverTargets: THREE.Object3D[] = [];
  private hoverHandler: ((object: THREE.Object3D | null) => void) | null = null;
  private selectHandler: ((object: THREE.Object3D | null) => void) | null = null;
  private hovered: THREE.Object3D | null = null;
  private pointerDirty = false;
  private pointerInside = false;
  private press: { x: number; y: number; at: number } | null = null;
  private readonly managed: Managed[] = [];
  private cullAt = 0;
  private firstFrame = true;
  private rebuilding = false;

  private constructor(
    readonly host: HTMLElement,
    readonly renderer: THREE.WebGPURenderer,
    readonly backend: Backend,
    quality: Quality,
    private readonly options: StageOptions,
  ) {
    this.quality = quality;
    this.camera = new THREE.PerspectiveCamera(options.fov ?? 30, 1, 0.1, 240);
    this.camera.position.set(...(this.reducedMotion ? options.camera : options.intro));

    const canvas = renderer.domElement;
    canvas.className = 'stage-canvas';
    host.appendChild(canvas);
    this.labelRenderer.domElement.className = 'stage-labels';
    host.appendChild(this.labelRenderer.domElement);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.set(...options.target);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.rotateSpeed = 0.55;
    this.controls.zoomSpeed = 0.8;
    this.controls.panSpeed = 0.75;
    this.controls.screenSpacePanning = false;
    this.controls.minDistance = options.minDistance ?? 3;
    this.controls.maxDistance = options.maxDistance ?? 40;
    this.controls.minPolarAngle = options.minPolarAngle ?? 0.2;
    this.controls.maxPolarAngle = options.maxPolarAngle ?? 1.35;
    if (options.minAzimuthAngle !== undefined) this.controls.minAzimuthAngle = options.minAzimuthAngle;
    if (options.maxAzimuthAngle !== undefined) this.controls.maxAzimuthAngle = options.maxAzimuthAngle;
    this.controls.enabled = this.reducedMotion;
    this.controls.addEventListener('start', () => {
      this.flight = null;
      host.classList.add('grabbing');
    });
    this.controls.addEventListener('end', () => host.classList.remove('grabbing'));
    this.camera.lookAt(...options.target);

    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerleave', this.onPointerLeave);
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointerup', this.onPointerUp);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.visibility = new IntersectionObserver(([entry]) => {
      this.onScreen = entry.isIntersecting;
    });
    this.visibility.observe(host);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.resize();
  }

  /** Starts the GPU (WebGPU, else WebGL 2) and the stage on it. */
  static async create(host: HTMLElement, options: StageOptions): Promise<Stage> {
    const { renderer, backend, quality: auto } = await createRenderer({ antialias: false, shadows: true });
    const quality = forcedQuality() ?? options.quality ?? auto;
    renderer.toneMapping = THREE.AgXToneMapping;
    renderer.toneMappingExposure = 1.22;
    const stage = new Stage(host, renderer, backend, quality, options);
    stage.applyQuality();
    return stage;
  }

  private applyQuality() {
    const ratio = Math.min(window.devicePixelRatio || 1, this.quality === 'high' ? 1.5 : this.quality === 'medium' ? 1.25 : 1);
    this.renderer.setPixelRatio(ratio);
    this.renderer.shadowMap.enabled = this.quality !== 'low';
    this.resize();
  }

  /** Builds the effects for the current quality (after the scene has its content). */
  buildPipeline() {
    this.pipe?.dispose();
    this.pipe = buildPipeline(this.renderer, this.scene, this.camera, this.quality);
  }

  /** Another quality: the scene owner rebuilds its content in `onQuality`, then the effects follow. */
  async setQuality(q: Quality) {
    if (q === this.quality || this.rebuilding) return;
    this.rebuilding = true;
    this.quality = q;
    this.applyQuality();
    this.onQuality?.(q);
    this.buildPipeline();
    this.firstFrame = true;
    this.rebuilding = false;
  }

  /** Compiles every material before the first frame, so the room appears whole. */
  async warm() {
    try {
      await this.renderer.compileAsync(this.scene, this.camera);
    } catch {
      // Some backends compile lazily; the first frames then do it.
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    // The camera glides in from above once the room is on screen.
    if (!this.reducedMotion && !this.flight) this.flyTo(this.options.camera, this.options.target, 2800);
    else this.controls.enabled = true;
    this.renderer.setAnimationLoop(this.loop);
  }

  onFrame(frame: Frame): () => void {
    this.frames.add(frame);
    return () => this.frames.delete(frame);
  }

  label(element: HTMLElement, parent: THREE.Object3D, position: Vec, options: { priority?: () => number; far?: number; pinned?: () => boolean; center?: [number, number] } = {}): CSS2DObject {
    const object = new CSS2DObject(element);
    object.position.set(...position);
    object.center.set(...(options.center ?? [0.5, 1]));
    parent.add(object);
    if (options.priority) this.managed.push({ object, element, priority: options.priority, far: options.far ?? Infinity, pinned: options.pinned ?? (() => false) });
    return object;
  }

  forgetLabel(object: CSS2DObject) {
    const i = this.managed.findIndex((m) => m.object === object);
    if (i >= 0) this.managed.splice(i, 1);
    object.element.remove();
    object.removeFromParent();
  }

  setHoverTargets(targets: THREE.Object3D[], handler: (object: THREE.Object3D | null) => void) {
    this.hoverTargets = targets;
    this.hoverHandler = handler;
    this.pointerDirty = true;
  }

  onSelect(handler: (object: THREE.Object3D | null) => void) {
    this.selectHandler = handler;
  }

  flyTo(position: Vec, target: Vec, duration = 1600) {
    this.controls.enabled = false;
    this.flight = {
      from: this.camera.position.clone(),
      to: new THREE.Vector3(...position),
      fromTarget: this.controls.target.clone(),
      toTarget: new THREE.Vector3(...target),
      start: performance.now(),
      duration: this.reducedMotion ? 1 : duration,
    };
  }

  get distance() {
    return this.camera.position.distanceTo(this.controls.target);
  }

  get gpuLabel() {
    return this.backend === 'webgpu' ? 'WebGPU' : 'WebGL 2';
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.resizeObserver.disconnect();
    this.visibility.disconnect();
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointermove', this.onPointerMove);
    canvas.removeEventListener('pointerleave', this.onPointerLeave);
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('pointerup', this.onPointerUp);
    this.controls.dispose();
    this.pipe?.dispose();
    this.scene.environment?.dispose();
    this.renderer.dispose();
    canvas.remove();
    this.labelRenderer.domElement.remove();
  }

  resize() {
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(width, height, false);
    this.labelRenderer.setSize(width, height);
    this.camera.aspect = width / height;
    const shift = this.options.shift?.(width) ?? 0;
    const free = (width - 2 * shift) / height;
    this.camera.zoom = this.options.fitAspect ? Math.min(1, free / this.options.fitAspect) : 1;
    const px = shift * (document.documentElement.dir === 'rtl' ? -1 : 1);
    const filmWidth = this.camera.filmGauge * Math.min(this.camera.aspect, 1);
    const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    this.camera.filmOffset = (px / width) * ((this.camera.aspect * 2 * tan) / this.camera.zoom) * filmWidth;
    this.camera.updateProjectionMatrix();
  }

  private toPointer(event: { clientX: number; clientY: number }) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
  }

  private onVisibility = () => {
    this.last = performance.now();
  };

  private onPointerMove = (event: PointerEvent) => {
    this.toPointer(event);
    this.pointerDirty = true;
    this.pointerInside = true;
  };

  private onPointerLeave = () => {
    this.pointerInside = false;
    this.pointerDirty = true;
  };

  private onPointerDown = (event: PointerEvent) => {
    this.press = { x: event.clientX, y: event.clientY, at: performance.now() };
  };

  private onPointerUp = (event: PointerEvent) => {
    const press = this.press;
    this.press = null;
    if (!press || !this.selectHandler) return;
    if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > CLICK_SLOP || performance.now() - press.at > 700) return;
    this.toPointer(event);
    this.selectHandler(this.hit());
  };

  private hit(): THREE.Object3D | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    for (const hit of this.raycaster.intersectObjects(this.hoverTargets, false)) {
      let object: THREE.Object3D | null = hit.object;
      while (object && !this.hoverTargets.includes(object)) object = object.parent;
      if (object) return object;
    }
    return null;
  }

  private pick() {
    if (!this.pointerDirty || !this.hoverHandler) return;
    this.pointerDirty = false;
    const found = this.pointerInside ? this.hit() : null;
    if (found !== this.hovered) {
      this.hovered = found;
      this.hoverHandler(found);
      this.renderer.domElement.style.cursor = found ? 'pointer' : '';
    }
  }

  /** Labels that would cover each other: the most important stays, the rest fade out; far away, details rest. */
  private cull(now: number) {
    if (now < this.cullAt) return;
    this.cullAt = now + 140;
    const width = this.host.clientWidth;
    const height = this.host.clientHeight;
    const distance = this.distance;
    const v = new THREE.Vector3();
    const safeTop = typeof this.options.safeTop === 'function' ? this.options.safeTop() : (this.options.safeTop ?? 0);
    const rail = this.options.shift ? this.options.shift(width) * 2 : 0;
    const rtl = document.documentElement.dir === 'rtl';
    const items = this.managed
      .filter((m) => shown(m.object) && m.object.element.style.display !== 'none')
      .map((m) => {
        m.object.getWorldPosition(v);
        const depth = v.distanceTo(this.camera.position);
        v.project(this.camera);
        const w = m.element.offsetWidth;
        const h = m.element.offsetHeight;
        const x = (v.x * 0.5 + 0.5) * width - w * m.object.center.x;
        const y = (-v.y * 0.5 + 0.5) * height - h * m.object.center.y;
        return { m, rect: [x, y, w, h] as const, behind: v.z > 1, priority: m.pinned() ? 1e6 : m.priority() - depth * 0.01 };
      })
      .sort((a, b) => b.priority - a.priority);
    const placed: (readonly [number, number, number, number])[] = [];
    for (const item of items) {
      const [x, y, w, h] = item.rect;
      const pinned = item.m.pinned();
      if (!pinned && item.m.priority() < 0) {
        if (item.m.element.dataset.culled !== '1') item.m.element.dataset.culled = '1';
        continue;
      }
      const tooFar = !pinned && distance > item.m.far;
      const overlaps = placed.some(([px, py, pw, ph]) => x < px + pw + 4 && x + w > px - 4 && y < py + ph + 3 && y + h > py - 3);
      const underRail = (rail > 0 && (rtl ? x < rail + 10 : x + w > width - rail - 10)) || (this.coverStart > 0 && (rtl ? x + w > width - this.coverStart : x < this.coverStart));
      const outside = y < safeTop || x < 8 || x + w > width - 8 || y + h > height - 8;
      const hide = item.behind || tooFar || (!pinned && (overlaps || outside || underRail));
      if (!hide) placed.push(item.rect);
      if ((item.m.element.dataset.culled === '1') !== hide) item.m.element.dataset.culled = hide ? '1' : '0';
    }
  }

  private loop = (now: number) => {
    if (!this.pipe || this.rebuilding || !this.onScreen || !this.active || document.hidden) {
      this.last = now;
      return;
    }
    const delta = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.time = (now - this.started) / 1000;

    if (this.flight) {
      const t = Math.min(1, (now - this.flight.start) / this.flight.duration);
      const k = easeInOut(t);
      this.camera.position.lerpVectors(this.flight.from, this.flight.to, k);
      this.controls.target.lerpVectors(this.flight.fromTarget, this.flight.toTarget, k);
      this.camera.lookAt(this.controls.target);
      if (t >= 1) {
        this.flight = null;
        this.controls.enabled = true;
      }
    } else {
      this.controls.update(delta);
      const b = this.options.bounds;
      if (b) {
        const t = this.controls.target;
        const clamped = new THREE.Vector3(THREE.MathUtils.clamp(t.x, b.minX, b.maxX), THREE.MathUtils.clamp(t.y, b.minY ?? -Infinity, b.maxY ?? Infinity), THREE.MathUtils.clamp(t.z, b.minZ, b.maxZ));
        if (!clamped.equals(t)) {
          const shift = clamped.clone().sub(t);
          t.add(shift);
          this.camera.position.add(shift);
        }
      }
    }

    this.pick();
    for (const frame of this.frames) frame(this.time, delta);
    this.pipe.render();
    this.labelRenderer.render(this.scene, this.camera);
    this.cull(now);
    if (this.firstFrame) {
      this.firstFrame = false;
      this.onFirstFrame?.();
    }
  };
}
