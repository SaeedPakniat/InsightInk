const CACHE_PREFIX = 'insightink-'
const PRECACHE_NAME = CACHE_PREFIX + 'precache-v1'
const ASSET_CACHE_NAME = CACHE_PREFIX + 'assets-v1'
const MAX_ASSET_ENTRIES = 40
const OFFLINE_URL = '/offline.html'

const PRECACHE_URLS = [
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/favicon.svg',
  '/pwa-192.png',
  '/pwa-512.png',
  '/pwa-maskable-512.png',
  '/apple-touch-icon.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(PRECACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith(CACHE_PREFIX) && key !== PRECACHE_NAME && key !== ASSET_CACHE_NAME,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

async function trimAssetCache() {
  const cache = await caches.open(ASSET_CACHE_NAME)
  const requests = await cache.keys()

  while (requests.length > MAX_ASSET_ENTRIES) {
    const oldest = requests.shift()
    if (oldest) await cache.delete(oldest)
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Personalized API responses are deliberately network-only.
  if (url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)))
    return
  }

  if (url.origin !== self.location.origin || !url.pathname.startsWith('/assets/')) return

  event.respondWith(
    caches.open(ASSET_CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request)
      if (cached) return cached

      const response = await fetch(request)
      if (!response || !response.ok || response.type === 'opaque') return response

      event.waitUntil(cache.put(request, response.clone()).then(() => trimAssetCache()))

      return response
    }),
  )
})
