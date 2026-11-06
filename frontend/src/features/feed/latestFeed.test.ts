import { describe, expect, it } from 'vitest'

import type { FeedPage, Idea } from '../../api/types'
import { flattenUniqueIdeas } from './latestFeed'

function idea(id: number): Idea {
  return {
    id,
    language: 'en',
    title: `Idea ${id}`,
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
  }
}

describe('flattenUniqueIdeas', () => {
  it('preserves page order while removing duplicate idea ids defensively', () => {
    const pages: FeedPage[] = [
      { next: 'next', previous: null, results: [idea(4), idea(3), idea(2)] },
      { next: null, previous: 'prev', results: [idea(2), idea(1)] },
    ]

    expect(flattenUniqueIdeas(pages).map((item) => item.id)).toEqual([4, 3, 2, 1])
  })
})
