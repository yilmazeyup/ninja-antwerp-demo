// Writes packages/shared/src/i18n/nl-NL.json: the option "Nederlands (Nederland)". The demo is written in Flemish, the
// language of Antwerp; Dutch as spoken in the Netherlands differs in a handful of words (frieten → friet, reservatie →
// reservering, goesting → zin, merci → bedankt, toog → bar, aanschuiven → aansluiten…). Only the texts that change get
// an entry; everything else is shown as written. Run after scripts/i18n-extract.mjs.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const source = JSON.parse(fs.readFileSync('_i18n/source.json', 'utf8')).map((e) => e.nl);

/** Whole phrases first (where the grammar changes too), then single words. Names (Vlaamsekaai, Parking Steendok) stay. */
const RULES = [
  [/zoals frieten vroeger smaakten/g, 'zoals friet vroeger smaakte'],
  [/de frieten worden gebakken/g, 'de friet wordt gebakken'],
  [/De frieten worden in rundvet gebakken/g, 'De friet wordt in rundvet gebakken'],
  [/de frieten zijn in rundvet gebakken/g, 'de friet is in rundvet gebakken'],
  [/de frieten in rundvet vallen weg/g, 'de friet in rundvet valt weg'],
  [/\bFrieten\b/g, 'Friet'],
  [/\bfrieten\b/g, 'friet'],
  [/\(groeps\)reservatie\b/g, '(groeps)reservering'],
  [/\bReservaties\b/g, 'Reserveringen'],
  [/\breservaties\b/g, 'reserveringen'],
  [/\breservatie\b/g, 'reservering'],
  [/\bGoesting\?/g, 'Zin?'],
  [/\bgoesting\b/g, 'zin'],
  [/een fooi is een merci voor/g, 'een fooi is een bedankje voor'],
  [/\bMerci\b/g, 'Bedankt'],
  [/\bmerci\b/g, 'bedankt'],
  [/\bde toog\b/g, 'de bar'],
  [/\bDe toog\b/g, 'De bar'],
  [/(^|[^\p{L}])kaai\b/gu, '$1kade'],
  [/Met de app schuif je wel digitaal in de rij/g, 'Met de app sluit je wel digitaal aan in de rij'],
  [/schuif digitaal in de rij/g, 'sluit digitaal aan in de rij'],
  [/Schuif in de rij/g, 'Sluit aan in de rij'],
  [/Je schuift meteen naar voren/g, 'Je gaat meteen naar voren'],
  [/Je schuift sneller op in de rij/g, 'Je gaat sneller vooruit in de rij'],
  [/\bschuift aan\b/g, 'sluit aan'],
  [/\bSchuif digitaal aan\b/g, 'Sluit digitaal aan'],
  [/\bschuif digitaal aan\b/g, 'sluit digitaal aan'],
  [/\bSchuif eerst aan\b/g, 'Sluit eerst aan'],
  [/\bschuif eerst digitaal aan\b/g, 'sluit eerst digitaal aan'],
  [/\bSchuif aan\b/g, 'Sluit aan'],
  [/\bschuif aan\b/g, 'sluit aan'],
  [/\bSmakelijk\b/g, 'Eet smakelijk'],
  [/\bZalig\b/g, 'Heerlijk'],
  [/\bflexi’s\b/g, 'flexwerkers'],
  [/\bvoorraad opvolgen\b/g, 'voorraad bijhouden'],
  [/\bopeningsuren\b/g, 'openingstijden'],
  [/Route en parkings/g, 'Route en parkeren'],
  [/\bde parkings\b/g, 'de parkeergarages'],
  [/^Parkings en uren/g, 'Parkeergarages en tijden'],
  [/\bKan je\b/g, 'Kun je'],
  [/\bkan je\b/g, 'kun je'],
  [/\bJe kan\b/g, 'Je kunt'],
  [/\bje kan\b/g, 'je kunt'],
  [/^Dag! /g, 'Hoi! '],
  [/\bGSM\b/g, 'mobiel'],
];

const dict = {};
for (const nl of source) {
  let out = nl;
  for (const [re, to] of RULES) out = out.replace(re, to);
  if (out !== nl) dict[nl] = out;
}
// The language list names the regional varieties in their own words.
dict['Vlaams'] = 'Vlaams';
const sorted = Object.fromEntries(Object.keys(dict).sort((a, b) => a.localeCompare(b, 'nl')).map((k) => [k, dict[k]]));
fs.writeFileSync('packages/shared/src/i18n/nl-NL.json', `${JSON.stringify(sorted, null, 1)}\n`);
console.log(`nl-NL: ${Object.keys(sorted).length} texts differ from the Flemish`);
