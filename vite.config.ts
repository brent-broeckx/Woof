import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';

/** Injects the list of built assets + a build-specific cache version into dist/sw.js. */
function precacheServiceWorker(): Plugin {
  let outDir = 'dist';
  return {
    name: 'woofdoku-precache-sw',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    writeBundle(_options, bundle) {
      const files = Object.keys(bundle)
        .filter((f) => !f.endsWith('.map') && f !== 'index.html')
        .map((f) => `./${f}`)
        .sort();
      const version = createHash('sha256').update(files.join('\n')).digest('hex').slice(0, 10);
      const swPath = join(outDir, 'sw.js');
      const sw = readFileSync(swPath, 'utf8')
        .replace("const VERSION = 'woofdoku-dev';", `const VERSION = 'woofdoku-${version}';`)
        .replace('const PRECACHE = [];', `const PRECACHE = ${JSON.stringify(files)};`);
      writeFileSync(swPath, sw);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), precacheServiceWorker()],
  test: {
    include: ['src/**/*.test.ts'],
  },
});
