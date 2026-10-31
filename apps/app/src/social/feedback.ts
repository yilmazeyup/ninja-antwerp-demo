import { emit, eventsOf, ME, readBridge } from '@ninja/shared';

import { panelAlive } from '../state/autopilot';

/**
 * The answer to her feedback. With the panel open, the floor writes it; without, Baran's answer arrives here after
 * about fifteen seconds, matched to what she said: thanks for a good evening, a question when it was average, an
 * apology and a çay on the house when it was not good.
 */
export function replyFor(taste: number, service: number, vibe: number): string {
  const avg = (taste + service + vibe) / 3;
  if (avg >= 4.5) return `Merci, ${ME.first}. Dat het zo goed zat, doet ons echt plezier. Tot de volgende keer aan het vuur.`;
  if (avg >= 3) return `Dank je, ${ME.first}. Wat kon er beter? Ik lees het met de ploeg en we pakken het aan.`;
  return `Sorry dat het niet goed zat, ${ME.first}. Ik bekijk het vandaag nog met de zaal. Je volgende çay is van ons.`;
}

const pending = new Set<string>();

export function awaitReply(ref: string, taste: number, service: number, vibe: number) {
  if (pending.has(ref)) return;
  pending.add(ref);
  setTimeout(
    () => {
      pending.delete(ref);
      if (eventsOf(readBridge(), 'feedback-reply').some((r) => r.ref === ref)) return;
      emit({ kind: 'feedback-reply', ref, by: 'Baran', text: replyFor(taste, service, vibe) });
    },
    panelAlive() ? 60000 : 15000,
  );
}
