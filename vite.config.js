import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/', // Binago natin mula sa '/STUDYCIRCLE.03/' para gumana sa localhost
  plugins: [
    react(),
    tailwindcss(),
  ],
})