/**
 * A file from apps/app/public, under whatever base path the app is served from: `/brand/logo-mask.png` while
 * developing, `/app/brand/logo-mask.png` on the demo site.
 */
export function publicUrl(path: string): string {
  const here = globalThis.location?.pathname ?? '/';
  const m = /^(.*?\/app)(\/|$)/.exec(here);
  return `${m ? m[1] : ''}/${path.replace(/^\//, '')}`;
}
