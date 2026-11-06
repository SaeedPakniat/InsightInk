import { describe, expect, it } from 'vitest'

import type { FeedPage, Idea } from '../../api/types'
import { creatorIdeasQueryKey, creatorQueryKey, flattenCreatorIdeas } from './creatorQueries'

function idea(id: number): Idea {
  return {
    id,
    language: 'en',
    title: `Idea ${id}`,
    body: 'Body',
    estimated_read_seconds: 60,
    published_at: '2026-11-01T08:00:00Z',
    creator: {
      id: 4,
      display_name: 'Maya Chen',
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
  }
}

describe('creatorQueries', () => {
  it('uses stable profile and idea query keys', () => {
    expect(creatorQueryKey(4)).toEqual(['creator', 4])
    expect(creatorIdeasQueryKey(4)).toEqual(['creator', 4, 'ideas'])
  })

  it('flattens cursor pages without duplicate Ideas', () => {
    const pages: FeedPage[] = [
      { next: 'next', previous: null, results: [idea(3), idea(2)] },
      { next: null, previous: 'previous', results: [idea(2), idea(1)] },
    ]

    expect(flattenCreatorIdeas(pages).map((item) => item.id)).toEqual([3, 2, 1])
  })
})
