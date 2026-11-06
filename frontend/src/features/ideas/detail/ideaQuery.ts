import { useQuery } from '@tanstack/react-query'

import { getIdea } from '../../../api/ideas'

export function ideaQueryKey(ideaId: number) {
  return ['idea', ideaId] as const
}

export function useIdea(ideaId: number) {
  return useQuery({
    queryKey: ideaQueryKey(ideaId),
    queryFn: () => getIdea(ideaId),
    enabled: Number.isInteger(ideaId) && ideaId > 0,
    staleTime: 60_000,
  })
}
