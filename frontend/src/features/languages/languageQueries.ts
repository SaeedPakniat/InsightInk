import { useQuery } from '@tanstack/react-query'

import { getCurrentContentLanguages, getLanguages } from '../../api/languages'

export const AVAILABLE_LANGUAGES_QUERY_KEY = ['languages'] as const
export const CONTENT_LANGUAGES_QUERY_KEY = ['me', 'languages'] as const

export function useAvailableLanguages() {
  return useQuery({
    queryKey: AVAILABLE_LANGUAGES_QUERY_KEY,
    queryFn: getLanguages,
    staleTime: 60 * 60_000,
  })
}

export function useContentLanguages() {
  return useQuery({
    queryKey: CONTENT_LANGUAGES_QUERY_KEY,
    queryFn: getCurrentContentLanguages,
    staleTime: 60_000,
  })
}
