import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/pexels': {
        target: 'https://api.pexels.com/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/pexels/, ''),
      },
    },
  },
});
