import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the build works on GitHub Pages (https://<user>.github.io/<repo>/) or any sub-path.
  base: './',
  plugins: [react()],
})
