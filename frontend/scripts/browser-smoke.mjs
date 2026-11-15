import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const frontendDir = fileURLToPath(new URL('..', import.meta.url))
const appPort = Number(process.env.INSIGHTINK_SMOKE_PORT || 4175)
const debugPort = Number(process.env.INSIGHTINK_CHROMIUM_DEBUG_PORT || 9335)
const appOrigin = 'http://127.0.0.1:' + appPort
const debugOrigin = 'http://127.0.0.1:' + debugPort
const chromiumCommand = process.env.INSIGHTINK_CHROMIUM || 'chromium'
const profileDir = mkdtempSync(join(tmpdir(), 'insightink-smoke-'))

const idea = {
  id: 40,
  language: 'en',
  title: 'Browser smoke Idea',
  body: 'A deterministic Idea used by the browser hardening smoke test.',
  estimated_read_seconds: 90,
  published_at: '2026-11-12T08:00:00Z',
  creator: { id: 5, display_name: 'Browser Creator', avatar: null, is_verified: true },
  source: {
    id: 21,
    type: 'article',
    title: 'Browser smoke source',
    original_creator_text: 'Source Author',
    language: 'en',
    external_url: 'https://example.com/source',
    cover: '',
  },
  topics: [{ id: 5, slug: 'systems', name_fa: 'سیستم‌ها', name_en: 'Systems' }],
}

const user = {
  id: 77,
  email: 'reader@example.com',
  display_name: 'Browser Reader',
  preferred_ui_language: 'en',
  avatar_url: null,
  capabilities: { can_moderate: false, can_administer: false },
}

const state = {
  loggedIn: false,
  sparked: false,
  saved: false,
  comments: [],
  requests: [],
}

let viteProcess
let browserProcess
let cdp
let eventFailure

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitForHttp(url, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: 'manual' })
      if (response.status > 0) return
    } catch {}
    await sleep(100)
  }
  throw new Error('Timed out waiting for ' + url)
}

class Cdp {
  constructor(url) {
    this.id = 1
    this.pending = new Map()
    this.handlers = new Map()
    this.socket = new WebSocket(url)
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true })
      this.socket.addEventListener('error', reject, { once: true })
    })
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data)
      if (message.id) {
        const pending = this.pending.get(message.id)
        if (!pending) return
        this.pending.delete(message.id)
        if (message.error) pending.reject(new Error(message.error.message))
        else pending.resolve(message.result || {})
        return
      }
      const handlers = this.handlers.get(message.method) || []
      for (const handler of handlers) {
        Promise.resolve(handler(message.params || {})).catch((error) => {
          eventFailure = error instanceof Error ? error : new Error(String(error))
        })
      }
    })
  }

  on(method, handler) {
    const handlers = this.handlers.get(method) || []
    handlers.push(handler)
    this.handlers.set(method, handlers)
  }

  async send(method, params = {}) {
    await this.ready
    if (eventFailure) throw eventFailure
    const id = this.id++
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
  if (result.exceptionDetails)
    throw new Error(result.exceptionDetails.text || 'Browser evaluation failed')
  return result.result && result.result.value
}

async function waitForJs(expression, label, timeoutMs = 12000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (eventFailure) throw eventFailure
    try {
      if (await evaluate(expression)) return
    } catch {}
    await sleep(75)
  }
  throw new Error('Timed out waiting for ' + label)
}

async function waitForHost(predicate, label, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (eventFailure) throw eventFailure
    if (predicate()) return
    await sleep(50)
  }
  throw new Error('Timed out waiting for ' + label)
}

async function navigate(path) {
  await cdp.send('Page.navigate', { url: appOrigin + path })
  await waitForJs("document.readyState === 'complete'", 'navigation to ' + path)
}

async function setValue(selector, value) {
  const expression =
    '(() => { const e=document.querySelector(' +
    JSON.stringify(selector) +
    ');' +
    'if(!e)return false; const p=e instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;' +
    "const s=Object.getOwnPropertyDescriptor(p,'value').set; s.call(e," +
    JSON.stringify(value) +
    ');' +
    "e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); return true; })()"
  assert(await evaluate(expression), 'Could not set ' + selector)
}

async function click(selector) {
  const expression =
    '(() => { const e=document.querySelector(' +
    JSON.stringify(selector) +
    '); if(!e)return false; e.click(); return true; })()'
  assert(await evaluate(expression), 'Could not click ' + selector)
}

async function fulfill(requestId, status, payload) {
  const body = status === 204 || payload == null ? '' : JSON.stringify(payload)
  await cdp.send('Fetch.fulfillRequest', {
    requestId,
    responseCode: status,
    responseHeaders: [
      { name: 'Content-Type', value: 'application/json' },
      { name: 'Cache-Control', value: 'no-store' },
    ],
    body: Buffer.from(body).toString('base64'),
  })
}

async function handleRequest(params) {
  const request = params.request
  const url = new URL(request.url)
  const path = url.pathname
  const method = request.method.toUpperCase()
  state.requests.push(method + ' ' + path + url.search)

  if (path === '/api/v1/me/' && method === 'GET') {
    return fulfill(
      params.requestId,
      state.loggedIn ? 200 : 403,
      state.loggedIn ? user : { detail: 'Authentication required.' },
    )
  }
  if (path === '/api/v1/auth/csrf/' && method === 'GET') {
    return fulfill(params.requestId, 200, { csrfToken: 'browser-smoke-csrf' })
  }
  if (path === '/api/v1/auth/login/' && method === 'POST') {
    const payload = JSON.parse(request.postData || '{}')
    if (payload.email !== user.email || payload.password !== 'browser-smoke-password') {
      return fulfill(params.requestId, 400, { detail: 'Invalid credentials.' })
    }
    state.loggedIn = true
    return fulfill(params.requestId, 200, user)
  }
  if (path === '/api/v1/languages/' && method === 'GET') {
    return fulfill(params.requestId, 200, [
      { code: 'en', name_en: 'English', name_fa: 'انگلیسی', native_name: 'English' },
      { code: 'fa', name_en: 'Persian', name_fa: 'فارسی', native_name: 'فارسی' },
    ])
  }
  if (path === '/api/v1/recommendations/' && method === 'GET') {
    return fulfill(params.requestId, 200, [{ idea, score: 0.91, reason: 'Interest overlap.' }])
  }
  if (path === '/api/v1/me/engagement/' && method === 'GET') {
    return fulfill(params.requestId, 200, {
      items: [{ idea_id: 40, sparked: state.sparked, saved: state.saved }],
    })
  }
  if (path === '/api/v1/ideas/40/' && method === 'GET') return fulfill(params.requestId, 200, idea)
  if (path === '/api/v1/ideas/40/related/' && method === 'GET')
    return fulfill(params.requestId, 200, [])
  if (path === '/api/v1/ideas/40/spark/' && (method === 'PUT' || method === 'DELETE')) {
    state.sparked = method === 'PUT'
    return fulfill(params.requestId, 204, null)
  }
  if (path === '/api/v1/ideas/40/save/' && (method === 'PUT' || method === 'DELETE')) {
    state.saved = method === 'PUT'
    return fulfill(params.requestId, 204, null)
  }
  if (path === '/api/v1/ideas/40/comments/' && method === 'GET') {
    return fulfill(params.requestId, 200, state.comments)
  }
  if (path === '/api/v1/ideas/40/comments/' && method === 'POST') {
    const payload = JSON.parse(request.postData || '{}')
    state.comments = [
      {
        id: 501,
        author: { id: user.id, display_name: user.display_name },
        body: String(payload.body || '').trim(),
        created_at: '2026-11-15T12:00:00Z',
        updated_at: '2026-11-15T12:00:00Z',
      },
    ]
    return fulfill(params.requestId, 201, state.comments[0])
  }
  if (path === '/api/v1/library/saved/' && method === 'GET') {
    return fulfill(
      params.requestId,
      200,
      state.saved ? [{ saved_at: '2026-11-15T12:01:00Z', idea }] : [],
    )
  }

  return fulfill(params.requestId, 404, {
    detail: 'Unstubbed browser smoke endpoint: ' + method + ' ' + path,
  })
}

async function accessibilityIssues() {
  await cdp.send('Accessibility.enable')
  const tree = await cdp.send('Accessibility.getFullAXTree')
  const roles = new Set([
    'button',
    'link',
    'textbox',
    'combobox',
    'checkbox',
    'radio',
    'switch',
    'menuitem',
  ])
  return (tree.nodes || [])
    .filter((node) => !node.ignored && roles.has(node.role && node.role.value))
    .filter((node) => !String((node.name && node.name.value) || '').trim())
    .map((node) => ({
      role: node.role && node.role.value,
      backendDOMNodeId: node.backendDOMNodeId,
    }))
}

async function pressKey(key, code, keyCode) {
  const downType = key === 'Enter' ? 'rawKeyDown' : 'keyDown'
  await cdp.send('Input.dispatchKeyEvent', {
    type: downType,
    key,
    code,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
  })
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key,
    code,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
  })
}

async function terminate(child) {
  if (!child || child.exitCode !== null) return
  child.kill('SIGTERM')
  await Promise.race([new Promise((resolve) => child.once('exit', resolve)), sleep(1200)])
  if (child.exitCode === null) child.kill('SIGKILL')
}

async function run() {
  viteProcess = spawn(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(appPort), '--strictPort'],
    { cwd: frontendDir, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] },
  )

  await waitForHttp(appOrigin)

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
  cdp.on('Fetch.requestPaused', handleRequest)
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')
  await cdp.send('Network.enable')
  await cdp.send('Fetch.enable', { patterns: [{ urlPattern: appOrigin + '/api/v1/*' }] })
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  })

  await navigate('/')
  await evaluate("localStorage.setItem('insightink.uiLanguage','en'); true")

  await navigate('/library?sort=oldest#saved-item')
  await waitForJs("location.pathname === '/login'", 'protected redirect')
  await waitForJs(
    'Boolean(document.querySelector(\'input[type="email"]\')) && Boolean(document.querySelector(\'input[type="password"]\'))',
    'login form controls',
  )
  await setValue('input[type="email"]', user.email)
  await setValue('input[type="password"]', 'browser-smoke-password')
  await click('button[type="submit"]')
  await waitForHost(
    () => state.requests.some((entry) => entry.startsWith('POST /api/v1/auth/login/')),
    'login request',
  )
  assert(
    state.loggedIn,
    'Login fixture rejected the submitted credentials. Requests: ' + JSON.stringify(state.requests),
  )
  await waitForJs("location.pathname !== '/login'", 'post-login navigation')
  const returnPath = await evaluate('location.pathname + location.search + location.hash')
  assert(
    returnPath === '/library?sort=oldest#saved-item',
    'Login return path mismatch. Expected /library?sort=oldest#saved-item, got ' + returnPath,
  )

  await navigate('/app')
  await waitForJs(
    "document.querySelector('a[href=\"/ideas/40\"]')?.textContent?.includes('Browser smoke Idea')",
    'personalized feed',
  )
  const appAx = await accessibilityIssues()
  assert(appAx.length === 0, 'Unnamed interactive nodes on app: ' + JSON.stringify(appAx))

  await click('a[href="/ideas/40"]')
  await waitForJs(
    "location.pathname === '/ideas/40' && document.querySelector('.idea-detail-page h1')?.textContent?.includes('Browser smoke Idea')",
    'Idea detail',
  )
  await waitForJs(
    'document.querySelector(\'button[aria-label="Spark"]\') && !document.querySelector(\'button[aria-label="Spark"]\').disabled',
    'Spark hydration',
  )

  await click('button[aria-label="Spark"]')
  await waitForHost(() => state.sparked, 'Spark mutation')
  await waitForJs(
    "document.querySelector('button[aria-label=\"Remove Spark\"]')?.getAttribute('aria-pressed') === 'true'",
    'Spark UI',
  )

  await click('button[aria-label="Save"]')
  await waitForHost(() => state.saved, 'Save mutation')
  await waitForJs(
    "document.querySelector('button[aria-label=\"Remove from saved\"]')?.getAttribute('aria-pressed') === 'true'",
    'Save UI',
  )

  await setValue('#idea-comment-body', 'Browser smoke comment')
  await click('.comment-composer button[type="submit"]')
  await waitForHost(() => state.comments.length === 1, 'comment mutation')
  await waitForJs("document.body.textContent?.includes('Browser smoke comment')", 'posted comment')

  const ideaAx = await accessibilityIssues()
  assert(ideaAx.length === 0, 'Unnamed interactive nodes on Idea detail: ' + JSON.stringify(ideaAx))

  await click('a[href="/library"]')
  await waitForJs(
    "location.pathname === '/library' && document.body.textContent?.includes('Browser smoke Idea')",
    'saved library',
  )

  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  })
  await navigate('/app')
  await waitForJs("Boolean(document.querySelector('.mobile-menu-trigger'))", 'compact shell')

  let tabsToMenu = 0
  for (let index = 0; index < 30; index += 1) {
    await pressKey('Tab', 'Tab', 9)
    tabsToMenu += 1
    if (
      await evaluate("document.activeElement?.classList.contains('mobile-menu-trigger') === true")
    )
      break
  }
  assert(
    await evaluate("document.activeElement?.classList.contains('mobile-menu-trigger') === true"),
    'Tab order did not reach mobile menu.',
  )

  const focus = await evaluate(
    "(() => { const e=document.activeElement; const s=getComputedStyle(e); return { focusVisible:e.matches(':focus-visible'), outlineStyle:s.outlineStyle, outlineWidth:s.outlineWidth }; })()",
  )
  assert(
    focus.focusVisible && focus.outlineStyle !== 'none' && focus.outlineWidth !== '0px',
    'Mobile menu focus indicator is not visible.',
  )

  await pressKey(' ', 'Space', 32)
  await waitForJs(
    "document.querySelector('.mobile-menu-trigger')?.getAttribute('aria-expanded') === 'true'",
    'keyboard menu open',
  )
  const mobileAx = await accessibilityIssues()
  assert(
    mobileAx.length === 0,
    'Unnamed interactive nodes in mobile nav: ' + JSON.stringify(mobileAx),
  )

  const disclosureMotion = await evaluate(
    "(() => { const s=getComputedStyle(document.querySelector('.mobile-navigation')); return { animationName:s.animationName, animationDuration:s.animationDuration }; })()",
  )
  assert(
    disclosureMotion.animationName.includes('disclosure-enter') &&
      disclosureMotion.animationDuration !== '0s',
    'Mobile navigation disclosure motion is missing: ' + JSON.stringify(disclosureMotion),
  )

  await pressKey('Escape', 'Escape', 27)
  await waitForJs(
    "document.querySelector('.mobile-menu-trigger')?.getAttribute('aria-expanded') === 'false' && document.activeElement?.classList.contains('mobile-menu-trigger')",
    'Escape menu close',
  )

  const compact = await evaluate(
    "(() => ({ lang:document.documentElement.lang, dir:document.documentElement.dir, sticky:getComputedStyle(document.querySelector('.site-header')).position, overflow:document.documentElement.scrollWidth>innerWidth, languageControls:document.querySelectorAll('.language-toggle').length }))()",
  )
  assert(
    compact.lang === 'en' && compact.dir === 'ltr',
    'Compact shell language direction mismatch.',
  )
  assert(
    compact.sticky === 'sticky' && !compact.overflow && compact.languageControls === 1,
    'Compact shell invariant failed: ' + JSON.stringify(compact),
  )

  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  })
  await navigate('/app')
  await waitForJs(
    "window.matchMedia('(prefers-reduced-motion: reduce)').matches && Boolean(document.querySelector('.route-stage'))",
    'reduced-motion shell',
  )
  await click('.mobile-menu-trigger')
  await waitForJs(
    "document.querySelector('.mobile-menu-trigger')?.getAttribute('aria-expanded') === 'true'",
    'reduced-motion menu open',
  )

  const reducedMotion = await evaluate(
    "(() => ({ preferred:window.matchMedia('(prefers-reduced-motion: reduce)').matches, routeAnimation:getComputedStyle(document.querySelector('.route-stage')).animationName, menuAnimation:getComputedStyle(document.querySelector('.mobile-navigation')).animationName }))()",
  )
  assert(
    reducedMotion.preferred &&
      reducedMotion.routeAnimation === 'none' &&
      reducedMotion.menuAnimation === 'none',
    'Reduced-motion animation suppression failed: ' + JSON.stringify(reducedMotion),
  )

  for (const required of [
    'POST /api/v1/auth/login/',
    'PUT /api/v1/ideas/40/spark/',
    'PUT /api/v1/ideas/40/save/',
    'POST /api/v1/ideas/40/comments/',
    'GET /api/v1/library/saved/',
  ]) {
    assert(
      state.requests.some((entry) => entry.startsWith(required)),
      'Missing critical request: ' + required,
    )
  }

  console.log(
    JSON.stringify(
      {
        browser: await evaluate('navigator.userAgent'),
        flow: {
          returnPath,
          sparked: state.sparked,
          saved: state.saved,
          comments: state.comments.length,
          librarySavedIdea: true,
        },
        accessibility: {
          appUnnamed: appAx.length,
          ideaUnnamed: ideaAx.length,
          mobileUnnamed: mobileAx.length,
          tabsToMenu,
          focus,
        },
        compact,
        motion: {
          disclosureMotion,
          reducedMotion,
        },
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
  await terminate(viteProcess)
  rmSync(profileDir, { recursive: true, force: true })
}
