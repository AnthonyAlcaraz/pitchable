import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'router': ['react-router-dom'],
          'socket': ['socket.io-client'],
          'markdown': ['react-markdown', 'remark-gfm'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/presentations': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/chat': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/themes': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/constraints': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/credits': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/billing/': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/exports': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/images': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/knowledge-base': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/pitch-briefs': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/pitch-lens': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/api-keys': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/gallery/presentations': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/gallery/stats': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/mcp': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/analytics/': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
