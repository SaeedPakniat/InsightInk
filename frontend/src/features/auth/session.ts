import { useQuery } from '@tanstack/react-query'

import { getCurrentUser } from '../../api/auth'

export const SESSION_QUERY_KEY = ['session'] as const

export function useSession() {
  return useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: getCurrentUser,
    staleTime: 60_000,
    retry: false,
  })
}
