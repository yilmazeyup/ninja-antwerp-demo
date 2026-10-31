// Splits the Dutch texts that still miss a translation into parts for translating: _i18n/parts-<lang>/part-NN.json,
// each a list of { id, nl }. Translations go into _i18n/<lang>/part-NN.json as { "<Dutch>": "<translation>" } and are
// merged with scripts/i18n-merge.mjs. Usage: node scripts/i18n-split.mjs <lang> [size]
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const lang = process.argv[2];
const size = Number(process.argv[3] ?? 320);
if (!lang) throw new Error('Usage: node scripts/i18n-split.mjs <lang> [size]');
const source = JSON.parse(fs.readFileSync('_i18n/source.json', 'utf8'));
const dictFile = `packages/shared/src/i18n/${lang}.json`;
const dict = fs.existsSync(dictFile) ? JSON.parse(fs.readFileSync(dictFile, 'utf8')) : {};
// Code that slipped through the extraction (CSS values, font names, script fragments) is left out.
const CODE = /(\d\s*px\b|cubic-bezier|\besc\(|\{SANS\}|^Georgia$|rgba?\(|\btranslate\(|\bscale\(|^transform |^[-\d.%\s]+$|\+\s*\w+\(|=>|;\s*$)/;
const todo = source.filter((e) => !(e.nl in dict) && !CODE.test(e.nl));
const dir = `_i18n/parts-${lang}`;
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
let n = 0;
for (let i = 0; i < todo.length; i += size) {
  n++;
  fs.writeFileSync(`${dir}/part-${String(n).padStart(2, '0')}.json`, JSON.stringify(todo.slice(i, i + size), null, 1));
}
console.log(`${lang}: ${todo.length} texts to translate in ${n} parts -> ${dir}/`);
