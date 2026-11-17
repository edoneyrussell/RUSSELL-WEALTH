
import { defineConfig } from 'vite';
import { execFileSync } from 'node:child_process';
const buildMetadata = () => {
  const git = (args: string[]) => {try {return execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();} catch {return null;}};
  return {provider:process.env.VERCEL ? 'Vercel' : 'Application',commit:process.env.VERCEL_GIT_COMMIT_SHA || git(['rev-parse','HEAD']),branch:process.env.VERCEL_GIT_COMMIT_REF || git(['rev-parse','--abbrev-ref','HEAD']),environment:process.env.VERCEL_ENV || 'local',built_at:new Date().toISOString()};
};
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react({ jsxImportSource: '@rw/i18n' }), tailwindcss(), {
    name: 'local-presentation-runtime',
    generateBundle() {
      this.emitFile({type:'asset',fileName:'deployment.json',source:JSON.stringify(buildMetadata())});
    },
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
