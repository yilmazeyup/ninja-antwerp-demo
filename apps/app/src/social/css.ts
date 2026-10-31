import { isWeb } from '../theme';

/**
 * The social screens' own motion on the web, next to the house stylesheet (src/web/css.ts): the card that floats and
 * catches the light, the record that turns, the equaliser, the flash. Elements opt in with `nj('…')`; everything
 * stops for `prefers-reduced-motion`.
 */
const CSS = `
@keyframes njsFloat{0%,100%{transform:perspective(1100px) rotateX(4deg) rotateY(-7deg) translateY(0)}50%{transform:perspective(1100px) rotateX(-2deg) rotateY(6deg) translateY(-5px)}}
[data-nj~="float"]{animation:njsFloat 10s ease-in-out infinite;will-change:transform;}
@keyframes njsSheen{0%,100%{background-position:0% 0%}50%{background-position:100% 100%}}
[data-nj~="sheen"]{background-size:240% 240%;animation:njsSheen 10s ease-in-out infinite;}
@keyframes njsEq{0%,100%{transform:scaleY(.22)}50%{transform:scaleY(1)}}
[data-nj~="eq"]{transform-origin:50% 100%;animation:njsEq 1.1s ease-in-out infinite;}
@keyframes njsPop{0%{opacity:1}100%{opacity:0}}
[data-nj~="pop"]{animation:njsPop .75s cubic-bezier(.2,.7,.2,1) both;pointer-events:none;}
@keyframes njsSpin{to{transform:rotate(360deg)}}
[data-nj~="spin"]{animation:njsSpin 1.8s linear infinite;}
[data-nj~="spin-paused"]{animation:njsSpin 1.8s linear infinite;animation-play-state:paused;}
@keyframes njsBreath{0%,100%{opacity:.5}50%{opacity:1}}
[data-nj~="breath"]{animation:njsBreath 2.4s ease-in-out infinite;}
@keyframes njsIn{from{opacity:0;transform:scale(1.03)}to{opacity:1;transform:none}}
[data-nj~="xfade"]{animation:njsIn 1.4s ease both;}
[data-nj~="blur"]{filter:blur(7px) saturate(.85);transform:scale(1.08);}
[data-nj~="engrave"]{color:#4A320E;text-shadow:0 1px 0 rgba(255,236,190,.55),0 -1px 0 rgba(40,24,4,.35);}
[data-nj~="emboss"]{text-shadow:0 1px 0 rgba(0,0,0,.6),0 -1px 0 rgba(255,255,255,.12);}
[data-nj~="brass"]{background-image:linear-gradient(135deg,#7A5518 0%,#D9B262 22%,#F4DC9C 38%,#B88A3A 55%,#E8C77E 72%,#8C6420 100%);
  box-shadow:inset 0 1px 0 rgba(255,246,214,.75),inset 0 -2px 4px rgba(60,36,6,.45),0 18px 40px -16px rgba(0,0,0,.9);}
[data-nj~="screw"]{background-image:radial-gradient(circle at 35% 30%,#FBEBC0,#B8893B 55%,#6E4C14);box-shadow:inset 0 0 0 1px rgba(60,36,6,.4);}
[data-nj~="tv"]{box-shadow:0 30px 60px -24px rgba(0,0,0,.95),0 0 0 1px rgba(201,205,211,.25),inset 0 0 0 6px #050302;}
[data-nj~="scan"]{background-image:repeating-linear-gradient(180deg,rgba(0,0,0,0) 0 2px,rgba(0,0,0,.14) 2px 3px);}
@media (prefers-reduced-motion: reduce){[data-nj~="float"],[data-nj~="sheen"],[data-nj~="eq"],[data-nj~="spin"],[data-nj~="breath"],[data-nj~="xfade"]{animation:none!important}}
`;

export function installSocialCss() {
  if (!isWeb || typeof document === 'undefined' || document.getElementById('nj-social-css')) return;
  const style = document.createElement('style');
  style.id = 'nj-social-css';
  style.textContent = CSS;
  document.head.appendChild(style);
}

installSocialCss();

/** Hooks an element up to this stylesheet (and, when given, to the house one): `{...nj('float', 'leather')}`. */
export const nj = (names: string, fxNames?: string): Record<string, unknown> => (isWeb ? { dataSet: fxNames ? { nj: names, fx: fxNames } : { nj: names } } : {});
