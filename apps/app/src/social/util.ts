import { Asset } from 'expo-asset';
import { Linking, Platform, Share } from 'react-native';

import { tr } from '../i18n';

export const isWeb = Platform.OS === 'web';

/** Fills {placeholders} in a text that is already in the right language. */
export const fill = (text: string, values: Record<string, string | number> = {}) =>
  text.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));

/** A whole Dutch sentence with {placeholders}, in the chosen language, filled in: `t('Nog {n} min', { n: 5 })`. */
export const t = (template: string, values: Record<string, string | number> = {}) => fill(tr(template), values);

/** A picture bundled with the app, as an address the browser can load (for canvases and downloads). */
export function assetUri(mod: number | undefined): string {
  if (mod === undefined) return '';
  try {
    return Asset.fromModule(mod).uri;
  } catch {
    return '';
  }
}

export function newRef(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/** "04:12:33" or "2 d 04:12": a countdown that reads at a glance. */
export function countdownLong(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const two = (n: number) => String(n).padStart(2, '0');
  return d > 0 ? `${d} d ${two(h)}:${two(m)}` : `${two(h)}:${two(m)}:${two(s)}`;
}

/** "1:07" for seconds of music. */
export const mmss = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

/** Opens a web address or a phone number: a new tab on the web. */
export function openLink(url: string) {
  if (isWeb && typeof window !== 'undefined' && /^https?:/.test(url)) {
    window.open(url, '_blank', 'noopener');
    return;
  }
  Linking.openURL(url).catch(() => {});
}

/** The address of a screen of this app, for sharing (the web app's own address; a deep link natively). */
export function appLink(path: string): string {
  if (isWeb && typeof window !== 'undefined') {
    // Exported for a sub-folder (the demo site serves the app under …/app), the links keep that folder.
    const sub = /^(.*\/app)(\/|$)/.exec(window.location.pathname);
    return `${window.location.origin}${sub ? sub[1] : ''}${path}`;
  }
  return `ninja://${path.replace(/^\//, '')}`;
}

export type ShareResult = 'shared' | 'copied' | 'downloaded' | 'cancelled' | 'failed';

type ShareNavigator = Navigator & { canShare?: (data: ShareData) => boolean };

/** Shares a link with the phone's own share sheet; on a desktop browser it is copied instead. */
export async function shareLink(url: string, text: string, title = 'Ninja'): Promise<ShareResult> {
  if (!isWeb) {
    try {
      const r = await Share.share({ message: `${text}\n${url}`, url, title });
      return r.action === Share.dismissedAction ? 'cancelled' : 'shared';
    } catch {
      return 'failed';
    }
  }
  const nav = navigator as ShareNavigator;
  if (nav.share) {
    try {
      await nav.share({ url, text, title });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
    }
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    return 'copied';
  } catch {
    return 'failed';
  }
}

/** Demo only: opens the app again at another moment of the same evening (`?at=`), e.g. to show a busy room. */
export function jumpTo(day: Date, minute: number) {
  if (!isWeb || typeof window === 'undefined') return;
  const two = (n: number) => String(n).padStart(2, '0');
  const at = `${day.getFullYear()}-${two(day.getMonth() + 1)}-${two(day.getDate())}T${two(Math.floor(minute / 60))}:${two(minute % 60)}`;
  const url = new URL(window.location.href);
  url.searchParams.set('at', at);
  url.searchParams.set('intro', '0');
  window.location.replace(url.toString());
}

/** Saves a file through the browser. */
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** Shares a picture (Web Share with files, as on a phone); without it, the picture is downloaded. */
export async function shareFile(blob: Blob, name: string, text: string): Promise<ShareResult> {
  const file = new File([blob], name, { type: blob.type || 'image/jpeg' });
  const nav = navigator as ShareNavigator;
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text, title: 'Ninja' });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
    }
  }
  try {
    download(blob, name);
    return 'downloaded';
  } catch {
    return 'failed';
  }
}

/** A calendar entry for a night or a booking, as an .ics file. */
export function icsFile(title: string, start: Date, end: Date, where: string, text: string): Blob {
  const stamp = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}00`;
  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ninja Antwerp//Demo//NL',
    'BEGIN:VEVENT',
    `UID:${newRef('ninja')}@ninja-antwerp.be`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART;TZID=Europe/Brussels:${stamp(start)}`,
    `DTEND;TZID=Europe/Brussels:${stamp(end)}`,
    `SUMMARY:${title}`,
    `LOCATION:${where}`,
    `DESCRIPTION:${text.replace(/\n/g, '\\n')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  return new Blob([body], { type: 'text/calendar' });
}
