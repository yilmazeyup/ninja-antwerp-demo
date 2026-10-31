# Ninja · design notes

The brief for everything in this repository: the guest app, the management panel, the website and the start page.

## Who it is for

Ninja is a kebab restaurant in a modernist building on the Vlaamsekaai in Antwerp's Zuid: an oak-wood fire, a stone
oven from Istanbul, chrome chairs, leather banquettes, a bar shaped like a spaceship, a small menu at serious prices.
The crowd is Antwerp's fashion and money crowd: people who come to be seen, who share what they eat, who like to be
first. The demo has to feel more premium than anything else they have on their phone. Three ideas carry it:

1. **Extreme detail, live.** The temperature in the döner at this second, the crust, the fire, the farm the lettuce came
   from and when it was cut. Detail is the luxury; precision is the status symbol.
2. **Made to be shared.** Every detail can become a story: a numbered plate passport, a flash photo with the live
   numbers on it, a spit with your own name.
3. **Being first and being seen.** Ranks, drops, the fire row, Match: the social life of the room, in the app.

## The look: lacquer, leather, chrome, fire

One dark look, because Ninja is black. Luxury comes from materials and restraint, never from extra colour.

| Token (CSS `--nj-*`) | Value | Use |
| --- | --- | --- |
| `bg` / `bg2` | `#0B0807` / `#110C0A` | black lacquer, warm, never blue |
| `panel` → `panel3` | `#18100D` → `#2D1B14` | leather panels, deep to lit |
| `ink` / `soft` / `muted` / `faint` | `#F4ECE1` / `#CDBFAF` / `#8F8174` / `#5C5047` | bone text on black |
| `line` / `line2` / `stitch` | bone at 9 % / 17 % / 26 % | hairlines; the saddle stitch on leather |
| `oxblood` / `oxblood2` | `#7B151A` / `#9C242A` | Ninja's own accent (its site's buttons) |
| `leather` / `leatherLight` / `cognac` | `#5E1D14` / `#8A3424` / `#A4572F` | the puffy logo's leather |
| `travertine` / `chrome` | `#E7DCCB` / `#C9CDD3` | the tables; chrome bezels and rules |
| `ember` / `amber` / `flame` | `#FF6A2A` / `#FFB547` / `#FFE6A8` | fire, live data, heat |

Source: `packages/shared/src/palette.ts` (`paletteCss()` writes the variables).

**Type.** Archivo with its width axis: *wide* caps (`font-stretch: 125%`, weight 700–800, tracking .16–.22em, 10–12 px)
for labels and kickers, the way fashion houses set them; normal width for reading. Martian Mono for every number a
sensor sends (°C, kg, seconds, serials), tabular, units smaller and dimmer. Cormorant Garamond italic for a few words
that carry feeling ("vanavond", "van het vuur"), never for whole paragraphs. One kanji, 忍, from Shippori Mincho B1, for
the seal on the passport. Fonts: `FONTS_URL` and `KANJI_FONT_URL` in palette.ts.

**Materials and details.**
- *Leather panel*: `panel` with a faint top light, 1 px `line` border, and a saddle stitch: a dashed 1 px `stitch`
  line inset 5–6 px from the edge. Radius 20–24.
- *Lacquer button* (primary): oxblood gradient `#A8262D → #6A0E12`, a gloss highlight on the top half, a 1 px bone
  border at 35 % (Ninja's own buttons have a white border), pill shape, wide caps label.
- *Bone button* (secondary): bone fill, black label. *Ghost*: transparent with `line2`.
- *Chrome*: 1 px silver gradient rules and gauge bezels.
- *Film*: Ninja's photos are flash photography on film. Photos get a fine grain and a slight vignette; never filters
  that change their colours.
- *Seal*: an oxblood rounded square with 忍 in bone, slightly rotated, on every passport.
- *Serial*: "No. 216 875" in Martian Mono with a thin space between thousands.
- No emoji in the interface, no cartoon ninjas, no stock icons in colour. The ninja theme shows only through the ranks,
  the seal, the white headband of the chefs and the word "Kage".

**Motion.** Slow and weighty: 300–600 ms, ease-out; numbers roll when sensors update; nothing bounces. The fire is the
only thing that flickers. Respect `prefers-reduced-motion`.

## 3D

All 3D draws with three.js 0.186's `WebGPURenderer` (`three/webgpu`, TSL from `three/tsl`): WebGPU where the browser
has it, WebGL 2 otherwise, with the same scene. Start from `createRenderer()` and `studioEnvironment()` in
`packages/shared/src/three/renderer.ts`; respect its quality tiers (`high` desktop WebGPU, `medium` WebGL 2 or tablet,
`low` phone; `?q=` and `?gl=webgl` override). Use what makes it look expensive: `MeshPhysicalNodeMaterial` (leather
with sheen and clearcoat, chrome with anisotropy, lacquer with clearcoat 1, travertine with veins from noise), PMREM
reflections, `RenderPipeline` post-processing (bloom on fire and candles, GTAO, SSR on lacquer and chrome on high,
TRAA or FXAA, a little film grain), GPU particles for embers. Pause when hidden or off screen; dispose on unmount. In
headless Chrome both backends run (`--enable-unsafe-webgpu --use-angle=metal`).

Note: in r186 `PostProcessing` is called `RenderPipeline`, and `PCFSoftShadowMap` is not supported by WebGPU (use
`PCFShadowMap` or `VSMShadowMap`).

## Words

Dutch as spoken in Antwerp is the source language: *reservatie*, *frieten*, *goesting*, *merci*, *smakelijk*. Short,
confident, a little dry. Dish names stay as Ninja writes them (Ninja Kebab, Iskender, Beef Tallow Fries); descriptions
are in Dutch. The code writes the Dutch exactly as shown; `tr()` and the JSX wrappers look up the other six languages
(en, tr, ar, fr, de, it) in `packages/shared/src/i18n/*.json`. Write whole sentences with `{placeholders}`
(`tr('Nog {n} min')`), never glue translated fragments together. Arabic is right to left.

## Honest about what is real

Real: the menu, every price and description, the house rules (no added sugar or salt but Himalayan salt, oak fire,
stone oven, sourdough, fries in beef fat), halal, the address, opening hours, phone, e-mail, VAT number, parking, the
FAQ, the interior as Le Fooding describes it, the logo and all of Ninja's own photos. Demo: the team (Baran, Deniz,
Ilyas, Noor, Seppe, Fien, Robbe, Yasmine), every guest and order, all sensor readings, the suppliers and lots in the
provenance (examples: say so where suppliers are managed), Match people (stock portraits), ranks, drops, nights,
private spits, prices of new products. Ninja's real owners and crew are never named or quoted. No invented reviews.

## The link between the screens

`packages/shared/src/bridge.ts`: localStorage + BroadcastChannel, same origin. The app emits (`line-join`, `order`,
`call`, `cay`, `flash`, `spit-booking`, …); the panel answers (`line-call`, `line-seat`, `carve`, `call-ok`,
`cay-done`, `wall`, `spit-step`, `fresh-spit`, `soldout`). The demo evening (`evening(day)`) is the same everywhere;
the bridge adds what people actually did.

## Where things live

```
apps/app/            the guest app (Expo SDK 58, React Native for web); 3D views as *.web.tsx
apps/web/admin/      the management panel page          apps/web/src/admin/     its code
apps/web/website/    the website page                   apps/web/src/website/   its code
apps/web/src/common/ CSS and helpers both web pages share
apps/web/public/     photos, brand files (served at /photos, /brand)
packages/shared/     facts, menu, provenance, evening, telemetry, passport, social, clan, extras, bridge, i18n
packages/shared/src/three/  3D builders the app, the panel and the website share
site/                the start page
```
