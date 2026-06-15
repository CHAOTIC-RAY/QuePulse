import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        devOptions: { enabled: false },
        includeAssets: ['icons/icon.svg'],
        manifest: {
          name: 'QuePulse - Hospital Queue Tracker',
          short_name: 'QuePulse',
          description: 'Real-time hospital queue tracking with smart alerts for Maldives hospitals.',
          theme_color: '#2563eb',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'portrait-primary',
          scope: '/',
          start_url: '/',
          categories: ['health', 'medical', 'utilities'],
          icons: [
            {
              src: '/icons/icon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any',
            },
            {
              src: '/icons/icon.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'maskable',
            },
          ],
          shortcuts: [
            { name: 'HMH Queues', url: '/?hospital=hmh', icons: [{ src: '/icons/icon.svg', sizes: '96x96' }] },
            { name: 'IGMH Queues', url: '/?hospital=igmh', icons: [{ src: '/icons/icon.svg', sizes: '96x96' }] },
          ],
        },
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
        },
      }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
