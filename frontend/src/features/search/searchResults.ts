import { useInfiniteQuery } from '@tanstack/react-query'

import { cursorFromSearchUrl, getSearchPage } from '../../api/search'
import type { FeedPage, Idea, SearchFilters } from '../../api/types'

export function searchQueryKey(filters: SearchFilters) {
  return ['search', filters.q ?? '', filters.type ?? '', filters.topic ?? ''] as const
}

export function useSearchResults(filters: SearchFilters) {
  return useInfiniteQuery({
    queryKey: searchQueryKey(filters),
    queryFn: ({ pageParam }) => getSearchPage(filters, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => cursorFromSearchUrl(lastPage.next),
    staleTime: 30_000,
  })
}

export function flattenUniqueSearchResults(pages: FeedPage[]): Idea[] {
  const seen = new Set<number>()
  const results: Idea[] = []

  for (const page of pages) {
    for (const idea of page.results) {
      if (seen.has(idea.id)) continue
      seen.add(idea.id)
      results.push(idea)
    }
  }

  return results
}
