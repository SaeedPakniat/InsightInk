import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const backendTarget = process.env.VITE_DEV_BACKEND_TARGET || 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: false,
      },
    },
  },
  build: {
    target: ['es2018', 'safari14'],
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
