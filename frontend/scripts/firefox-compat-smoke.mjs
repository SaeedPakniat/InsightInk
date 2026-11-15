import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:http'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const frontendDir = fileURLToPath(new URL('..', import.meta.url))
const distDir = join(frontendDir, 'dist')
const appPort = Number(process.env.INSIGHTINK_FIREFOX_SMOKE_PORT || 4176)
const debugPort = Number(process.env.INSIGHTINK_FIREFOX_DEBUG_PORT || 9336)
const origin = 'http://127.0.0.1:' + appPort
const debugOrigin = 'http://127.0.0.1:' + debugPort
const firefoxCommand = process.env.INSIGHTINK_FIREFOX || 'firefox'
const artifactDir = mkdtempSync(join(tmpdir(), 'insightink-firefox-smoke-'))
const profileDir = join(artifactDir, 'profile')
const keepArtifacts = process.env.INSIGHTINK_KEEP_SMOKE_ARTIFACTS === '1'
mkdirSync(profileDir, { recursive: true })

const idea = {
  id: 40,
  language: 'en',
  title: 'Firefox compatibility Idea',
  body: 'A deterministic public Idea used for the Firefox production-render compatibility smoke.',
  estimated_read_seconds: 80,
  published_at: '2026-11-12T08:00:00Z',
  creator: { id: 5, display_name: 'Firefox Creator', avatar: null, is_verified: true },
  source: {
    id: 21,
    type: 'article',
    title: 'Firefox compatibility source',
    original_creator_text: 'Source Author',
    language: 'en',
    external_url: 'https://example.com/source',
    cover: '',
  },
  topics: [{ id: 5, slug: 'systems', name_fa: 'سیستم‌ها', name_en: 'Systems' }],
}

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
  if (extension === '.js') return 'text/javascript; charset=utf-8'
  if (extension === '.css') return 'text/css; charset=utf-8'
  if (extension === '.svg') return 'image/svg+xml'
  if (extension === '.png') return 'image/png'
  if (extension === '.woff2') return 'font/woff2'
  return 'application/octet-stream'
}

function serveStatic(request, response) {
  const url = new URL(request.url || '/', origin)
  const path = url.pathname

  if (path === '/api/v1/me/') return json(response, 403, { detail: 'Authentication required.' })
  if (path === '/api/v1/languages/') {
    return json(response, 200, [
      { code: 'en', name_en: 'English', name_fa: 'انگلیسی', native_name: 'English' },
      { code: 'fa', name_en: 'Persian', name_fa: 'فارسی', native_name: 'فارسی' },
    ])
  }
  if (path === '/api/v1/ideas/40/') return json(response, 200, idea)
  if (path === '/api/v1/ideas/40/comments/') return json(response, 200, [])
  if (path === '/api/v1/ideas/40/related/') return json(response, 200, [])

  const relative = path === '/' ? 'index.html' : path.replace(/^\/+/, '')
  const candidate = normalize(join(distDir, relative))

  if (candidate.startsWith(distDir) && existsSync(candidate) && statSync(candidate).isFile()) {
    const body = readFileSync(candidate)
    response.writeHead(200, {
      'Content-Type': relative.endsWith('.html')
        ? 'text/html; charset=utf-8'
        : contentType(candidate),
      'Content-Length': body.length,
      'Cache-Control': 'no-store',
    })
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

class Bidi {
  constructor(url) {
    this.id = 1
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
      if (message.type === 'error') pending.reject(new Error(message.message || message.error))
      else pending.resolve(message.result || {})
    })
  }

  async send(method, params = {}) {
    await this.ready
    const id = this.id++
    const result = new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }))
    this.socket.send(JSON.stringify({ id, method, params }))
    return result
  }

  close() {
    this.socket.close()
  }
}

async function terminate(child) {
  if (!child || child.exitCode !== null) return
  child.kill('SIGTERM')
  await Promise.race([new Promise((resolve) => child.once('exit', resolve)), sleep(1500)])
  if (child.exitCode === null) child.kill('SIGKILL')
}

function inspectPng(path, expectedWidth, expectedHeight) {
  assert(existsSync(path), 'Firefox did not create ' + path)
  const file = readFileSync(path)
  assert(file.length > 10000, 'Firefox screenshot is unexpectedly small: ' + file.length + ' bytes')
  assert(file.subarray(1, 4).toString() === 'PNG', 'Firefox artifact is not a PNG')
  const width = file.readUInt32BE(16)
  const height = file.readUInt32BE(20)
  assert(
    width === expectedWidth && height === expectedHeight,
    'Unexpected screenshot size: ' + width + 'x' + height,
  )
  return { bytes: file.length, width, height }
}

async function waitForRenderedIdea(bidi, context, timeoutMs = 12000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const result = await bidi.send('script.evaluate', {
      expression:
        "Boolean(document.querySelector('.idea-detail-page h1')?.textContent?.includes('Firefox compatibility Idea'))",
      target: { context },
      awaitPromise: true,
      resultOwnership: 'none',
    })
    if (result.result && result.result.value === true) return
    await sleep(100)
  }
  throw new Error('Timed out waiting for Firefox to render the Idea detail.')
}

async function browserEvidence(bidi, context) {
  const result = await bidi.send('script.evaluate', {
    expression:
      'JSON.stringify({ lang:document.documentElement.lang, dir:document.documentElement.dir, ' +
      "sticky:getComputedStyle(document.querySelector('.site-header')).position, " +
      'overflow:document.documentElement.scrollWidth>innerWidth, ' +
      "title:document.querySelector('.idea-detail-page h1')?.textContent?.trim(), " +
      "share:Boolean(document.querySelector('.idea-share-action button')) })",
    target: { context },
    awaitPromise: true,
    resultOwnership: 'none',
  })
  return JSON.parse(result.result.value)
}

async function capture(bidi, context, width, height, path) {
  await bidi.send('browsingContext.setViewport', {
    context,
    viewport: { width, height },
    devicePixelRatio: 1,
  })
  await sleep(250)
  const screenshot = await bidi.send('browsingContext.captureScreenshot', {
    context,
    origin: 'viewport',
  })
  writeFileSync(path, Buffer.from(screenshot.data, 'base64'))
  return browserEvidence(bidi, context)
}

const server = createServer(serveStatic)
let firefoxProcess
let bidi

try {
  assert(
    existsSync(join(distDir, 'index.html')),
    'dist/index.html is missing. Run npm run build first.',
  )
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(appPort, '127.0.0.1', resolve)
  })

  firefoxProcess = spawn(
    firefoxCommand,
    [
      '--headless',
      '--remote-debugging-port',
      String(debugPort),
      '--remote-allow-hosts',
      '127.0.0.1,localhost',
      '--remote-allow-origins',
      debugOrigin,
      '--profile',
      profileDir,
      'about:blank',
    ],
    {
      env: { ...process.env, MOZ_HEADLESS: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )

  await waitForHttp(debugOrigin)
  bidi = new Bidi('ws://127.0.0.1:' + debugPort + '/session')
  const session = await bidi.send('session.new', { capabilities: {} })
  const tree = await bidi.send('browsingContext.getTree', {})
  const context = tree.contexts && tree.contexts[0] && tree.contexts[0].context
  assert(context, 'Firefox did not expose a browsing context.')

  await bidi.send('browsingContext.navigate', {
    context,
    url: origin + '/ideas/40',
    wait: 'complete',
  })
  await waitForRenderedIdea(bidi, context)

  const desktopPath = join(artifactDir, 'firefox-desktop.png')
  const compactPath = join(artifactDir, 'firefox-compact.png')
  const desktopEvidence = await capture(bidi, context, 1440, 900, desktopPath)
  const compactEvidence = await capture(bidi, context, 390, 844, compactPath)

  assert(
    desktopEvidence.title === 'Firefox compatibility Idea',
    'Firefox desktop Idea title did not render.',
  )
  assert(
    compactEvidence.title === 'Firefox compatibility Idea',
    'Firefox compact Idea title did not render.',
  )
  assert(
    desktopEvidence.sticky === 'sticky' && compactEvidence.sticky === 'sticky',
    'Firefox sticky header check failed.',
  )
  assert(
    !desktopEvidence.overflow && !compactEvidence.overflow,
    'Firefox layout has horizontal overflow.',
  )
  assert(desktopEvidence.share && compactEvidence.share, 'Firefox Share control is missing.')

  const version = spawnSync(firefoxCommand, ['--version'], { encoding: 'utf8' })
  const summary = {
    browser: (version.stdout || version.stderr || '').trim(),
    browserVersion: session.capabilities && session.capabilities.browserVersion,
    productionBundle: true,
    route: '/ideas/40',
    desktop: {
      ...inspectPng(desktopPath, 1440, 900),
      ...desktopEvidence,
    },
    compact: {
      ...inspectPng(compactPath, 390, 844),
      ...compactEvidence,
    },
    artifacts: keepArtifacts ? [desktopPath, compactPath] : 'removed after verification',
  }

  console.log(JSON.stringify(summary, null, 2))
  await bidi.send('session.end', {})
} catch (error) {
  console.error(error instanceof Error ? error.stack : error)
  process.exitCode = 1
} finally {
  try {
    bidi && bidi.close()
  } catch {}
  await terminate(firefoxProcess)
  await new Promise((resolve) => server.close(resolve))
  if (!keepArtifacts) rmSync(artifactDir, { recursive: true, force: true })
}
