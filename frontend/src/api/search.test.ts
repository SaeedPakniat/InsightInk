import { beforeEach, describe, expect, it, vi } from 'vitest'

import { clearCsrfToken } from './client'
import { cursorFromSearchUrl, getSearchPage } from './search'

describe('search API', () => {
  beforeEach(() => {
    clearCsrfToken()
    vi.restoreAllMocks()
  })

  it('composes query, source type, topic and cursor exactly', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ next: null, previous: null, results: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    await getSearchPage(
      {
        q: '  systems thinking  ',
        type: 'book',
        topic: 'philosophy',
      },
      'cursor-token',
    )

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      '/api/v1/search/?q=systems+thinking&type=book&topic=philosophy&cursor=cursor-token',
    )
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'GET',
      credentials: 'include',
    })
  })

  it('omits empty optional filters', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ next: null, previous: null, results: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    await getSearchPage({ q: '   ' })

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/search/')
  })

  it('extracts cursor from backend pagination URLs', () => {
    expect(
      cursorFromSearchUrl('http://localhost:8000/api/v1/search/?q=focus&cursor=next-token'),
    ).toBe('next-token')
    expect(cursorFromSearchUrl(null)).toBeNull()
  })
})
