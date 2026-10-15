import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // The API runs as its own process in dev; the proxy keeps the browser on a
    // single origin so the session cookie just works.
    proxy: {
      '/api': { target: process.env.PULSE_API ?? 'http://localhost:4000', changeOrigin: true },
    },
  },
});
