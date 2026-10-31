import { useSyncExternalStore } from 'react';

import type { Answer } from '../lib/sensei';

/**
 * The social side's own memory on this device (Match, Flash, the Wall, Sensei, the card): kept apart from the app's
 * state under its own key, so "Demo opnieuw" can clear both. What happens between the guest and the floor (likes,
 * chats, drinks, photos, bookings) lives on the bridge; this keeps only what the screens need on top of it.
 */

export type Shot = {
  id: string;
  /** Real clock, ms. */
  at: number;
  /** A small JPEG (data URL) for the list and the Wall. */
  thumb: string;
  caption: string;
  overlay: 'live' | 'ninja' | 'puur';
  passport?: number;
  /** The bridge ref when it went to the Wall. */
  wall?: string;
};

export type SenseiMessage = { id: string; at: number; me: boolean; text: string; answer?: Answer };

export type ChatNote = { id: string; persona: string; at: number; text: string };

export type SocialState = {
  /** Her Match photo: a small JPEG, or null for the demo portrait. */
  selfie: string | null;
  selfieFrom: 'camera' | 'library' | 'demo' | null;
  /** What she eats tonight, for her Match card (a dish id). */
  eating: string | null;
  /** One line about herself on her card. */
  myLine: string;
  blocked: string[];
  reported: string[];
  /** Per persona: when she last read the chat (real clock, ms). */
  read: Record<string, number>;
  /** "Deel een tafel": asked at, and the table Noor found. */
  share: Record<string, { at: number; table?: string }>;
  /** Notes from the floor inside a chat (Noor about a shared table). */
  notes: ChatNote[];
  /** The "Het is wederzijds" moment, shown once per person. */
  seenMutual: string[];
  /** The real day Match last ran: likes and passes start fresh each evening. */
  matchDay: string;
  wallLikes: string[];
  shots: Shot[];
  sensei: SenseiMessage[];
  /** The card was added to a wallet (demo). */
  wallet: boolean;
  /** Names on the guest list of her own spit. */
  invited: string[];
  /** Feedback she sent, waiting for the floor's answer. */
  feedbackRef: string | null;
};

const DEFAULTS: SocialState = {
  selfie: null,
  selfieFrom: null,
  eating: null,
  myLine: '',
  blocked: [],
  reported: [],
  read: {},
  share: {},
  notes: [],
  seenMutual: [],
  matchDay: '',
  wallLikes: [],
  shots: [],
  sensei: [],
  wallet: false,
  invited: [],
  feedbackRef: null,
};

const KEY = 'ninja-social-v1';

function load(): SocialState {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<SocialState>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

let state: SocialState = load();
const listeners = new Set<() => void>();

function persist() {
  // Photos are the heavy part: keep the newest few with their pictures.
  const shots = state.shots.slice(-12);
  const sensei = state.sensei.slice(-60);
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify({ ...state, shots, sensei }));
  } catch {
    // A full disk or a private window: the demo goes on in memory.
  }
}

export function getSocial(): SocialState {
  return state;
}

export function setSocial(change: Partial<SocialState> | ((s: SocialState) => Partial<SocialState>)) {
  state = { ...state, ...(typeof change === 'function' ? change(state) : change) };
  persist();
  listeners.forEach((l) => l());
}

export function resetSocial() {
  state = DEFAULTS;
  try {
    globalThis.localStorage?.removeItem(KEY);
  } catch {
    // Nothing stored.
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** The social state, redrawn when it changes. */
export function useSocial(): SocialState {
  return useSyncExternalStore(subscribe, getSocial, getSocial);
}

// ------------------------------------------------------------------------------------------------ passing moments

/**
 * What is happening right now and is not worth keeping: who is typing, which reply is on its way. Kept in memory
 * only; a reload starts it again from the bridge.
 */
type Live = { typing: Record<string, number> };

let live: Live = { typing: {} };
const liveListeners = new Set<() => void>();

export function setLive(change: (l: Live) => Live) {
  live = change(live);
  liveListeners.forEach((l) => l());
}

const subscribeLive = (l: () => void) => {
  liveListeners.add(l);
  return () => liveListeners.delete(l);
};

export function useLive(): Live {
  return useSyncExternalStore(subscribeLive, () => live, () => live);
}
