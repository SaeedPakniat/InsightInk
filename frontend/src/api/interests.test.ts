import { beforeEach, describe, expect, it, vi } from 'vitest'

import { clearCsrfToken } from './client'
import { getTopics, updateInterests } from './interests'

describe('interests API', () => {
  beforeEach(() => {
    clearCsrfToken()
    vi.restoreAllMocks()
  })

  it('loads topics from the exact backend topics endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify([{ id: 1, slug: 'technology', name_fa: 'فناوری', name_en: 'Technology' }]),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    )

    await getTopics()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/topics/')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'GET',
      credentials: 'include',
    })
  })

  it('saves topic ids with CSRF protection to the exact interests endpoint', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: 'csrf-interest-test' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            topics: [{ id: 2, slug: 'science', name_fa: 'علم', name_en: 'Science' }],
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
      )

    await updateInterests({ topics: [2] })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/v1/me/interests/')

    const request = fetchMock.mock.calls[1]?.[1]
    const headers = new Headers(request?.headers)

    expect(request?.method).toBe('PUT')
    expect(request?.credentials).toBe('include')
    expect(request?.body).toBe(JSON.stringify({ topics: [2] }))
    expect(headers.get('X-CSRFToken')).toBe('csrf-interest-test')
  })
})
