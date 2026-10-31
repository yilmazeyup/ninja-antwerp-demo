// Merges translated parts into a language's dictionary and checks it against the Dutch texts.
// Usage: node scripts/i18n-merge.mjs <lang>   (reads _i18n/<lang>/*.json, each an object { "<Dutch>": "<translation>" })
// Keeps what the dictionary already had, adds or replaces what the parts bring, and reports texts still missing and
// translations whose {placeholders} differ from the Dutch.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const lang = process.argv[2];
if (!lang) throw new Error('Usage: node scripts/i18n-merge.mjs <lang>');
const dictFile = `packages/shared/src/i18n/${lang}.json`;
const dict = fs.existsSync(dictFile) ? JSON.parse(fs.readFileSync(dictFile, 'utf8')) : {};
const dir = `_i18n/${lang}`;
let added = 0;
if (fs.existsSync(dir)) {
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    const part = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    for (const [nl, text] of Object.entries(part)) {
      if (typeof text !== 'string' || !text.trim()) continue;
      if (dict[nl] !== text) added++;
      dict[nl] = text;
    }
  }
}
const source = JSON.parse(fs.readFileSync('_i18n/source.json', 'utf8'));
const holes = (t) => [...t.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
const missing = source.filter((e) => !(e.nl in dict)).map((e) => e.nl);
const broken = Object.entries(dict).filter(([nl, t]) => holes(nl) !== holes(t)).map(([nl]) => nl);
const sorted = Object.fromEntries(Object.keys(dict).sort((a, b) => a.localeCompare(b, 'nl')).map((k) => [k, dict[k]]));
fs.writeFileSync(dictFile, `${JSON.stringify(sorted, null, 1)}\n`);
console.log(`${lang}: ${Object.keys(dict).length} entries (${added} new or changed), ${missing.length} of ${source.length} Dutch texts missing, ${broken.length} with mismatched placeholders`);
if (broken.length) console.log('placeholders differ:', broken.slice(0, 20));
fs.writeFileSync(`_i18n/missing-${lang}.json`, JSON.stringify(missing.map((nl, i) => ({ id: i + 1, nl })), null, 1));
