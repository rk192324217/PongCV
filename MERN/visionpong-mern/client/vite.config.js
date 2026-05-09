import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy /api calls to the Express server during development
    // This means you call /api/auth/login in React and Vite forwards it to :5000
    // No CORS issues in dev, no hardcoded localhost:5000 in your React code
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true, // proxy WebSocket connections too
      },
    },
  },
})
