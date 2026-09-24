// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://shiftify.in',
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
    // Keep asset URLs stable for long-cache headers on Cloudflare Pages
    assets: '_assets',
  },
  integrations: [preact(), mdx()],
  vite: {
    plugins: [tailwindcss()],
    build: {
      // Small islands only; warn loudly if a chunk creeps up
      chunkSizeWarningLimit: 45,
    },
  },
  image: {
    // sharp for astro:assets → AVIF + WebP derivatives
    service: { entrypoint: 'astro/assets/services/sharp' },
  },
  prefetch: false,
  // Arena/e2b preview sandboxes proxy under {port}-{id}.e2b.app
  server: {
    allowedHosts: ['.e2b.app'],
    proxy: {
      '/api': {
        target: process.env.PUBLIC_BACKEND_URL || 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
  preview: { allowedHosts: ['.e2b.app', 'localhost', '127.0.0.1'] },
});
