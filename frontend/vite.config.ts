
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react({ jsxImportSource: '@rw/i18n' }), tailwindcss(), {
    name: 'local-presentation-runtime',
    configResolved(config) {
      // The React plugin adds its runtime to prebundling. Keep our application
      // runtime in the source graph so it shares live language state and copy.
      config.optimizeDeps.include = config.optimizeDeps.include?.filter(id => !id.startsWith('@rw/i18n/'));
    },
  }],
  resolve: { alias: { '@rw/i18n': fileURLToPath(new URL('./src/i18n', import.meta.url)) } },
  optimizeDeps: { exclude: ['@rw/i18n/jsx-runtime', '@rw/i18n/jsx-dev-runtime'] },

  server: {
    port: 5173,

    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: false,
      },
    },
  },
});
