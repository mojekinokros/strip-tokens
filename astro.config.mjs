import { defineConfig } from 'astro/config';

// Production base path for GitHub Pages project site:
//   https://mojekinokros.github.io/strip-tokens/
// Local development uses ASTRO_BASE=/ so the dev server works at the root.
const base = process.env.ASTRO_BASE ?? '/strip-tokens/';

export default defineConfig({
  site: 'https://mojekinokros.github.io/strip-tokens/',
  base,
  trailingSlash: 'always',
  output: 'static',
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  server: {
    // Allow sandbox/proxied preview hosts (dev/preview only; no production impact).
    allowedHosts: true,
  },
});
