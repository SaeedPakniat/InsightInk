import { apiRequest } from './client'
import type { CreatorPublic, FeedPage, ViewerCreatorFollowResponse } from './types'

export function getCreator(creatorId: number): Promise<CreatorPublic> {
  return apiRequest<CreatorPublic>(`/creators/${creatorId}/`)
}

export function getCreatorIdeasPage(
  creatorId: number,
  cursor: string | null = null,
): Promise<FeedPage> {
  const suffix = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
  return apiRequest<FeedPage>(`/creators/${creatorId}/ideas/${suffix}`)
}

export function cursorFromCreatorIdeasUrl(url: string | null): string | null {
  if (!url) return null

  try {
    return new URL(url, window.location.origin).searchParams.get('cursor')
  } catch {
    return null
  }
}

export function getViewerCreatorFollowState(
  creatorIds: number[],
): Promise<ViewerCreatorFollowResponse> {
  const normalizedIds = [...new Set(creatorIds)].filter((creatorId) => creatorId > 0).slice(0, 100)
  const params = new URLSearchParams({
    creator_ids: normalizedIds.join(','),
  })
  return apiRequest<ViewerCreatorFollowResponse>(`/me/creator-follows/?${params.toString()}`)
}

export function setCreatorFollowed(creatorId: number, followed: boolean): Promise<void> {
  return apiRequest<void>(`/creators/${creatorId}/follow/`, {
    method: followed ? 'PUT' : 'DELETE',
  })
}
