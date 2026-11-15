import { beforeEach, describe, expect, it, vi } from 'vitest'

import { apiRequest, clearCsrfToken } from './client'

describe('apiRequest', () => {
  beforeEach(() => {
    clearCsrfToken()
    vi.restoreAllMocks()
  })

  it('bootstraps CSRF and sends credentials for unsafe JSON requests', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: 'csrf-test-token' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )

    await apiRequest<{ ok: boolean }>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email: 'reader@example.com', password: 'secret' }),
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)

    const csrfOptions = fetchMock.mock.calls[0]?.[1]
    expect(csrfOptions?.credentials).toBe('include')

    const requestOptions = fetchMock.mock.calls[1]?.[1]
    const headers = new Headers(requestOptions?.headers)

    expect(requestOptions?.credentials).toBe('include')
    expect(headers.get('X-CSRFToken')).toBe('csrf-test-token')
    expect(headers.get('Content-Type')).toBe('application/json')
  })

  it('preserves FormData so the browser can generate the multipart boundary', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: 'csrf-form-token' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ avatar_url: '/media/user_avatars/avatar.webp' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )

    const body = new FormData()
    body.append('avatar', new File(['avatar'], 'avatar.webp', { type: 'image/webp' }))

    await apiRequest<{ avatar_url: string }>('/me/avatar/', {
      method: 'PUT',
      body,
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const requestOptions = fetchMock.mock.calls[1]?.[1]
    const headers = new Headers(requestOptions?.headers)

    expect(requestOptions?.credentials).toBe('include')
    expect(requestOptions?.body).toBe(body)
    expect(headers.get('X-CSRFToken')).toBe('csrf-form-token')
    expect(headers.has('Content-Type')).toBe(false)
  })
})
