// Fretboard Practice service worker: lets the site open and play with no connection.
// - Pages: network first, so a new version shows as soon as it's online; the cached copy when offline.
// - Built files (hashed names, never change) and drum/instrument samples: cache first.
// - Other sites (Supabase, Google) are never touched.
const APP = 'app-v1'
const MEDIA = 'media-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(APP).then((c) => c.addAll(['./', './manifest.webmanifest', './favicon.svg'])).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== APP && k !== MEDIA).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

const isMedia = (url) => url.pathname.includes('/samples/')
const isBuilt = (url) => url.pathname.includes('/assets/') || url.pathname.includes('/icons/')

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const hit = await cache.match(request, { ignoreVary: true })
  if (hit) return hit
  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone())
  return response
}

async function networkFirst(request) {
  const cache = await caches.open(APP)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request.mode === 'navigate' ? './' : request, response.clone())
    return response
  } catch (err) {
    const hit = (await cache.match(request, { ignoreSearch: true, ignoreVary: true })) ?? (request.mode === 'navigate' ? await cache.match('./', { ignoreVary: true }) : undefined)
    if (hit) return hit
    throw err
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (request.headers.has('range')) return
  if (isMedia(url)) event.respondWith(cacheFirst(request, MEDIA))
  else if (isBuilt(url)) event.respondWith(cacheFirst(request, APP))
  else event.respondWith(networkFirst(request))
})

// Keep every file of the current build (asked for by the page each time it opens), and drop older builds' files.
async function syncBuild() {
  const response = await fetch('./asset-manifest.json', { cache: 'no-store' })
  if (!response.ok) return
  const { files } = await response.json()
  const urls = files.map((f) => new URL(f, self.registration.scope).href)
  const keep = new Set(urls)
  const cache = await caches.open(APP)
  await Promise.all(urls.map((u) => cache.match(u, { ignoreVary: true }).then((hit) => hit ?? cache.add(u).catch(() => {}))))
  for (const req of await cache.keys()) {
    if (new URL(req.url).pathname.includes('/assets/') && !keep.has(req.url)) await cache.delete(req)
  }
}

self.addEventListener('message', (event) => {
  if (event.data?.type === 'sync') event.waitUntil(syncBuild().catch(() => {}))
})
