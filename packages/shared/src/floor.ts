// The room, as the demo draws it in 3D and on the floor plans: a modernist ground floor on the Vlaamsekaai with an
// open kitchen (two spits before an oak fire, the stone oven, the pass), a leather banquette along the wood-clad back
// wall, travertine tables, the spaceship bar in chrome, window tables on the quay and a heated terrace. The layout is
// the demo's own drawing after Le Fooding's description, not a plan of the real room.
//
// Metres: x runs from the kitchen (left, -8) to the bar (right, +8); z from the back wall (-4.5) to the glass front
// on the quay (+4.5); the terrace and the street lie beyond the glass (z > 4.5).

export type AreaId = 'fire' | 'banquette' | 'center' | 'bar' | 'window' | 'terrace';

export const AREAS: Record<AreaId, { label: string; line: string }> = {
  fire: { label: 'Aan het vuur', line: 'Vier krukken aan de pas, met zicht op de spies en het eikenvuur.' },
  banquette: { label: 'Lederen bank', line: 'Langs de houten wand, in ossenbloedrood leder.' },
  center: { label: 'Travertijn', line: 'De grote tafels in het midden, voor wie gezien wil worden.' },
  bar: { label: 'Spaceship-bar', line: 'Chroom, krukken rondom, de bar als een ruimteschip.' },
  window: { label: 'Aan het raam', line: 'Tafels voor twee achter het glas, met de kaai erachter.' },
  terrace: { label: 'Terras', line: 'Buiten aan de Vlaamsekaai, met warmte en dekens.' },
};

export type Table = {
  id: string;
  label: string;
  area: AreaId;
  seats: number;
  x: number;
  z: number;
  /** Footprint in metres (round tables use w as the diameter). */
  w: number;
  d: number;
  shape: 'rect' | 'round' | 'stool';
};

export const TABLES: Table[] = [
  { id: 'F1', label: 'Vuur 1', area: 'fire', seats: 1, x: -3.9, z: -2.4, w: 0.45, d: 0.45, shape: 'stool' },
  { id: 'F2', label: 'Vuur 2', area: 'fire', seats: 1, x: -3.9, z: -1.5, w: 0.45, d: 0.45, shape: 'stool' },
  { id: 'F3', label: 'Vuur 3', area: 'fire', seats: 1, x: -3.9, z: -0.6, w: 0.45, d: 0.45, shape: 'stool' },
  { id: 'F4', label: 'Vuur 4', area: 'fire', seats: 1, x: -3.9, z: 0.3, w: 0.45, d: 0.45, shape: 'stool' },
  { id: 'B1', label: 'Bank 1', area: 'banquette', seats: 4, x: -2.1, z: -3.55, w: 1.4, d: 0.8, shape: 'rect' },
  { id: 'B2', label: 'Bank 2', area: 'banquette', seats: 4, x: -0.2, z: -3.55, w: 1.4, d: 0.8, shape: 'rect' },
  { id: 'B3', label: 'Bank 3', area: 'banquette', seats: 4, x: 1.7, z: -3.55, w: 1.4, d: 0.8, shape: 'rect' },
  { id: 'B4', label: 'Bank 4', area: 'banquette', seats: 2, x: 3.4, z: -3.55, w: 0.9, d: 0.8, shape: 'rect' },
  { id: 'C1', label: 'Travertijn 1', area: 'center', seats: 6, x: -1.2, z: -0.9, w: 2.2, d: 1.0, shape: 'rect' },
  { id: 'C2', label: 'Travertijn 2', area: 'center', seats: 4, x: 1.5, z: -0.9, w: 1.3, d: 1.3, shape: 'round' },
  { id: 'C3', label: 'Travertijn 3', area: 'center', seats: 4, x: 0.2, z: 1.3, w: 1.6, d: 0.9, shape: 'rect' },
  { id: 'S1', label: 'Bar 1', area: 'bar', seats: 2, x: 3.6, z: 0.9, w: 0.5, d: 0.5, shape: 'stool' },
  { id: 'S2', label: 'Bar 2', area: 'bar', seats: 2, x: 4.9, z: 1.7, w: 0.5, d: 0.5, shape: 'stool' },
  { id: 'S3', label: 'Bar 3', area: 'bar', seats: 2, x: 6.4, z: 1.2, w: 0.5, d: 0.5, shape: 'stool' },
  { id: 'S4', label: 'Bar 4', area: 'bar', seats: 2, x: 6.9, z: -0.6, w: 0.5, d: 0.5, shape: 'stool' },
  { id: 'W1', label: 'Raam 1', area: 'window', seats: 2, x: -2.4, z: 3.75, w: 0.8, d: 0.7, shape: 'rect' },
  { id: 'W2', label: 'Raam 2', area: 'window', seats: 2, x: -0.6, z: 3.75, w: 0.8, d: 0.7, shape: 'rect' },
  { id: 'W3', label: 'Raam 3', area: 'window', seats: 2, x: 3.4, z: 3.75, w: 0.8, d: 0.7, shape: 'rect' },
  { id: 'T1', label: 'Terras 1', area: 'terrace', seats: 4, x: -3.2, z: 6.3, w: 1.2, d: 0.8, shape: 'rect' },
  { id: 'T2', label: 'Terras 2', area: 'terrace', seats: 4, x: -0.9, z: 6.3, w: 1.2, d: 0.8, shape: 'rect' },
  { id: 'T3', label: 'Terras 3', area: 'terrace', seats: 2, x: 4.6, z: 6.3, w: 0.8, d: 0.8, shape: 'round' },
];

export const SEATS = TABLES.reduce((s, t) => s + t.seats, 0);

const BY_ID = new Map(TABLES.map((t) => [t.id, t]));
export const tableById = (id: string): Table | undefined => BY_ID.get(id);

/** The room's fixed parts, for the 3D builders. */
export const ROOM = {
  width: 16,
  depth: 9,
  height: 3.6,
  /** The open kitchen: spits before the fire wall, the stone oven, the pass where plates leave. */
  kitchen: { x0: -8, x1: -4.4, z0: -4.5, z1: 1.6 },
  spits: [
    { id: 'rund' as const, x: -6.7, z: -2.6 },
    { id: 'kip' as const, x: -6.7, z: -0.9 },
  ],
  fire: { x: -7.6, z: -1.75, w: 0.5, d: 3.0 },
  oven: { x: -6.4, z: 0.8, r: 0.95 },
  pass: { x: -4.4, z: -1.0, w: 0.5, d: 3.6 },
  bar: { x: 5.4, z: 0.2, rx: 1.75, rz: 1.15 },
  door: { x: 1.4, z: 4.5, w: 1.6 },
  /** Where the line waits outside, along the glass. */
  line: { x0: 2.6, x1: 7.8, z: 5.2 },
  /** The screen where the night's flash photos play. */
  wall: { x: 7.95, z: -2.2, w: 2.2, h: 1.3 },
} as const;
