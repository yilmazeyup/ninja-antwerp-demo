import { FONTS_URL, KANJI_FONT_URL, paletteCss } from '@ninja/shared';

import { rtl } from '../i18n';

/**
 * The web layer of the look (DESIGN.md): the palette as CSS variables, black lacquer with the glow of the oak fire
 * drifting low behind every screen, leather with a saddle stitch, lacquer buttons, chrome hairlines, film grain on the
 * photos, wide caps and tabular numbers. Elements opt in with `fx('…')` (a data attribute), so React Native's own
 * styles stay untouched.
 */

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.95  0 0 0 0 0.9  0 0 0 0 0.85  0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

/** Pebbled leather, very faint: a fine noise stretched a little, for the panels. */
const PEBBLE =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='p'><feTurbulence type='turbulence' baseFrequency='0.55' numOctaves='3' seed='7'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 0.92  0 0 0 0 0.86  0 0 0 0.9 -0.35'/></filter><rect width='100%' height='100%' filter='url(%23p)'/></svg>\")";

const CSS = `
${paletteCss()}
html,body,#root{background:var(--nj-bg);}
body{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility;overscroll-behavior:none;font-synthesis:none;}
::selection{background:var(--nj-oxblood2);color:var(--nj-ink);}
*{scrollbar-width:none;-webkit-tap-highlight-color:transparent;}
*::-webkit-scrollbar{width:0;height:0;display:none;}
:focus-visible{outline:1px solid var(--nj-amber);outline-offset:3px;border-radius:12px;}
input,textarea{caret-color:var(--nj-ember);}
input::placeholder,textarea::placeholder{color:var(--nj-faint);opacity:1;}

/* type: wide caps for labels, tabular figures for every number, balanced headlines */
[data-fx~="wide"]{font-stretch:125%;}
[data-fx~="wider"]{font-stretch:112.5%;}
[data-fx~="narrow"]{font-stretch:87.5%;}
[data-fx~="tabular"]{font-variant-numeric:tabular-nums;}
[data-fx~="balance"]{text-wrap:balance;}
[data-fx~="pretty"]{text-wrap:pretty;}
[data-fx~="pointer"]{cursor:pointer;}
[data-fx~="nosel"]{user-select:none;-webkit-user-select:none;}

/* the ground: black lacquer, the fire's glow drifting low, a vignette at the edges */
[data-fx~="lacquer"]{overflow:hidden;background-color:var(--nj-bg);}
[data-fx~="lacquer"]::before,[data-fx~="lacquer"]::after{content:"";position:absolute;pointer-events:none;will-change:transform;}
[data-fx~="lacquer"]::before{left:-40%;right:-40%;bottom:-38%;height:70%;
  background:radial-gradient(closest-side,rgba(255,106,42,.16),rgba(255,106,42,0) 70%) 18% 70%/55% 75% no-repeat,
             radial-gradient(closest-side,rgba(156,36,42,.22),rgba(156,36,42,0) 72%) 78% 60%/60% 80% no-repeat;
  filter:blur(6px);animation:njDriftA 26s ease-in-out infinite alternate;}
[data-fx~="lacquer"]::after{inset:0;background:radial-gradient(120% 80% at 50% 0%,rgba(244,236,225,.05),rgba(0,0,0,0) 55%),
  radial-gradient(140% 100% at 50% 50%,rgba(0,0,0,0) 55%,rgba(0,0,0,.55) 100%);}
@keyframes njDriftA{0%{transform:translate3d(0,0,0) scale(1)}50%{transform:translate3d(5%,-3%,0) scale(1.06)}100%{transform:translate3d(-6%,2%,0) scale(1.02)}}

/* leather: a panel with a faint light from above, pebbled grain, a saddle stitch inset from the edge */
[data-fx~="leather"]{position:relative;background-image:linear-gradient(180deg,rgba(244,236,225,.045),rgba(244,236,225,0) 38%),${PEBBLE};background-blend-mode:normal,soft-light;}
[data-fx~="stitch"]::after{content:"";position:absolute;inset:6px;border:1px dashed var(--nj-stitch);border-radius:inherit;pointer-events:none;opacity:.55;
  -webkit-mask:linear-gradient(#000,#000);}
[data-fx~="oxblood"]{background-image:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,0) 45%),radial-gradient(120% 140% at 15% 0%,#8E2027 0%,#5E1016 55%,#3A0A0D 100%);}
[data-fx~="cognac"]{background-image:linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,0) 45%),radial-gradient(120% 140% at 15% 0%,#A4572F 0%,#6B3119 60%,#3B1A0E 100%);}

/* lacquer button: oxblood with a gloss on the top half and a bone edge, as on Ninja's own site */
[data-fx~="lacquer-btn"]{background-image:linear-gradient(180deg,rgba(255,255,255,.18),rgba(255,255,255,0) 50%),linear-gradient(160deg,#AD2830 0%,#7B151A 55%,#5A0D11 100%);
  box-shadow:0 12px 30px -12px rgba(156,36,42,.75),inset 0 1px 0 rgba(255,255,255,.22);}
[data-fx~="bone-btn"]{background-image:linear-gradient(180deg,#FFFDF9 0%,#EDE3D6 100%);box-shadow:0 10px 26px -14px rgba(244,236,225,.5);}
[data-fx~="ember-btn"]{background-image:linear-gradient(180deg,rgba(255,255,255,.22),rgba(255,255,255,0) 50%),linear-gradient(140deg,#FFB547 0%,#FF6A2A 55%,#C73A16 100%);
  box-shadow:0 12px 30px -10px rgba(255,106,42,.6);}

/* chrome: hairlines and bezels that catch the light */
[data-fx~="chrome"]{background-image:linear-gradient(90deg,rgba(201,205,211,0),rgba(201,205,211,.7) 25%,#FFFFFF 50%,rgba(201,205,211,.7) 75%,rgba(201,205,211,0));}
[data-fx~="chrome-ring"]{background-image:conic-gradient(from 200deg,#6E7177,#F4F6F9 12%,#8A8E95 25%,#DADDE2 45%,#55585D 60%,#E9ECF0 78%,#6E7177);}
[data-fx~="chrome-text"]{background-image:linear-gradient(180deg,#FFFFFF 0%,#C9CDD3 48%,#7C8088 52%,#E3E6EA 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}
[data-fx~="fire-text"]{background-image:linear-gradient(100deg,#FFE6A8 0%,#FFB547 35%,#FF6A2A 70%,#C73A16 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}

/* glass over the lacquer */
[data-fx~="glass"]{-webkit-backdrop-filter:blur(18px) saturate(140%);backdrop-filter:blur(18px) saturate(140%);background-color:var(--nj-glass)!important;}
[data-fx~="glass-strong"]{-webkit-backdrop-filter:blur(28px) saturate(150%);backdrop-filter:blur(28px) saturate(150%);background-color:var(--nj-glass)!important;
  box-shadow:0 18px 50px -18px rgba(0,0,0,.85),inset 0 1px 0 rgba(244,236,225,.07);}

/* film: the grain of Ninja's flash photos, and the flash falling off at the edges */
[data-fx~="film"]{position:relative;}
[data-fx~="film"]::after{content:"";position:absolute;inset:0;pointer-events:none;border-radius:inherit;
  background:radial-gradient(120% 90% at 50% 45%,rgba(0,0,0,0) 58%,rgba(0,0,0,.38) 100%);}
[data-fx~="film"]::before{content:"";position:absolute;inset:0;pointer-events:none;border-radius:inherit;z-index:1;background:${GRAIN};background-size:180px;opacity:.16;mix-blend-mode:overlay;}
[data-fx~="grain"]::before{content:"";position:absolute;inset:0;pointer-events:none;background:${GRAIN};background-size:180px;opacity:.05;border-radius:inherit;z-index:1;mix-blend-mode:overlay;}
[data-fx~="flash"]{animation:njFlash .7s ease-out both;}
@keyframes njFlash{0%{filter:brightness(3) saturate(0)}100%{filter:none}}

/* live: an ember that breathes; the thermal sweep; numbers that settle */
[data-fx~="live"]{animation:njLive 1.8s ease-out infinite;}
@keyframes njLive{0%{box-shadow:0 0 0 0 rgba(255,106,42,.55)}80%,100%{box-shadow:0 0 0 9px rgba(255,106,42,0)}}
[data-fx~="flicker"]{animation:njFlicker 2.6s ease-in-out infinite;}
@keyframes njFlicker{0%,100%{opacity:1}42%{opacity:.86}47%{opacity:.97}60%{opacity:.9}}
[data-fx~="tick"]{transition:color .4s ease;}
[data-fx~="rise"]{animation:njRise .6s cubic-bezier(.2,.8,.2,1) both;}
@keyframes njRise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
[data-fx~="shimmer"]{position:relative;overflow:hidden;}
[data-fx~="shimmer"]::after{content:"";position:absolute;top:-30%;bottom:-30%;width:30%;left:-50%;transform:skewX(-18deg);
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent);animation:njShimmer 6s cubic-bezier(.4,0,.2,1) infinite;pointer-events:none;}
@keyframes njShimmer{0%,72%{left:-50%}100%{left:140%}}
[data-fx~="marquee"]{animation:njMarquee 38s linear infinite;}
@keyframes njMarquee{from{transform:translate3d(0,0,0)}to{transform:translate3d(-50%,0,0)}}
[dir="rtl"] [data-fx~="marquee"]{animation-name:njMarqueeRtl;}
@keyframes njMarqueeRtl{from{transform:translate3d(0,0,0)}to{transform:translate3d(50%,0,0)}}
[data-fx~="spin-slow"]{animation:njSpin 18s linear infinite;}
@keyframes njSpin{to{transform:rotate(360deg)}}
[data-fx~="lift"]{transition:transform .35s cubic-bezier(.2,.8,.2,1),box-shadow .35s ease;}
@media (hover:hover){[data-fx~="lift"]:hover{transform:translateY(-2px);}}

/* the seal: oxblood with 忍 pressed into it */
[data-fx~="seal"]{background-image:radial-gradient(circle at 30% 25%,#B3313A,#7B151A 68%,#5A0D11);box-shadow:inset 0 0 0 2px rgba(244,236,225,.16),0 8px 20px -8px rgba(156,36,42,.85);}

/* switching screens */
::view-transition-old(root),::view-transition-new(root){animation-duration:.45s;}

@media (prefers-reduced-motion: reduce){
  [data-fx~="lacquer"]::before,[data-fx~="live"],[data-fx~="flicker"],[data-fx~="shimmer"]::after,[data-fx~="marquee"],[data-fx~="spin-slow"],[data-fx~="rise"],[data-fx~="flash"]{animation:none!important;}
}
`;

/** Loads the fonts and the stylesheet once, before the first screen draws. */
export function installWebStyles() {
  if (typeof document === 'undefined' || document.getElementById('nj-css')) return;
  for (const href of [FONTS_URL, KANJI_FONT_URL]) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }
  if (rtl()) {
    const ar = document.createElement('link');
    ar.rel = 'stylesheet';
    ar.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap';
    document.head.appendChild(ar);
  }
  const style = document.createElement('style');
  style.id = 'nj-css';
  style.textContent = CSS;
  document.head.appendChild(style);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#0B0807');
}
