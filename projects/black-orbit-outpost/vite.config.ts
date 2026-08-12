import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    // Allow Cloudflare quick tunnels / any Host header in dev
    allowedHosts: true,
  },
  preview: {
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2022',
  },
});
