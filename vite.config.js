import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/weather/',  // ★注意：改成你的 Repository 名稱，前後加斜線
})