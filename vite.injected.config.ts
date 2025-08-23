import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      name: 'rrweb',
      entry: resolve(__dirname, 'src/injected/index.ts'),
      fileName: () => 'rrweb.js.txt',
      formats: ['iife'],
    },
    outDir: 'dist/injected',
    
  },
});
