// Installs the service worker (public/sw.js) so the site opens offline and can be added to a phone's home screen.
// Only in a production build: in development it would serve stale files.
export function registerOffline() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js', { scope: './' })
      .then(() => navigator.serviceWorker.ready)
      // Fetch the rest of this version's files in the background, so every page opens offline.
      .then((reg) => reg.active?.postMessage({ type: 'sync' }))
      .catch(() => {
        // No offline copy this time; the site works as before.
      })
  })
}
