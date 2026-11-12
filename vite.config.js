import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Lists every built file in asset-manifest.json, so the service worker (public/sw.js) can keep all of them,
// including pages you haven't opened yet, for use offline.
const assetManifest = () => ({
  name: 'asset-manifest',
  generateBundle(_, bundle) {
    const files = Object.keys(bundle).filter((f) => f.startsWith('assets/'))
    this.emitFile({ type: 'asset', fileName: 'asset-manifest.json', source: JSON.stringify({ files }) })
  },
})

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the build works on GitHub Pages (https://<user>.github.io/<repo>/) or any sub-path.
  base: './',
  plugins: [react(), assetManifest()],
})
