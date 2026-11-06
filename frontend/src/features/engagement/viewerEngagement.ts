import { useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getViewerEngagement, setSaved, setSparked } from '../../api/engagement'
import type { SavedLibraryItem, ViewerEngagementItem } from '../../api/types'
import { RECOMMENDATIONS_QUERY_KEY } from '../feed/recommendations'

export const VIEWER_ENGAGEMENT_QUERY_PREFIX = ['viewerEngagement'] as const
export const VIEWER_ENGAGEMENT_BATCH_QUERY_PREFIX = [
  ...VIEWER_ENGAGEMENT_QUERY_PREFIX,
  'batch',
] as const

export const SAVED_LIBRARY_QUERY_KEY = ['library', 'saved'] as const

export function viewerEngagementKey(ideaId: number) {
  return [...VIEWER_ENGAGEMENT_QUERY_PREFIX, 'idea', ideaId] as const
}

function defaultViewerState(ideaId: number): ViewerEngagementItem {
  return {
    idea_id: ideaId,
    sparked: false,
    saved: false,
  }
}

export function useHydrateViewerEngagement(ideaIds: number[], enabled = true) {
  const queryClient = useQueryClient()
  const normalizedIds = useMemo(
    () => [...new Set(ideaIds)].filter((ideaId) => ideaId > 0).sort((a, b) => a - b),
    [ideaIds],
  )

  const query = useQuery({
    queryKey: [...VIEWER_ENGAGEMENT_BATCH_QUERY_PREFIX, normalizedIds.join(',')],
    queryFn: async () => {
      const batches: number[][] = []
      for (let index = 0; index < normalizedIds.length; index += 100) {
        batches.push(normalizedIds.slice(index, index + 100))
      }

      const responses = await Promise.all(batches.map((batch) => getViewerEngagement(batch)))
      return {
        items: responses.flatMap((response) => response.items),
      }
    },
    enabled: enabled && normalizedIds.length > 0,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (!query.data) return

    const returned = new Map(query.data.items.map((item) => [item.idea_id, item]))
    for (const ideaId of normalizedIds) {
      const item = returned.get(ideaId)
      if (item) {
        queryClient.setQueryData(viewerEngagementKey(ideaId), item)
      }
    }
  }, [normalizedIds, query.data, queryClient])

  return query
}

export function useViewerEngagementState(ideaId: number) {
  return useQuery({
    queryKey: viewerEngagementKey(ideaId),
    queryFn: async () => {
      const response = await getViewerEngagement([ideaId])
      return response.items[0] ?? defaultViewerState(ideaId)
    },
    enabled: false,
    staleTime: Infinity,
  })
}

type EngagementKind = 'sparked' | 'saved'

function useEngagementMutation(ideaId: number, kind: EngagementKind) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (nextValue: boolean) =>
      kind === 'sparked' ? setSparked(ideaId, nextValue) : setSaved(ideaId, nextValue),

    onMutate: async (nextValue) => {
      await queryClient.cancelQueries({
        queryKey: VIEWER_ENGAGEMENT_QUERY_PREFIX,
      })

      const key = viewerEngagementKey(ideaId)
      const previous = queryClient.getQueryData<ViewerEngagementItem>(key)
      const previousLibrary =
        kind === 'saved'
          ? queryClient.getQueryData<SavedLibraryItem[]>(SAVED_LIBRARY_QUERY_KEY)
          : undefined
      const current = previous ?? defaultViewerState(ideaId)

      queryClient.setQueryData<ViewerEngagementItem>(key, {
        ...current,
        [kind]: nextValue,
      })

      if (kind === 'saved' && !nextValue && previousLibrary) {
        queryClient.setQueryData<SavedLibraryItem[]>(
          SAVED_LIBRARY_QUERY_KEY,
          previousLibrary.filter((item) => item.idea.id !== ideaId),
        )
      }

      return { previous, previousLibrary }
    },

    onError: (_error, _nextValue, context) => {
      const key = viewerEngagementKey(ideaId)
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous)
      } else {
        queryClient.removeQueries({ queryKey: key, exact: true })
      }

      if (kind === 'saved' && context?.previousLibrary) {
        queryClient.setQueryData(SAVED_LIBRARY_QUERY_KEY, context.previousLibrary)
      }
    },

    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: VIEWER_ENGAGEMENT_BATCH_QUERY_PREFIX,
        }),
        queryClient.invalidateQueries({
          queryKey: RECOMMENDATIONS_QUERY_KEY,
          refetchType: 'none',
        }),
        kind === 'saved'
          ? queryClient.invalidateQueries({
              queryKey: SAVED_LIBRARY_QUERY_KEY,
              refetchType: 'none',
            })
          : Promise.resolve(),
      ])
    },
  })
}

export function useSparkMutation(ideaId: number) {
  return useEngagementMutation(ideaId, 'sparked')
}

export function useSaveMutation(ideaId: number) {
  return useEngagementMutation(ideaId, 'saved')
}
