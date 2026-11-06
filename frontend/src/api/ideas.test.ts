import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getIdea } from './ideas'

describe('ideas API', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('loads a published Idea from the exact public detail endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 40,
          language: 'fa',
          title: 'Idea',
          body: 'Body',
          estimated_read_seconds: 80,
          published_at: '2026-10-29T08:00:00Z',
          creator: { id: 4, display_name: 'Maya Chen', avatar: null, is_verified: false },
          source: {
            id: 20,
            type: 'podcast',
            title: 'TED Radio Hour',
            original_creator_text: 'Manoush Zomorodi — TED',
            language: 'en',
            external_url: 'https://www.ted.com/podcasts/ted-radio-hour',
            cover: '',
          },
          topics: [],
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    )

    await getIdea(40)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/ideas/40/')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'GET',
      credentials: 'include',
    })
  })
})
