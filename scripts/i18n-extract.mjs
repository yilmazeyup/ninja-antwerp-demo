// Collects every Dutch text the demo can show, for translation: JSX text (joined the way the app joins it, with
// {placeholders} for values), strings in the data, template strings as patterns, the HTML of the 3D labels, and the
// start page. Writes a JSON list of { id, nl } and prints what it found.
// Usage: node scripts/i18n-extract.mjs [out.json]

import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const out = process.argv[2] ?? '_i18n/source.json';
const ROOTS = ['apps/app/src', 'apps/web/src', 'packages/shared/src'];
const SKIP_FILE = [/web\/css\.ts$/, /components\/Icon\.tsx$/, /\/i18n\//, /\/i18n\.ts$/, /locales\.ts$/, /palette\.ts$/, /random\.ts$/, /\.d\.ts$/, /shared\/src\/three\//, /photos\.ts$/, /website\/smoke\.ts$/, /\/lab(Field)?\.ts$/];
const SKIP_DECLS = new Set(['PLAYLIST', 'THERMAL', 'PEBBLE', 'GRAIN', 'FIRST_MEN', 'KANJI', 'PC2', 'GLYPHS', 'ICONS', 'TOOTH_PATH', 'NAMES', 'AR_DAYS', 'AR_MONTHS', 'LOCALE_NAMES', 'FONTS', 'CSS', 'NOISE', 'TEXT_PROPS', 'SEPARATORS', 'KIDS', 'WOMEN', 'MEN', 'LAST', 'PATHS', 'ICONS']);
const SKIP_CALLS = new Set(['fx', 'web', 'require', 'querySelector', 'querySelectorAll', 'getElementById', 'addEventListener', 'removeEventListener', 'setAttribute', 'getAttribute', 'createElement', 'matchMedia', 'RegExp', 'log', 'warn', 'error', 'info', 'getItem', 'setItem', 'removeItem', 'push', 'replace', 'navigateToTab', 'navigate', 'rng', 'pick', 'load', 'fetch', 'postMessage', 'BroadcastChannel', 'startsWith', 'endsWith', 'includes', 'split', 'join', 'padStart', 'toFixed', 'toLocaleString', 'has', 'get', 'set', 'delete', 'emit', 'stylistById', 'serviceById', 'productById', 'clientById', 'optionOf', 'lookById', 'categoryById', 'el', 'useState', 'dispatchEvent', 'Event', 'CustomEvent', 'Date', 'URL', 'URLSearchParams', 'Color', 'MeshStandardMaterial', 'material', 'mat', 'Error']);
const TEXT_CALLS = new Set(['toast', 'tr', 't', 'trHtml', 'alert', 'plural', 'areaLabel', 'say', 'note']);
const SKIP_ATTRS = new Set(['className', 'style', 'key', 'id', 'href', 'src', 'testID', 'nativeID', 'name', 'icon', 'color', 'bg', 'v', 'weight', 'align', 'mode', 'fxNames', 'ink', 'capture', 'type', 'rel', 'target', 'accessibilityRole', 'chroma', 'tone', 'variant', 'kind', 'size', 'to', 'path', 'pointerEvents', 'resizeMode', 'autoCapitalize', 'keyboardType', 'returnKeyType', 'autoComplete', 'textContentType', 'inputMode', 'dir', 'lang', 'translate', 'role', 'tabIndex', 'value', 'preload', 'poster', 'crossOrigin', 'data-state', 'dataSet', 'enterKeyHint', 'objectFit', 'look']);
const TEXT_ATTRS = new Set(['label', 'title', 'text', 'sub', 'hint', 'placeholder', 'caption', 'kicker', 'note', 'line', 'body', 'cta', 'empty', 'unit', 'heading', 'subtitle', 'aria-label', 'accessibilityLabel', 'alt', 'demoLabel', 'what', 'detail']);
const SKIP_KEYS = new Set(['producer', 'place', 'lot', 'artist', 'kanji', 'meat', 'spit', 'table', 'seat', 'country', 'portion', 'intent', 'rank', 'carver', 'dayKey', 'code', 'seal', 'ref', 'drop', 'night', 'persona', 'pack', 'slot', 'call', 'method', 'invoice', 'maskUrl', 'station', 'cat', 'dish', 'area', 'courier', 'source', 'by', 'call', 'pick', 'zone', 'allergens', 'tags', 'tr', 'stage', 'guest', 'kind2', 'id', 'icon', 'path', 'to', 'chroma', 'kind', 'color', 'colour', 'bg', 'tone', 'bottle', 'liquid', 'href', 'url', 'src', 'image', 'photo', 'hair', 'skin', 'style', 'top', 'bottom', 'apron', 'fontFamily', 'fontWeight', 'textAlign', 'position', 'key', 'mode', 'type', 'service', 'stylist', 'category', 'concerns', 'after', 'look', 'cut', 'texture', 'length', 'source', 'state', 'phase', 'level', 'tier', 'instagram', 'tiktok', 'phone', 'email', 'whatsapp', 'treatwell', 'site', 'lat', 'lon', 'code', 'number', 'brand', 'line_id', 'option', 'tag', 'chair', 'dye', 'tint', 'shade', 'base', 'mix', 'product', 'products', 'formula', 'man', 'woman', 'gender', 'role_id', 'slot', 'cap', 'stops', 'from', 'drink', 'specialty', 'specialties', 'care', 'explainer', 'doctor', 'doctors', 'room', 'who', 'treatment', 'location', 'ref', 'face', 'outfit', 'extra', 'hijab', 'tie', 'coat', 'shirt', 'beard', 'siteName', 'titleEn', 'photo', 'assistant', 'flags', 'lang', 'shade', 'severity', 'member', 'thumb', 'med', 'skin', 'signal', 'numbFor', 'postcode', 'street', 'city', 'area', 'maps', 'legal', 'instagramUrl', 'siteArabic', 'surfaces', 'by', 'kind', 'n', 'at', 'from', 'path', 'award', 'group']);
const TEXT_KEYS = new Set(['story', 'real', 'kicker', 'why', 'label', 'title', 'name', 'short', 'line', 'text', 'body', 'hint', 'sub', 'unit', 'word', 'note', 'desc', 'description', 'how', 'when', 'what', 'caption', 'kicker', 'tip', 'question', 'answer', 'answers', 'options', 'why', 'do', 'dont', 'more', 'less', 'cta', 'lead', 'quote', 'perk', 'perks', 'step', 'steps', 'detail', 'summary', 'headline', 'message', 'reason', 'advice', 'care', 'role', 'bio', 'about', 'days', 'hours', 'warning', 'result', 'routine', 'size', 'tagline', 'intro', 'outro', 'subtitle', 'place', 'address', 'stop', 'season', 'mood', 'vibe', 'pairs', 'help', 'empty', 'feel']);

const found = new Map(); // text -> first place it was seen

function add(text, where) {
  const t = decode(text).replace(/[ \t]+/g, ' ').trim();
  // Needs words of its own besides the {placeholders}, and is not a CSS value.
  if (!t || !/\p{L}/u.test(t.replace(/\{\w+\}/g, '')) || /^(clamp|calc|min|max)\(/.test(t)) return;
  if (!found.has(t)) found.set(t, where);
  // The runtime also looks up the parts around these separators, so collect them too.
  for (const sep of [' · ', ' — ', ' – ', '\n', ': ']) {
    if (!t.includes(sep)) continue;
    for (const part of t.split(sep)) {
      const p = part.trim();
      if (p && /\p{L}/u.test(p.replace(/\{\w+\}/g, '')) && p !== t && !found.has(p)) found.set(p, where);
    }
  }
}

const ENTITIES = { amp: '&', nbsp: ' ', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", rarr: '→', larr: '←', middot: '·', mdash: '—', ndash: '–', hellip: '…' };
const decode = (s) => s.replace(/&(#?\w+);/g, (m, e) => ENTITIES[e] ?? (e.startsWith('#') ? String.fromCodePoint(Number(e.slice(1))) : m));

/** Could this string be shown to someone? Ids, paths, colours, CSS and code words are not. */
function looksLikeText(s, textContext) {
  const t = s.trim();
  if (!t || !/\p{L}/u.test(t)) return false;
  if (/^(https?:|\/\/|\/|\.\/|\.\.\/|#|rgba?\(|hsla?\(|data:|mailto:|tel:|blob:|var\(|linear-gradient|radial-gradient|translate|rotate|scale|cubic-bezier)/i.test(t)) return false;
  if (/\.(png|jpe?g|webp|gif|mp4|webm|svg|json|tsx?|jsx?|css|tflite|task|wasm|vtt)(\?|$)/i.test(t)) return false;
  if (/^[MmLlCcQqZz][\d\s.,\-]/.test(t) && /\d/.test(t) && !/\s[a-z]{3,}/.test(t)) return false;
  if (/[{};]/.test(t) && /:\s*[^ ]/.test(t) && !/\s[a-z]{3,}\s/.test(t)) return false;
  if (/^[a-z]+([A-Z][a-z0-9]*)+$/.test(t)) return false; // camelCase
  if (/^[A-Z_0-9]{2,}$/.test(t) && !/^(AI|QR|LIVE|APP|NIEUW|NEW|OK)$/.test(t)) return false;
  if (/^[a-z0-9_\-.:/]+$/.test(t)) return textContext; // a single lowercase word: only where it is shown
  if (/^[\w-]+(\s[\w-]+)*$/.test(t) && /^[a-z]/.test(t) && !textContext && !/\s/.test(t)) return false;
  return true;
}

function placeholderName(expr, used) {
  let n = 'x';
  if (ts.isIdentifier(expr)) n = expr.text;
  else if (ts.isPropertyAccessExpression(expr)) n = expr.name.text;
  else if (ts.isCallExpression(expr)) {
    const c = expr.expression;
    n = ts.isIdentifier(c) ? c.text : ts.isPropertyAccessExpression(c) ? c.name.text : 'x';
  } else if (ts.isElementAccessExpression(expr)) n = 'x';
  n = n.replace(/[^\w]/g, '') || 'x';
  let name = n;
  for (let i = 2; used.has(name); i++) name = `${n}${i}`;
  used.add(name);
  return name;
}

/** HTML written as a template: the text between the tags, which is what trHtml looks up. */
function addHtmlOrText(template, where) {
  if (/<\/?[a-z][^>]*>/i.test(template)) {
    for (const piece of template.split(/<[^>]*>/)) add(piece, where);
  } else add(template, where);
}

function templateOf(node) {
  const used = new Set();
  let text = node.head.text;
  for (const span of node.templateSpans) text += `{${placeholderName(span.expression, used)}}` + span.literal.text;
  return text;
}

const hasJsx = (node) => {
  let yes = false;
  const visit = (n) => {
    if (yes) return;
    if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n)) yes = true;
    else ts.forEachChild(n, visit);
  };
  visit(node);
  return yes;
};

// Babel's rule for JSX text: lines are trimmed, blank lines dropped, the rest joined by a space.
function cleanJsx(raw) {
  const lines = raw.split(/\r\n|\n|\r/);
  let last = 0;
  lines.forEach((l, i) => {
    if (/[^ \t]/.test(l)) last = i;
  });
  let s = '';
  lines.forEach((line, i) => {
    let t = line.replace(/\t/g, ' ');
    if (i !== 0) t = t.replace(/^ +/, '');
    if (i !== lines.length - 1) t = t.replace(/ +$/, '');
    if (t) s += i !== last ? `${t} ` : t;
  });
  return s;
}

function jsxChildren(node, where) {
  const used = new Set();
  let mixed = false;
  const pieces = [];
  for (const child of node.children) {
    if (ts.isJsxText(child)) {
      const t = cleanJsx(child.text);
      if (t) pieces.push({ text: t });
    } else if (ts.isJsxExpression(child)) {
      if (!child.expression) continue;
      const e = child.expression;
      if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) pieces.push({ text: e.text });
      else if (hasJsx(e)) mixed = true;
      else pieces.push({ text: `{${placeholderName(e, used)}}`, value: true });
    } else mixed = true;
  }
  if (!pieces.length) return;
  if (mixed) {
    for (const p of pieces) if (!p.value) add(p.text, where);
  } else add(pieces.map((p) => p.text).join(''), where);
}

function attrName(node) {
  return node.name && (ts.isIdentifier(node.name) ? node.name.text : node.name.getText());
}

function context(node) {
  // Walks up to decide whether a string literal is shown as text, and whether it is skipped altogether.
  let textContext = false;
  for (let n = node, child = null; n; child = n, n = n.parent) {
    if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n) || ts.isLiteralTypeNode(n) || ts.isTypeNode(n)) return 'skip';
    if (ts.isCaseClause(n) && child === n.expression) return 'skip';
    if (ts.isBinaryExpression(n) && ['===', '!==', '==', '!=', 'in'].includes(n.operatorToken.getText())) return 'skip';
    if (ts.isElementAccessExpression(n) && child === n.argumentExpression) return 'skip';
    if (ts.isPropertyAssignment(n)) {
      if (child === n.name) return 'skip';
      const key = n.name.getText().replace(/['"]/g, '');
      if (SKIP_KEYS.has(key)) return 'skip';
      if (TEXT_KEYS.has(key)) textContext = true;
      return textContext ? 'text' : 'maybe';
    }
    if (ts.isJsxAttribute(n)) {
      const name = attrName(n);
      if (SKIP_ATTRS.has(name)) return 'skip';
      return TEXT_ATTRS.has(name) || textContext ? 'text' : 'maybe';
    }
    if (ts.isJsxExpression(n) && n.parent && (ts.isJsxElement(n.parent) || ts.isJsxFragment(n.parent))) return 'text';
    if (ts.isCallExpression(n) || ts.isNewExpression(n)) {
      const c = n.expression;
      const name = ts.isIdentifier(c) ? c.text : ts.isPropertyAccessExpression(c) ? c.name.text : '';
      if (SKIP_CALLS.has(name)) return 'skip';
      if (TEXT_CALLS.has(name)) return 'text';
    }
    if (ts.isVariableDeclaration(n) && SKIP_DECLS.has(n.name.getText())) return 'skip';
    if (ts.isReturnStatement(n) || ts.isArrowFunction(n)) textContext = textContext || false;
  }
  return textContext ? 'text' : 'maybe';
}

function visitFile(file) {
  const source = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const where = path.relative(process.cwd(), file);
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && SKIP_DECLS.has(node.name.getText())) return;
    if (ts.isJsxElement(node) || ts.isJsxFragment(node)) jsxChildren(node, where);
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const c = context(node);
      if (c !== 'skip' && looksLikeText(node.text, c === 'text')) addHtmlOrText(node.text, where);
    }
    if (ts.isTemplateExpression(node)) {
      const c = context(node);
      if (c !== 'skip') {
        const t = templateOf(node);
        const literal = t.replace(/\{\w+\}/g, '');
        if (/\p{L}/u.test(literal) && looksLikeText(literal.replace(/<[^>]*>/g, ' ') || 'x', c === 'text')) addHtmlOrText(t, where);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(tsx?|ts)$/.test(entry.name) && !SKIP_FILE.some((r) => r.test(full))) visitFile(full);
  }
}

for (const root of ROOTS) walk(root);

// The start page: its text, a few attributes, and the feature list in its script.
const html = fs.readFileSync('site/index.html', 'utf8');
const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
for (const s of scripts) {
  for (const m of s.matchAll(/"(title|line)":"((?:[^"\\]|\\.)*)"/g)) add(JSON.parse(`"${m[2]}"`), 'site/index.html');
  for (const m of s.matchAll(/'([^'<>]*\p{L}[^'<>]*)'/gu)) if (looksLikeText(m[1], false)) add(m[1], 'site/index.html');
  for (const m of s.matchAll(/>([^<>']*\p{L}[^<>']*)</gu)) add(m[1], 'site/index.html');
}
const body = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
for (const m of body.matchAll(/>([^<>]+)</g)) add(m[1].replace(/\s+/g, ' '), 'site/index.html');
for (const m of body.matchAll(/\s(?:title|alt|aria-label|placeholder)="([^"]+)"/g)) add(m[1], 'site/index.html');
for (const m of body.matchAll(/<meta name="description" content="([^"]+)"/g)) add(m[1], 'site/index.html');

const list = [...found.keys()].sort((a, b) => a.localeCompare(b, 'nl')).map((nl, i) => ({ id: i + 1, nl }));
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(list, null, 1));
const chars = list.reduce((s, e) => s + e.nl.length, 0);
console.log(`${list.length} texts, ${chars} characters, ${list.filter((e) => e.nl.includes('{')).length} with placeholders -> ${out}`);
