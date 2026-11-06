import { useInfiniteQuery } from '@tanstack/react-query'

import { cursorFromFeedUrl, getFeedPage } from '../../api/feed'
import type { FeedPage, Idea } from '../../api/types'

export const LATEST_FEED_QUERY_KEY = ['feed', 'latest'] as const

export function useLatestFeed() {
  return useInfiniteQuery({
    queryKey: LATEST_FEED_QUERY_KEY,
    queryFn: ({ pageParam }) => getFeedPage(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => cursorFromFeedUrl(lastPage.next),
    staleTime: 30_000,
  })
}

export function flattenUniqueIdeas(pages: FeedPage[]): Idea[] {
  const seen = new Set<number>()
  const ideas: Idea[] = []

  for (const page of pages) {
    for (const idea of page.results) {
      if (seen.has(idea.id)) continue
      seen.add(idea.id)
      ideas.push(idea)
    }
  }

  return ideas
}
