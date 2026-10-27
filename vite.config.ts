import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], server: { middlewareMode: true }, build: { outDir: 'dist', rollupOptions: { output: { manualChunks(id) { if (id.includes('node_modules') && (id.includes('@firebase') || id.includes('/firebase/'))) return 'firebase'; } } } } });
