# Ninja Antwerp — demo

A guest app, a 3D management panel and a new website for **Ninja**, the kebab restaurant in the modernist building at
Vlaamsekaai 52 in Antwerp's Zuid: marinated beef with veal and lamb on a vertical spit before an open oak-wood fire,
lavash from a stone oven brought from Istanbul, fries in beef fat, a small menu and an Antwerp crowd that comes to be
seen. This is a demo with test data only: a fictional team, fictional guests, and no real orders or payments.

- Start page: `/` (the app in a phone, the panel and the website, the twenty features to click through)
- Guest app: `/app/`
- Management panel: `/admin/` (`?at=2026-10-31T19:30` sets Ninja's clock)
- Website: `/website/`

The look and the rules behind everything are in [DESIGN.md](DESIGN.md).

## The five features to talk about

1. **Live spies** — the döner's temperature in the next slice at this second, the crust, the oak fire, the kilos left
   on the spit, how long since the last cut; in 3D with a thermal-camera view. In a real installation a probe in the
   carving layer, an infrared camera, a thermocouple in the fire and a scale under the spit feed it through a small
   gateway in the kitchen; in the demo the readings are worked out from the evening, the same on every screen.
2. **Bordpaspoort** (plate passport) — every plate cut from the spit gets a number that counts every plate since Ninja
   opened: the second of the cut, °C in the meat and at the table, seconds from knife to table, the spit, the fire, the
   carver, and every ingredient with its producer, place, distance, lot and when it was picked or baked. Sealed with
   忍, shareable, and checkable by number on the website.
3. **Ninja Match** — opt-in, only while at Ninja and gone at closing time: who has it on tonight, why they are out,
   what they are eating; send a çay or a drink to their table (the floor brings it with a card), like each other and a
   chat opens.
4. **Flash & story** — a camera in Ninja's own flash-film look with the plate's live numbers on the picture, ready for
   Instagram and TikTok; the best go up on the Wall in the room and on the website once the floor approves.
5. **Eigen spies** (private spit) — your own spit with your name in brass, layered by hand, carved at your table, before
   opening or on Monday when the room is yours; the guests follow its day live.

## And fifteen for every evening

Digital line (Ninja takes no reservations) · order from the line · order together at the table with the QR code, and
call the waiter or more lavash · choose your seat in 3D · pay and split (Payconiq by Bancontact, Apple Pay, an invoice
over Peppol) · Ninja Clan (Genin, Chūnin, Jōnin, Kage: who comes more often waits less; a wallet card) · drops ·
Sensei, the AI host (worked out on the device from the menu) · diet and allergens (the fries are fried in beef fat) ·
Ninja Gift · how busy it is now and the calmest moment tonight · your usual in one tap · Ninja Nights · what plays now ·
after your visit (straight to the chef; a Google review link for everyone).

**The panel ("Ninja · Huis")**: Ninja as a live digital twin in 3D (WebGPU): the spits before the fire, the stone oven,
the spaceship bar, the guests at their tables and the line outside; the fire in numbers with a carve log for the food
safety file; the line and the tables; the pass; passports, suppliers and a recall tool; Match and the Wall; the club;
the evening's numbers. What the guest does in the app shows up there at once, and the other way round. When the panel
is not open, the app's "autopilot" stands in for the floor (calls the guest in, carves her plates, brings çays).

**The website**: Ninja's puffy leather logo as real 3D leather over the fire, the spit live, the menu with prices, where
everything comes from, every plate passport to look up, the Wall, the private spit, the clan and the drops, and the visit.

## 3D

All 3D draws with three.js's `WebGPURenderer`: WebGPU where the browser has it, WebGL 2 everywhere else, the same scene,
materials (TSL node materials: leather with sheen and clearcoat, chrome, lacquer, travertine) and effects
(`RenderPipeline`: bloom, ambient occlusion, reflections, anti-aliasing). `?gl=webgl` forces WebGL 2; `?q=low|medium|high`
the quality. The logo is generated at runtime from Ninja's own logo mask. Shared builders: `packages/shared/src/three/`.

## Real and demo

Real (October 2026): from ninja-antwerp.be and its menu of June 2026, every dish, description and price; the house rules
(no added sugar, preservatives or salt but Himalayan salt; the oak fire; the stone oven; sourdough; fries in beef fat);
halal; the sauces; the address, opening hours (Tuesday to Sunday 15:00–22:00), phone, e-mail, VAT number, parkings
Steendok and Kooldok; the FAQ (no reservations, no take-away, no gift cards) and the jobs page; the logo and all photos
(`apps/app/assets/photos/CREDITS.md`); the interior as Le Fooding describes it. Demo: the team (Baran, Deniz, Ilyas,
Noor, Seppe, Fien, Robbe, Yasmine), Margaux and every other guest, the orders and the line, every sensor reading, the
suppliers, places and lots (examples to be replaced by Ninja's own), the Match people (stock portraits,
`apps/app/assets/people/CREDITS.md`), the ranks, drops, nights, private spits and their prices, and the 3D room (drawn
after descriptions, not a survey). Ninja's owners and crew are not named anywhere. There are no made-up reviews.

## Languages

Ninja is in Antwerp, in Flanders, where the language is Dutch as Belgians speak it (Flemish). That is the default,
written with Belgian words (frieten, reservatie, goesting, merci), and the pages say `nl-BE`. French, Belgium's other
main language, is one tap away, with English, Türkçe, العربية (right to left), Deutsch and Italiano: Clan →
Instellingen in the app, the select in the panel, on the website and the start page, or `?lang=fr|en|tr|ar|de|it`. The
choice is remembered on the device. The code writes the Flemish Dutch; the dictionaries in `packages/shared/src/i18n/`
map it to each language. After changing text, run `node scripts/i18n-extract.mjs`, then `node scripts/i18n-split.mjs
<lang>` and `node scripts/i18n-merge.mjs <lang>` for the parts that were translated.

## Structure

```
apps/app/          the guest app (Expo SDK 58, Expo Router), exported for the web; 3D as *.web.tsx
apps/web/          one Vite build with two pages: admin/ (the panel) and website/; public/ holds photos and the logo
packages/shared/   Ninja's facts and menu, provenance, the demo evening, the spit's sensors, passports, Match, the
                   clan, drops and the rest, the clock, the look, the bridge between the screens; three/ for 3D
site/              the start page
scripts/           build and serve the site as GitHub Pages does; photos.ts and the i18n extraction
```

Ninja's clock is Antwerp time while Ninja is open; otherwise every screen replays the evening rush (17:30–21:30) of the
last open evening.

## Run

```bash
npm install
npm run web
```

The app opens on http://localhost:8098. The panel and the website have their own install:

```bash
npm --prefix apps/web install
npm run studio
```

They open on http://localhost:5192/admin/ and http://localhost:5192/website/. `npm run typecheck` checks everything.
`npm run site` builds the whole demo into `_site/` and `npm run site:serve` serves it on
http://localhost:8108/ninja-antwerp-demo/, where the app, the panel and the website share one origin and talk to each
other live.
