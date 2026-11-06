import { beforeEach, describe, expect, it, vi } from 'vitest'

import { clearCsrfToken } from './client'
import { getCurrentContentLanguages, getLanguages, updateContentLanguages } from './languages'

describe('content languages API', () => {
  beforeEach(() => {
    clearCsrfToken()
    vi.restoreAllMocks()
  })

  it('loads the public language catalog from the exact backend endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            code: 'en',
            name_en: 'English',
            name_fa: 'انگلیسی',
            native_name: 'English',
          },
        ]),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    )

    await getLanguages()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/languages/')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'GET',
      credentials: 'include',
    })
  })

  it('loads the current reader content-language preferences', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          languages: [
            {
              code: 'fa',
              name_en: 'Persian',
              name_fa: 'فارسی',
              native_name: 'فارسی',
            },
          ],
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    )

    await getCurrentContentLanguages()

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/me/languages/')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'GET',
      credentials: 'include',
    })
  })

  it('replaces content-language codes with CSRF protection', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: 'csrf-language-test' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            languages: [
              {
                code: 'en',
                name_en: 'English',
                name_fa: 'انگلیسی',
                native_name: 'English',
              },
              {
                code: 'ja',
                name_en: 'Japanese',
                name_fa: 'ژاپنی',
                native_name: '日本語',
              },
            ],
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
      )

    await updateContentLanguages({ languages: ['en', 'ja'] })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/v1/me/languages/')

    const request = fetchMock.mock.calls[1]?.[1]
    const headers = new Headers(request?.headers)

    expect(request?.method).toBe('PUT')
    expect(request?.credentials).toBe('include')
    expect(request?.body).toBe(JSON.stringify({ languages: ['en', 'ja'] }))
    expect(headers.get('X-CSRFToken')).toBe('csrf-language-test')
  })
})
