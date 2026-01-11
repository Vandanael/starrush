import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';

export default defineConfig({
  base: './',
  plugins: [
    checker({
      typescript: true,
      overlay: { initialIsOpen: false }
    })
  ],
  build: {
    target: 'es2020',
    outDir: 'docs',
    minify: 'terser',
    sourcemap: false
  },
  server: {
    port: 3000,
    open: true
  }
});
