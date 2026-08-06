import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('pdfjs-dist')) return 'pdfjs';
          if (id.includes('react-konva') || id.includes('/konva/')) return 'konva';
          if (
            id.includes('@anthropic-ai/sdk') ||
            id.includes('@google/generative-ai') ||
            id.includes('/openai/')
          ) {
            return 'ai-vendors';
          }
          if (id.includes('d3-force')) return 'graph';
        },
      },
    },
  },
})
