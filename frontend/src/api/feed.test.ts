import { beforeEach, describe, expect, it, vi } from 'vitest'

import { cursorFromFeedUrl, getFeedPage } from './feed'

describe('feed API', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('loads the first cursor page from the exact feed endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          next: null,
          previous: null,
          results: [],
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    )

    await getFeedPage()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/feed/')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'GET',
      credentials: 'include',
    })
  })

  it('requests later pages using only the cursor value', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ next: null, previous: null, results: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    await getFeedPage('cD0zMQ==')

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/feed/?cursor=cD0zMQ%3D%3D')
  })

  it('extracts the cursor from the backend next URL', () => {
    expect(cursorFromFeedUrl('http://localhost:5173/api/v1/feed/?cursor=cD0zMQ%3D%3D')).toBe(
      'cD0zMQ==',
    )
    expect(cursorFromFeedUrl(null)).toBeNull()
  })
})
