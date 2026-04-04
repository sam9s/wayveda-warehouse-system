import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "")

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 4173,
      proxy: {
        '/api': {
          changeOrigin: true,
          secure: false,
          target: env.VITE_PROXY_TARGET || 'http://localhost:4002',
        },
      },
    },
  }
})
