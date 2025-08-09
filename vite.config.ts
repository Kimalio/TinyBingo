import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    base: '', // для GitHub Pages в корневом репо. Если gh-pages из /docs — поменять.
})