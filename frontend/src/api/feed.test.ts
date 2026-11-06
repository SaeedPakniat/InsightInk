import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getFeedPage } from './feed'

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
})
