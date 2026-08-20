import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/STUDYCIRCLE.03/', // <--- Replace with your exact GitHub repository name
  plugins: [
    react(),
    tailwindcss(),
  ],
})