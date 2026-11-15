import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const frontendDir = fileURLToPath(new URL('..', import.meta.url))
const distDir = join(frontendDir, 'dist')
const appPort = Number(process.env.INSIGHTINK_PWA_SMOKE_PORT || 4177)
const debugPort = Number(process.env.INSIGHTINK_PWA_DEBUG_PORT || 9337)
const appOrigin = 'http://127.0.0.1:' + appPort
const debugOrigin = 'http://127.0.0.1:' + debugPort
const chromiumCommand = process.env.INSIGHTINK_CHROMIUM || 'chromium'
const profileDir = mkdtempSync(join(tmpdir(), 'insightink-pwa-smoke-'))

const idea = {
  id: 40,
  language: 'en',
  title: 'PWA smoke Idea',
  body: 'A deterministic public Idea used to exercise runtime static-asset caching.',
  estimated_read_seconds: 60,
  published_at: '2026-11-15T12:00:00Z',
  creator: { id: 5, display_name: 'PWA Creator', avatar: null, is_verified: false },
  source: {
    id: 21,
    type: 'article',
    title: 'PWA source',
    original_creator_text: 'Source Author',
    language: 'en',
    external_url: 'https://example.com/source',
    cover: '',
  },
  topics: [{ id: 5, slug: 'systems', name_fa: 'سیستم‌ها', name_en: 'Systems' }],
}

let server
let browserProcess
let cdp
let failOfflineNavigation = false

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitForHttp(url, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.status > 0) return
    } catch {}
    await sleep(100)
  }
  throw new Error('Timed out waiting for ' + url)
}

function json(response, status, payload) {
  const body = JSON.stringify(payload)
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  })
  response.end(body)
}

function contentType(path) {
  const extension = extname(path)
  if (extension === '.html') return 'text/html; charset=utf-8'
  if (extension === '.js') return 'text/javascript; charset=utf-8'
  if (extension === '.css') return 'text/css; charset=utf-8'
  if (extension === '.svg') return 'image/svg+xml'
  if (extension === '.png') return 'image/png'
  if (extension === '.webmanifest') return 'application/manifest+json'
  if (extension === '.woff2') return 'font/woff2'
  return 'application/octet-stream'
}

function serve(request, response) {
  const url = new URL(request.url || '/', appOrigin)
  const path = url.pathname

  if (path === '/api/v1/me/') {
    return json(response, 403, { detail: 'Authentication required.' })
  }

  if (path === '/api/v1/languages/') {
    return json(response, 200, [
      { code: 'en', name_en: 'English', name_fa: 'انگلیسی', native_name: 'English' },
      { code: 'fa', name_en: 'Persian', name_fa: 'فارسی', native_name: 'فارسی' },
    ])
  }

  if (path === '/api/v1/ideas/40/') return json(response, 200, idea)
  if (path === '/api/v1/ideas/40/comments/') return json(response, 200, [])
  if (path === '/api/v1/ideas/40/related/') return json(response, 200, [])

  if (path === '/offline-check' && failOfflineNavigation) {
    request.socket.destroy()
    return
  }

  const relative = path === '/' ? 'index.html' : path.replace(/^\/+/, '')
  const candidate = normalize(join(distDir, relative))

  if (candidate.startsWith(distDir) && existsSync(candidate) && statSync(candidate).isFile()) {
    const body = readFileSync(candidate)
    const headers = {
      'Content-Type': contentType(candidate),
      'Content-Length': body.length,
      'Cache-Control': relative === 'service-worker.js' ? 'no-cache' : 'no-store',
    }

    if (relative === 'service-worker.js') {
      headers['Service-Worker-Allowed'] = '/'
    }

    response.writeHead(200, headers)
    response.end(body)
    return
  }

  const index = readFileSync(join(distDir, 'index.html'))
  response.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': index.length,
    'Cache-Control': 'no-store',
  })
  response.end(index)
}

class Cdp {
  constructor(url) {
    this.nextId = 1
    this.pending = new Map()
    this.socket = new WebSocket(url)
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true })
      this.socket.addEventListener('error', reject, { once: true })
    })
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data)
      if (!message.id) return
      const pending = this.pending.get(message.id)
      if (!pending) return
      this.pending.delete(message.id)
      if (message.error) pending.reject(new Error(message.error.message))
      else pending.resolve(message.result || {})
    })
  }

  async send(method, params = {}) {
    await this.ready
    const id = this.nextId++
    const result = new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }))
    this.socket.send(JSON.stringify({ id, method, params }))
    return result
  }

  close() {
    this.socket.close()
  }
}

async function evaluate(expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  })

  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || 'Browser evaluation failed.')
  }

  return result.result && result.result.value
}

async function waitForJs(expression, label, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      if (await evaluate(expression)) return
    } catch {}
    await sleep(100)
  }
  throw new Error('Timed out waiting for ' + label)
}

async function navigate(path) {
  await cdp.send('Page.navigate', { url: appOrigin + path })
  await waitForJs("document.readyState === 'complete'", 'navigation to ' + path)
}

async function cacheEvidence() {
  return evaluate(
    '(async () => { const result = {}; const keys = await caches.keys(); for (const key of keys) { const cache = await caches.open(key); result[key] = (await cache.keys()).map((request) => new URL(request.url).pathname); } return result; })()',
  )
}

async function terminate(child) {
  if (!child || child.exitCode !== null) return
  child.kill('SIGTERM')
  await Promise.race([new Promise((resolve) => child.once('exit', resolve)), sleep(1500)])
  if (child.exitCode === null) child.kill('SIGKILL')
}

async function run() {
  assert(
    existsSync(join(distDir, 'index.html')),
    'dist/index.html is missing. Run npm run build first.',
  )

  server = createServer(serve)
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(appPort, '127.0.0.1', resolve)
  })

  browserProcess = spawn(
    chromiumCommand,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--remote-debugging-port=' + debugPort,
      '--remote-allow-origins=*',
      '--user-data-dir=' + profileDir,
      'about:blank',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  )

  await waitForHttp(debugOrigin + '/json')
  const targets = await fetch(debugOrigin + '/json').then((response) => response.json())
  const page = targets.find((target) => target.type === 'page')
  assert(page && page.webSocketDebuggerUrl, 'No Chromium page target found.')

  cdp = new Cdp(page.webSocketDebuggerUrl)
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')
  await cdp.send('Network.enable')

  await navigate('/')

  await waitForJs(
    'navigator.serviceWorker?.ready.then(() => Boolean(navigator.serviceWorker.controller)).catch(() => false)',
    'active controlling service worker',
  )

  const registration = await evaluate(
    'navigator.serviceWorker.getRegistration().then((value) => ({ scope: value?.scope || null, activeState: value?.active?.state || null, scriptURL: value?.active?.scriptURL || null }))',
  )

  assert(
    registration.scope === appOrigin + '/',
    'Unexpected service worker scope: ' + registration.scope,
  )
  assert(registration.activeState === 'activated', 'Service worker is not activated.')
  assert(
    registration.scriptURL === appOrigin + '/service-worker.js',
    'Unexpected service worker script URL: ' + registration.scriptURL,
  )

  const manifest = await evaluate(
    "fetch('/manifest.webmanifest').then((response) => response.json())",
  )

  assert(manifest.name === 'InsightInk', 'Manifest name mismatch.')
  assert(manifest.short_name === 'InsightInk', 'Manifest short_name mismatch.')
  assert(manifest.start_url === '/', 'Manifest start_url mismatch.')
  assert(manifest.scope === '/', 'Manifest scope mismatch.')
  assert(manifest.display === 'standalone', 'Manifest display mode is not standalone.')
  assert(
    Array.isArray(manifest.icons) &&
      manifest.icons.some((icon) => icon.sizes === '192x192') &&
      manifest.icons.some((icon) => icon.sizes === '512x512' && icon.purpose === 'any') &&
      manifest.icons.some((icon) => icon.sizes === '512x512' && icon.purpose === 'maskable'),
    'Manifest icon set is incomplete.',
  )

  const appManifest = await cdp.send('Page.getAppManifest')
  assert(
    (appManifest.errors || []).length === 0,
    'Chromium manifest errors: ' + JSON.stringify(appManifest.errors),
  )

  const installability = await cdp.send('Page.getInstallabilityErrors')
  assert(
    (installability.installabilityErrors || []).length === 0,
    'Chromium installability errors: ' + JSON.stringify(installability.installabilityErrors),
  )

  const precache = await cacheEvidence()
  const precacheEntries = precache['insightink-precache-v1'] || []
  for (const required of [
    '/offline.html',
    '/manifest.webmanifest',
    '/favicon.svg',
    '/pwa-192.png',
    '/pwa-512.png',
    '/pwa-maskable-512.png',
    '/apple-touch-icon.png',
  ]) {
    assert(precacheEntries.includes(required), 'Precache is missing ' + required)
  }

  await navigate('/ideas/40')
  await waitForJs(
    "document.querySelector('.idea-detail-page h1')?.textContent?.includes('PWA smoke Idea')",
    'public Idea detail under service worker control',
  )

  await sleep(250)
  const onlineCaches = await cacheEvidence()
  const assetEntries = onlineCaches['insightink-assets-v1'] || []
  assert(
    assetEntries.some((path) => path.startsWith('/assets/')),
    'No hashed build assets were runtime-cached.',
  )

  const allCachedPaths = Object.values(onlineCaches).flat()
  assert(
    !allCachedPaths.some((path) => path.startsWith('/api/')),
    'A personalized API URL was incorrectly added to CacheStorage.',
  )

  failOfflineNavigation = true
  await cdp.send('Page.navigate', { url: appOrigin + '/offline-check' })
  await waitForJs("document.body?.dataset.offlinePage === 'true'", 'offline fallback document')

  const offlineEvidence = await evaluate(
    "({ title: document.title, persian: document.body.textContent.includes('فعلاً آفلاین هستید'), english: document.body.textContent.includes('You are offline.'), retry: Boolean(document.querySelector('button')) })",
  )

  assert(offlineEvidence.persian, 'Persian offline fallback text is missing.')
  assert(offlineEvidence.english, 'English offline fallback text is missing.')
  assert(offlineEvidence.retry, 'Offline fallback retry control is missing.')

  console.log(
    JSON.stringify(
      {
        browser: await evaluate('navigator.userAgent'),
        manifest: {
          name: manifest.name,
          display: manifest.display,
          startUrl: manifest.start_url,
          iconCount: manifest.icons.length,
          chromiumManifestErrors: (appManifest.errors || []).length,
          chromiumInstallabilityErrors: (installability.installabilityErrors || []).length,
        },
        serviceWorker: registration,
        cache: {
          precacheEntries: precacheEntries.length,
          runtimeAssetEntries: assetEntries.length,
          apiEntries: allCachedPaths.filter((path) => path.startsWith('/api/')).length,
        },
        offline: offlineEvidence,
      },
      null,
      2,
    ),
  )
}

try {
  await run()
} catch (error) {
  console.error(error instanceof Error ? error.stack : error)
  process.exitCode = 1
} finally {
  try {
    cdp && cdp.close()
  } catch {}
  await terminate(browserProcess)
  if (server) {
    await new Promise((resolve) => server.close(resolve))
  }
  rmSync(profileDir, { recursive: true, force: true })
}
