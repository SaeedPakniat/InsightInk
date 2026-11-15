import { afterEach, describe, expect, it, vi } from 'vitest'

import { registerServiceWorker } from './registerServiceWorker'

const originalServiceWorkerDescriptor = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker')

function setServiceWorker(value: unknown) {
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value,
  })
}

afterEach(() => {
  vi.restoreAllMocks()

  if (originalServiceWorkerDescriptor) {
    Object.defineProperty(navigator, 'serviceWorker', originalServiceWorkerDescriptor)
  } else {
    Reflect.deleteProperty(navigator, 'serviceWorker')
  }
})

describe('registerServiceWorker', () => {
  it('does nothing when PWA registration is disabled', async () => {
    const register = vi.fn()
    setServiceWorker({ register })

    await expect(registerServiceWorker({ enabled: false })).resolves.toBeNull()
    expect(register).not.toHaveBeenCalled()
  })

  it('degrades safely when the browser has no service worker support', async () => {
    Reflect.deleteProperty(navigator, 'serviceWorker')

    await expect(registerServiceWorker({ enabled: true })).resolves.toBeNull()
  })

  it('registers the root service worker when enabled and supported', async () => {
    const registration = {} as ServiceWorkerRegistration
    const register = vi.fn().mockResolvedValue(registration)
    setServiceWorker({ register })

    await expect(registerServiceWorker({ enabled: true })).resolves.toBe(registration)
    expect(register).toHaveBeenCalledWith('/service-worker.js', { scope: '/' })
  })

  it('treats registration failure as optional enhancement failure', async () => {
    const register = vi.fn().mockRejectedValue(new Error('blocked'))
    setServiceWorker({ register })

    await expect(registerServiceWorker({ enabled: true })).resolves.toBeNull()
  })
})
