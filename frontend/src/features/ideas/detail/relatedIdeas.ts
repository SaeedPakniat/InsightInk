import { useQuery } from '@tanstack/react-query'

import { getRelatedIdeas } from '../../../api/recommendations'

export const RELATED_IDEAS_QUERY_PREFIX = ['relatedIdeas'] as const

export function relatedIdeasQueryKey(ideaId: number) {
  return [...RELATED_IDEAS_QUERY_PREFIX, ideaId] as const
}

export function useRelatedIdeas(ideaId: number) {
  return useQuery({
    queryKey: relatedIdeasQueryKey(ideaId),
    queryFn: () => getRelatedIdeas(ideaId),
    enabled: Number.isInteger(ideaId) && ideaId > 0,
    staleTime: 30_000,
  })
}
