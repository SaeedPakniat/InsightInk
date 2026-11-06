import { useQuery } from '@tanstack/react-query'

import { getCurrentInterests, getTopics } from '../../api/interests'

export const TOPICS_QUERY_KEY = ['topics'] as const
export const INTERESTS_QUERY_KEY = ['me', 'interests'] as const

export function useTopics() {
  return useQuery({
    queryKey: TOPICS_QUERY_KEY,
    queryFn: getTopics,
    staleTime: 5 * 60_000,
  })
}

export function useInterests() {
  return useQuery({
    queryKey: INTERESTS_QUERY_KEY,
    queryFn: getCurrentInterests,
    staleTime: 30_000,
  })
}
