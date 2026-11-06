import { useQuery } from '@tanstack/react-query'

import { getSavedLibrary } from '../../api/library'
import { SAVED_LIBRARY_QUERY_KEY } from '../engagement/viewerEngagement'

export function useSavedLibrary() {
  return useQuery({
    queryKey: SAVED_LIBRARY_QUERY_KEY,
    queryFn: getSavedLibrary,
    staleTime: 30_000,
  })
}
