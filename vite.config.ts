import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/rthk-rss': {
        target: 'https://rthk9.rthk.hk',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rthk-rss/, '/rthk/news/rss'),
      },      '/hko-weather': {
        target: 'https://data.weather.gov.hk',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/hko-weather/, '/weatherAPI/opendata'),
      },    },
  },
})
