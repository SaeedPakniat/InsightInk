import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createIdeaComment, deleteComment, getIdeaComments } from '../../api/comments'
import type { CurrentUser, IdeaComment } from '../../api/types'

export function commentsQueryKey(ideaId: number) {
  return ['comments', 'idea', ideaId] as const
}

export function useIdeaComments(ideaId: number) {
  return useQuery({
    queryKey: commentsQueryKey(ideaId),
    queryFn: () => getIdeaComments(ideaId),
    staleTime: 30_000,
  })
}

export function useCreateComment(ideaId: number, user: CurrentUser) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: string) => createIdeaComment(ideaId, { body }),

    onMutate: async (body) => {
      const key = commentsQueryKey(ideaId)
      await queryClient.cancelQueries({ queryKey: key })

      const previous = queryClient.getQueryData<IdeaComment[]>(key) ?? []
      const optimisticId = -1
      const now = new Date().toISOString()

      const optimistic: IdeaComment = {
        id: optimisticId,
        author: {
          id: user.id,
          display_name: user.display_name || user.email,
        },
        body: body.trim(),
        created_at: now,
        updated_at: now,
      }

      queryClient.setQueryData<IdeaComment[]>(key, [...previous, optimistic])

      return { previous, optimisticId }
    },

    onError: (_error, _body, context) => {
      if (context) {
        queryClient.setQueryData(commentsQueryKey(ideaId), context.previous)
      }
    },

    onSuccess: (comment, _body, context) => {
      queryClient.setQueryData<IdeaComment[]>(commentsQueryKey(ideaId), (current = []) =>
        current.map((item) => (item.id === context?.optimisticId ? comment : item)),
      )
    },
  })
}

export function useDeleteComment(ideaId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (commentId: number) => deleteComment(commentId),

    onMutate: async (commentId) => {
      const key = commentsQueryKey(ideaId)
      await queryClient.cancelQueries({ queryKey: key })

      const previous = queryClient.getQueryData<IdeaComment[]>(key) ?? []
      queryClient.setQueryData<IdeaComment[]>(
        key,
        previous.filter((comment) => comment.id !== commentId),
      )

      return { previous }
    },

    onError: (_error, _commentId, context) => {
      if (context) {
        queryClient.setQueryData(commentsQueryKey(ideaId), context.previous)
      }
    },
  })
}
