import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// Two pages in one build, sharing three.js and the 3D builders: the management panel (/admin/) and the website
// (/website/). `npm run site` builds them into _site/ next to the app and the start page.
export default defineConfig({
  // JSX goes through src/i18n, which shows the Dutch text in the chosen language.
  plugins: [react({ jsxImportSource: 'ninja-jsx' })],
  resolve: {
    alias: [{ find: /^ninja-jsx\/(jsx-(dev-)?runtime)$/, replacement: here('./src/i18n/$1.ts') }],
    // The shared package lives outside this folder; one copy of three.js and React for everything.
    dedupe: ['three', 'react', 'react-dom'],
  },
  build: {
    chunkSizeWarningLimit: 3200,
    rollupOptions: { input: { admin: here('./admin/index.html'), website: here('./website/index.html') } },
  },
  server: { port: 5192, strictPort: true, open: false },
  preview: { port: 5193, strictPort: true },
});
