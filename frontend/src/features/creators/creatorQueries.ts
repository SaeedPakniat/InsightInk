import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

import { cursorFromCreatorIdeasUrl, getCreator, getCreatorIdeasPage } from '../../api/creators'
import type { FeedPage, Idea } from '../../api/types'

export function creatorQueryKey(creatorId: number) {
  return ['creator', creatorId] as const
}

export function creatorIdeasQueryKey(creatorId: number) {
  return ['creator', creatorId, 'ideas'] as const
}

export function useCreator(creatorId: number, enabled = true) {
  return useQuery({
    queryKey: creatorQueryKey(creatorId),
    queryFn: () => getCreator(creatorId),
    enabled,
    staleTime: 60_000,
  })
}

export function useCreatorIdeas(creatorId: number, enabled = true) {
  return useInfiniteQuery({
    queryKey: creatorIdeasQueryKey(creatorId),
    queryFn: ({ pageParam }) => getCreatorIdeasPage(creatorId, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => cursorFromCreatorIdeasUrl(lastPage.next),
    enabled,
    staleTime: 30_000,
  })
}

export function flattenCreatorIdeas(pages: FeedPage[]): Idea[] {
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
