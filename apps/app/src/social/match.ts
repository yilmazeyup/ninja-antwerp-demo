import {
  addDays,
  atMinute,
  clock,
  CLOSES,
  dishById,
  emit,
  eventsOf,
  hash,
  matchTonight,
  personaById,
  readBridge,
  startOfDay,
  wallClock,
  type BridgeState,
  type Evening,
  type Group,
  type Persona,
  type Tonight,
} from '@ninja/shared';

import { PEOPLE } from '../photos';
import { clockNow } from '../state/app';
import { freeTable } from '../state/autopilot';
import { getSocial, setLive, setSocial } from './store';
import { newRef } from './util';

/**
 * Ninja Match on the guest's side: who is on tonight, what they ordered, the chat and its replies. The people are the
 * demo's invented guests (social.ts); their answers are written here, and arrive a few seconds after hers, the way a
 * person at another table would type them.
 */

export const portraitOf = (p: Persona | undefined) => (p ? PEOPLE[p.photo] : undefined);

/** Margaux's own demo portrait, for when there is no camera. */
export const DEMO_SELFIE = PEOPLE.me;

/** The moment everything of Match disappears: the last 22:00 on Antwerp's clock, as real time (ms). */
export function lastClosing(real = Date.now()): number {
  const wall = wallClock(new Date(real));
  let closing = atMinute(startOfDay(wall), CLOSES);
  if (closing.getTime() > wall.getTime()) closing = atMinute(addDays(startOfDay(wall), -1), CLOSES);
  return real - (wall.getTime() - closing.getTime());
}

/** What this person eats and drinks tonight, as the card shows it: one plate from the table's order and a drink. */
export function orderedOf(group: Group, who = ''): string[] {
  const mains = group.orders.filter((o) => ['menu', 'kebab'].includes(dishById(o.dish).cat) || o.dish === 'falafel-hummus');
  const drinks = group.orders.filter((o) => ['alcohol', 'cold', 'hot', 'iced'].includes(dishById(o.dish).cat));
  const pick = <T,>(list: T[]) => (list.length ? list[hash(`${who}-${group.id}`) % list.length] : undefined);
  return [pick(mains), pick(drinks)].filter((o): o is (typeof group.orders)[number] => !!o).map((o) => dishById(o.dish).name);
}

/** Everyone with Match on right now, without the people she blocked. */
export function tonightList(ev: Evening, minute: number, blocked: string[]): Tonight[] {
  return matchTonight(ev, minute).filter((t) => !blocked.includes(t.persona.id));
}

/** When the room has the most people with Match on, later tonight (every quarter of an hour). */
export function busiestLater(ev: Evening, minute: number): { minute: number; count: number } | null {
  let best: { minute: number; count: number } | null = null;
  for (let m = Math.ceil(minute / 15) * 15; m <= CLOSES - 30; m += 15) {
    const count = matchTonight(ev, m).length;
    if (!best || count > best.count) best = { minute: m, count };
  }
  return best && best.count > 0 ? best : null;
}

/** Tonight's Match events (since the last closing): likes, mutual likes and the chats. */
export function matchEvents(bridge: BridgeState) {
  const since = lastClosing();
  const fresh = <T extends { at: number }>(list: T[]) => list.filter((e) => e.at > since);
  return {
    likes: fresh(eventsOf(bridge, 'match-like')),
    mutual: fresh(eventsOf(bridge, 'match-mutual')),
    chats: fresh(eventsOf(bridge, 'match-chat')),
    drinks: fresh(eventsOf(bridge, 'cay')),
    delivered: fresh(eventsOf(bridge, 'cay-done')),
    on: fresh(eventsOf(bridge, 'match-on')),
  };
}

export const isMutual = (bridge: BridgeState, persona: string) => matchEvents(bridge).mutual.some((m) => m.persona === persona);

/** The drinks she sent tonight, per person: still on the way, or brought by the floor. */
export function drinksOf(events: ReturnType<typeof matchEvents>): Map<string, 'sent' | 'brought'> {
  const done = new Set(events.delivered.map((d) => d.ref));
  const out = new Map<string, 'sent' | 'brought'>();
  for (const d of events.drinks) out.set(d.persona, done.has(d.id) || out.get(d.persona) === 'brought' ? 'brought' : 'sent');
  return out;
}

// ------------------------------------------------------------------------------------------------------- replies

/** Each person's own answers, in order; after these, a short goodbye. */
const LINES: Record<string, string[]> = {
  'p-ines': ['Betrapt: de Iskender. Maar ik blijf voor de rakı, zoals beloofd.', 'Heb jij ook goesting? Ik laat Seppe er twee brengen, met ijs en water.', 'Ik zit aan het raam. Kom gerust, er is plaats.'],
  'p-arno': ['Dag! Ik kom eigenlijk voor het gebouw. Die gevel aan de kaai is pure jaren zestig.', 'Waar werk jij aan? Ik teken nu een paviljoen in het Zuid.', 'Zullen we straks aan de toog verder praten? De çay is van mij.'],
  'p-fien': ['Haha, ja! Mijn wegwerpcamera heeft nog negen foto’s. Eén is voor jou.', 'Die flitsfoto’s van Ninja zelf, zo wil ik ook leren fotograferen.', 'Kom even langs, dan maken we er een voor de Wall.'],
  'p-kaan': ['Eerlijk antwoord: ik ben hier voor de rijstpudding. Professioneel onderzoek.', 'De pistache is goed. Heel goed. Ik ben bijna jaloers.', 'Zin om er een te delen? Ik vraag twee lepels.'],
  'p-margot': ['Dag! Wat een plek, hè. Ik zie hier zo een tentoonstelling hangen.', 'Ik zoek kunstenaars die met vuur werken. Ken jij iemand?', 'Laten we straks even praten, voor alles om tien uur verdwijnt.'],
  'p-wout': ['Yes! Ik draai straks om tien uur een straat verder. Kom je?', 'Turkse psychedelica en house. Het past bij die spies, geloof me.', 'Ik zet je op de lijst. Zeg aan de deur dat je van Ninja komt.'],
  'p-selin': ['Mix, anderhalve portie. Daar valt niet over te onderhandelen.', 'En jij? Rund of mix? Je antwoord telt mee.', 'Ik zit aan de travertijnen tafel. Kom je zo een glas drinken?'],
  'p-lowie': ['Dag! Vraag me alles behalve AI. Liefst over de korst.', 'Ik loop morgen tien kilometer langs de Schelde. Dit is mijn voorbereiding.', 'Zullen we straks even praten? Ik zit aan de bar.'],
  'p-amira': ['Die spaceship-bar! Ik kom hier eigenlijk om naar het chroom te kijken.', 'Het licht in deze zaal klopt perfect. Zie jij dat ook?', 'Kom gerust bij ons zitten, we hebben hummus voor tien.'],
  'p-victor': ['Ik werk met kleine dingen die schitteren. Vanavond is het de rakı.', 'Jazz of vinyl? Ik heb de indruk dat jij goede smaak hebt.', 'Mag ik je een rakı laten brengen? Met water, zoals het hoort.'],
  'p-lou': ['Ossenbloedrood, ja. Ik denk dat Ninja mijn collectie beïnvloed heeft.', 'Kom je naar de eindshow in juni? Ik zet je op de gastenlijst.', 'Ik zit aan het vuur. Kom kijken hoe ze de spies snijden.'],
  'p-emre': ['Elke zaterdag hier, altijd aan het vuur. Vaste plek.', 'De Iskender is mijn recuperatie. Advies van de fysiotherapeut.', 'Kom gerust aan het vuur zitten, er is nog een kruk vrij.'],
  'p-hanne': ['Dag! Ik zoek een fotograaf voor een campagne. Ken jij er een?', 'Iets met flitsfilm, zoals de foto’s van Ninja zelf. Dat gevoel.', 'Stuur me een flitsfoto van vanavond. Ik bekijk ze allemaal.'],
  'p-louis': ['Ja, rode wijn bij kebab. Ik leg het je graag uit.', 'Het vet van het lam vraagt om tannine. Eén glas en je bent overtuigd.', 'Zal ik er twee laten brengen? Jij kiest de tafel.'],
  'p-yasmine': ['Na een nachtdienst: durum en çay. Vandaag geen nachtdienst, dus extra goesting.', 'Ga jij straks ook dansen? Wout draait een straat verder.', 'Kom gerust even langs, wij zitten op de bank.'],
  'p-stan': ['Dag! Ik maak de flitsfoto’s van de stad. Vanavond die van Ninja.', 'Mag ik straks een foto van jullie tafel maken? Voor een reeks over het Zuid.', 'Ik sta aan de bar. Zeg gerust hallo.'],
};

const GOODBYE = ['Tot zo!', 'Zalig. Tot zo.', 'Afgesproken.'];

/** What she can say first: a few openers that fit the room. */
export function openers(persona: Persona): string[] {
  const base = ['Jij ook hier voor de Iskender?', 'Wat drink je vanavond?', 'Eerste keer bij Ninja?'];
  return persona.intent === 'netwerk' ? ['Waar werk je aan?', ...base] : persona.intent === 'date' ? [...base, 'Zin om een tafel te delen?'] : base;
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();

/** The first answer listens to what she asked (in one or two messages); after that, each person's own lines. */
function nextLines(persona: string, bridge: BridgeState): string[] {
  const chats = matchEvents(bridge).chats.filter((c) => c.persona === persona);
  const said = chats.filter((c) => !c.mine).length;
  const lines = LINES[persona] ?? ['Leuk dat je iets zegt! Tot zo.'];
  const asked = (chats.filter((c) => c.mine).at(-1)?.text ?? '').toLowerCase();
  const p = personaById(persona);
  if (said === 0 && p) {
    const job = /^[A-Z][a-z]/.test(p.job) ? p.job.charAt(0).toLowerCase() + p.job.slice(1) : p.job;
    if (/werk|job|doe je|beroep|work/.test(asked)) return [`Ik ben ${job}.`, lines[1] ?? lines[0]];
    if (/eerste keer|first time/.test(asked)) return ['Nee, ik kom hier vaak. En jij?', lines[0]];
    if (/drink|drank|wijn|raki|rakı/.test(asked)) return ['Iets van de bar, en straks een çay.', lines[1] ?? lines[0]];
  }
  return [lines[said] ?? GOODBYE[said % GOODBYE.length]];
}

/** Her message is read; the answer comes after a few seconds of typing. */
export function scheduleReply(persona: string, delay = 2600 + Math.random() * 2600) {
  if (timers.has(persona)) return;
  setLive((l) => ({ typing: { ...l.typing, [persona]: Date.now() + delay } }));
  timers.set(
    persona,
    setTimeout(() => {
      timers.delete(persona);
      setLive((l) => {
        const typing = { ...l.typing };
        delete typing[persona];
        return { typing };
      });
      if (getSocial().blocked.includes(persona)) return;
      const [first, second] = nextLines(persona, readBridge());
      emit({ kind: 'match-chat', persona, text: first, mine: false });
      if (second) {
        setLive((l) => ({ typing: { ...l.typing, [persona]: Date.now() + 1500 } }));
        setTimeout(() => {
          setLive((l) => {
            const typing = { ...l.typing };
            delete typing[persona];
            return { typing };
          });
          if (!getSocial().blocked.includes(persona)) emit({ kind: 'match-chat', persona, text: second, mine: false });
        }, 1500);
      }
    }, delay),
  );
}

export function sendChat(persona: string, text: string) {
  const clean = text.trim().slice(0, 280);
  if (!clean) return;
  emit({ kind: 'match-chat', persona, text: clean, mine: true });
  setSocial((s) => ({ read: { ...s.read, [persona]: Date.now() } }));
  scheduleReply(persona);
}

/** After a reload: an answer that was still on its way is typed again. */
export function catchUpReplies(bridge: BridgeState) {
  const { chats, mutual } = matchEvents(bridge);
  for (const m of mutual) {
    const mine = chats.filter((c) => c.persona === m.persona);
    const last = mine.at(-1);
    if (last?.mine && Date.now() - last.at > 1500) scheduleReply(m.persona, 1800);
  }
}

/** "Deel een tafel": Noor looks for a free table for the two of them and answers in the chat. */
export function askSharedTable(persona: string, minute: number) {
  if (getSocial().share[persona]) return;
  setSocial((s) => ({ share: { ...s.share, [persona]: { at: Date.now() } } }));
  setTimeout(() => {
    const table = freeTable('center', 4, minute);
    setSocial((s) => ({
      share: { ...s.share, [persona]: { at: s.share[persona]?.at ?? Date.now(), table } },
      notes: [...s.notes, { id: newRef('note'), persona, at: Date.now(), text: table }],
    }));
  }, 5200);
}

/** Starts a new evening: yesterday's likes and passes are gone, as promised at 22:00. */
export function freshEvening(): { stale: boolean; day: string } {
  const day = String(lastClosing());
  return { stale: getSocial().matchDay !== day, day };
}

export const personaName = (id: string) => personaById(id)?.name ?? '';

/** A real moment (ms) on Ninja's clock, "19:42": the app may be replaying the last evening. */
export const ninjaTime = (at: number) => clock(new Date(clockNow().now.getTime() - (Date.now() - at)));
