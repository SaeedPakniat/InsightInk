import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getViewerCreatorFollowState, setCreatorFollowed } from '../../api/creators'
import type { CreatorPublic, ViewerCreatorFollowItem } from '../../api/types'
import { RECOMMENDATIONS_QUERY_KEY } from '../feed/recommendations'
import { creatorQueryKey } from './creatorQueries'

export function creatorFollowStateKey(creatorId: number) {
  return ['creatorFollowState', creatorId] as const
}

export function useCreatorFollowState(creatorId: number, enabled = true) {
  return useQuery({
    queryKey: creatorFollowStateKey(creatorId),
    queryFn: async () => {
      const response = await getViewerCreatorFollowState([creatorId])
      return (
        response.items[0] ?? {
          creator_id: creatorId,
          following: false,
          can_follow: true,
        }
      )
    },
    enabled: enabled && creatorId > 0,
    staleTime: 30_000,
  })
}

export function useCreatorFollowMutation(creatorId: number) {
  const queryClient = useQueryClient()
  const stateKey = creatorFollowStateKey(creatorId)
  const publicKey = creatorQueryKey(creatorId)

  return useMutation({
    mutationFn: (nextFollowing: boolean) => setCreatorFollowed(creatorId, nextFollowing),

    onMutate: async (nextFollowing) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: stateKey }),
        queryClient.cancelQueries({ queryKey: publicKey }),
      ])

      const previousState = queryClient.getQueryData<ViewerCreatorFollowItem>(stateKey)
      const previousCreator = queryClient.getQueryData<CreatorPublic>(publicKey)

      if (previousState) {
        queryClient.setQueryData<ViewerCreatorFollowItem>(stateKey, {
          ...previousState,
          following: nextFollowing,
        })
      }

      if (previousCreator) {
        const delta = nextFollowing ? 1 : -1
        queryClient.setQueryData<CreatorPublic>(publicKey, {
          ...previousCreator,
          follower_count: Math.max(0, previousCreator.follower_count + delta),
        })
      }

      return { previousState, previousCreator }
    },

    onError: (_error, _nextFollowing, context) => {
      if (context?.previousState) {
        queryClient.setQueryData(stateKey, context.previousState)
      }
      if (context?.previousCreator) {
        queryClient.setQueryData(publicKey, context.previousCreator)
      }
    },

    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: stateKey }),
        queryClient.invalidateQueries({ queryKey: publicKey }),
        queryClient.invalidateQueries({
          queryKey: RECOMMENDATIONS_QUERY_KEY,
          refetchType: 'none',
        }),
      ])
    },
  })
}
