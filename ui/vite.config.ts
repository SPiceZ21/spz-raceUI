import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

export default defineConfig({
  plugins: [preact({ devToolsEnabled: false })],
  base: './',
  build: { outDir: 'dist', emptyOutDir: true },
})

