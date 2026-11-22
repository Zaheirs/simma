import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' agar aplikasi jalan di subfolder GitHub Pages (https://username.github.io/simma/).
// Navigasi memakai HashRouter (#/...), sehingga tidak ada 404 saat halaman dimuat ulang.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Pisahkan pustaka besar agar cache browser bertahan antar rilis.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
        },
      },
    },
  },
  server: { port: 5173 },
});
