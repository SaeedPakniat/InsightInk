import { beforeEach, describe, expect, it, vi } from 'vitest'

import { clearCsrfToken } from './client'
import { getSavedLibrary } from './library'

describe('library API', () => {
  beforeEach(() => {
    clearCsrfToken()
    vi.restoreAllMocks()
  })

  it('loads the authenticated saved library from the exact endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            saved_at: '2026-11-06T10:00:00Z',
            idea: {
              id: 40,
              language: 'en',
              title: 'Saved idea',
              body: 'Body',
              estimated_read_seconds: 60,
              published_at: '2026-11-01T08:00:00Z',
              creator: {
                id: 1,
                display_name: 'Creator',
                avatar: null,
                is_verified: false,
              },
              source: {
                id: 1,
                type: 'article',
                title: 'Source',
                original_creator_text: 'Author',
                language: 'en',
                external_url: '',
                cover: '',
              },
              topics: [],
            },
          },
        ]),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    )

    const result = await getSavedLibrary()

    expect(result).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/library/saved/')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'GET',
      credentials: 'include',
    })
  })
})
