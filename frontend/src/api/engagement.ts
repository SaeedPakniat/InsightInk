import { apiRequest } from './client'
import type { ViewerEngagementResponse } from './types'

export function getViewerEngagement(ideaIds: number[]): Promise<ViewerEngagementResponse> {
  const normalized = [...new Set(ideaIds)].filter((ideaId) => ideaId > 0)
  const query = encodeURIComponent(normalized.join(','))
  return apiRequest<ViewerEngagementResponse>(`/me/engagement/?idea_ids=${query}`)
}

export function setSparked(ideaId: number, sparked: boolean): Promise<void> {
  return apiRequest<void>(`/ideas/${ideaId}/spark/`, {
    method: sparked ? 'PUT' : 'DELETE',
  })
}

export function setSaved(ideaId: number, saved: boolean): Promise<void> {
  return apiRequest<void>(`/ideas/${ideaId}/save/`, {
    method: saved ? 'PUT' : 'DELETE',
  })
}
