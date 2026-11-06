import { apiRequest } from './client'
import type { CreateCommentPayload, IdeaComment } from './types'

export function getIdeaComments(ideaId: number): Promise<IdeaComment[]> {
  return apiRequest<IdeaComment[]>(`/ideas/${ideaId}/comments/`)
}

export function createIdeaComment(
  ideaId: number,
  payload: CreateCommentPayload,
): Promise<IdeaComment> {
  return apiRequest<IdeaComment>(`/ideas/${ideaId}/comments/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function deleteComment(commentId: number): Promise<void> {
  return apiRequest<void>(`/comments/${commentId}/`, {
    method: 'DELETE',
  })
}
