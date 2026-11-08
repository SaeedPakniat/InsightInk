import { useQuery } from '@tanstack/react-query'

import { getMyCreatorProfile, getMyIdea, getMyIdeas, getSources } from '../../api/studio'

export const MY_CREATOR_QUERY_KEY = ['me', 'creator'] as const
export const MY_IDEAS_QUERY_KEY = ['me', 'ideas'] as const
export const SOURCES_QUERY_KEY = ['sources'] as const

export function myIdeaQueryKey(ideaId: number) {
  return ['me', 'ideas', ideaId] as const
}

export function useMyCreatorProfile() {
  return useQuery({
    queryKey: MY_CREATOR_QUERY_KEY,
    queryFn: getMyCreatorProfile,
    staleTime: 30_000,
  })
}

export function useMyIdeas(enabled = true) {
  return useQuery({
    queryKey: MY_IDEAS_QUERY_KEY,
    queryFn: getMyIdeas,
    enabled,
    staleTime: 15_000,
  })
}

export function useMyIdea(ideaId: number, enabled = true) {
  return useQuery({
    queryKey: myIdeaQueryKey(ideaId),
    queryFn: () => getMyIdea(ideaId),
    enabled: enabled && ideaId > 0,
  })
}

export function useSources() {
  return useQuery({
    queryKey: SOURCES_QUERY_KEY,
    queryFn: getSources,
    staleTime: 60 * 60_000,
  })
}
