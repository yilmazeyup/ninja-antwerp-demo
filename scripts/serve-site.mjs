// Serves _site/ the way GitHub Pages does: under the base path, folders with a trailing slash, and 404.html (the app)
// for any address that is not a file. Usage: node scripts/serve-site.mjs [port], by default 8108
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../_site', import.meta.url));
const base = '/ninja-antwerp-demo';
const port = Number(process.argv[2] ?? 8108);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.vtt': 'text/vtt; charset=utf-8',
  '.webp': 'image/webp',
  '.obj': 'text/plain; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.webm': 'video/webm',
};

if (!fs.existsSync(path.join(root, '404.html'))) {
  console.error('No site yet: run `npm run site` first.');
  process.exit(1);
}

http
  .createServer((req, res) => {
    const { pathname } = new URL(req.url ?? '/', 'http://localhost');
    if (pathname === '/' || pathname === base) return redirect(res, `${base}/`);
    let file = path.join(root, '404.html');
    let status = 404;
    if (pathname.startsWith(`${base}/`)) {
      let wanted = path.join(root, safeDecode(pathname.slice(base.length)));
      if (wanted.startsWith(root) && fs.existsSync(wanted) && fs.statSync(wanted).isDirectory()) {
        if (!pathname.endsWith('/')) return redirect(res, `${pathname}/`);
        wanted = path.join(wanted, 'index.html');
      }
      if (wanted.startsWith(root) && fs.existsSync(wanted) && fs.statSync(wanted).isFile()) [file, status] = [wanted, 200];
    }
    const size = fs.statSync(file).size;
    const type = TYPES[path.extname(file)] ?? 'application/octet-stream';
    // Ranges let a video seek.
    const range = status === 200 ? /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? '') : null;
    if (range) {
      const start = Number(range[1] || 0);
      const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
      res.writeHead(206, { 'content-type': type, 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': end - start + 1 });
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(status, { 'content-type': type, 'content-length': size, 'accept-ranges': 'bytes' });
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, () => console.log(`Demo site: http://localhost:${port}${base}/`));

function redirect(res, location) {
  res.writeHead(301, { location });
  res.end();
}

function safeDecode(text) {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}
