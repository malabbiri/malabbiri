import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'google-sheets-proxy',
        configureServer(server) {
          server.middlewares.use('/api/sync-google-sheets', async (req, res) => {
            try {
              const urlObj = new URL(req.url || '', 'http://localhost');
              const sheetId = urlObj.searchParams.get('id') || '1sLzphCK2Zhp6k0aHTY-YnOiECaGMmpkBZAUtSmqyu0Q';
              const targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
              const response = await fetch(targetUrl);
              const csvText = await response.text();
              res.setHeader('Content-Type', 'text/csv; charset=utf-8');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(csvText);
            } catch (err: any) {
              res.statusCode = 500;
              res.end(err.message || 'Error proxying Google Sheets');
            }
          });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
