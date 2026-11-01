// Builds the demo site into _site/, the way GitHub Pages publishes it at https://ninja.savastana.com/:
//   /          the start page (site/index.html): the demo explained, with the app and the panel side by side
//   /app/      the guest app, exported for the web
//   /admin/    the management panel with Ninja in 3D        (apps/web, one Vite build with the website)
//   /website/  the website concept
//   /photos/, /brand/, /people/  Ninja's photos, the logo files and the Match portraits (apps/web/public)
//   /404.html  the app again: GitHub Pages answers unknown addresses with it, so a link to a screen opens that screen
// Usage: node scripts/build-site.mjs [base path], by default the root
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const base = (process.argv[2] ?? '').replace(/\/$/, '');
const run = (command, cwd, env = {}) => execSync(command, { cwd, stdio: 'inherit', env: { ...process.env, ...env } });

fs.rmSync('_site', { recursive: true, force: true });
run(`npx vite build --base=${base}/ --outDir ../../_site --emptyOutDir`, 'apps/web');
run('npx expo export --platform web --output-dir ../../_site/app', 'apps/app', { EXPO_BASE_URL: `${base}/app` });
fs.cpSync('site', '_site', { recursive: true });
// The start page translates itself with the same dictionaries as the app and the panel.
fs.mkdirSync('_site/i18n', { recursive: true });
for (const file of fs.readdirSync('packages/shared/src/i18n')) if (file.endsWith('.json')) fs.copyFileSync(`packages/shared/src/i18n/${file}`, `_site/i18n/${file}`);
// The demo uses fictional guests, so the app stays out of search results; black lacquer from the very first moment.
const page = '_site/app/index.html';
const html = fs
  .readFileSync(page, 'utf8')
  .replace('<head>', '<head><meta name="robots" content="noindex, nofollow" />')
  .replace(
    '</head>',
    '<link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin /><style>html,body{background:#0B0807}</style></head>',
  );
fs.writeFileSync(page, html);
fs.copyFileSync(page, '_site/404.html');
fs.writeFileSync('_site/.nojekyll', '');
console.log(`Built _site/ for ${base}/`);
