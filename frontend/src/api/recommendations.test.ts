import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getRecommendations } from './recommendations'

describe('recommendations API', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('loads personalized items from the exact authenticated endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            idea: {
              id: 1,
              language: 'en',
              title: 'Idea',
              body: 'Body',
              estimated_read_seconds: 60,
              published_at: null,
              creator: { id: 1, display_name: 'Creator', avatar: null, is_verified: false },
              source: {
                id: 1,
                type: 'book',
                title: 'Source',
                original_creator_text: 'Author',
                language: 'en',
                external_url: '',
                cover: '',
              },
              topics: [],
            },
            score: 5,
            reason: 'Because you selected Science.',
          },
        ]),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    )

    const result = await getRecommendations()

    expect(result).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/recommendations/')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'GET',
      credentials: 'include',
    })
  })
})
