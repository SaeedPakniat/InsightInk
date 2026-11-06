import { describe, expect, it } from 'vitest'

import type { FeedPage, Idea } from '../../api/types'
import { flattenUniqueSearchResults, searchQueryKey } from './searchResults'

function idea(id: number): Idea {
  return {
    id,
    language: 'en',
    title: `Idea ${id}`,
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
  }
}

describe('searchResults', () => {
  it('keeps search query keys stable across the supported filters', () => {
    expect(searchQueryKey({ q: 'systems', type: 'book', topic: 'philosophy' })).toEqual([
      'search',
      'systems',
      'book',
      'philosophy',
    ])
  })

  it('flattens cursor pages without duplicating Ideas', () => {
    const pages: FeedPage[] = [
      {
        next: 'next',
        previous: null,
        results: [idea(3), idea(2)],
      },
      {
        next: null,
        previous: 'previous',
        results: [idea(2), idea(1)],
      },
    ]

    expect(flattenUniqueSearchResults(pages).map((item) => item.id)).toEqual([3, 2, 1])
  })
})
