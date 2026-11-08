import { ApiError, apiRequest } from './client'
import type {
  CreatorIdea,
  CreatorIdeaPayload,
  CreatorProfilePayload,
  CreatorSelf,
  CreatorSourcePayload,
  IdeaSource,
} from './types'

export async function getMyCreatorProfile(): Promise<CreatorSelf | null> {
  try {
    return await apiRequest<CreatorSelf>('/me/creator/')
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

export function createMyCreatorProfile(payload: CreatorProfilePayload): Promise<CreatorSelf> {
  return apiRequest<CreatorSelf>('/me/creator/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateMyCreatorProfile(payload: CreatorProfilePayload): Promise<CreatorSelf> {
  return apiRequest<CreatorSelf>('/me/creator/', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function getSources(): Promise<IdeaSource[]> {
  return apiRequest<IdeaSource[]>('/sources/')
}

export function createMySource(payload: CreatorSourcePayload): Promise<IdeaSource> {
  return apiRequest<IdeaSource>('/me/sources/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getMyIdeas(): Promise<CreatorIdea[]> {
  return apiRequest<CreatorIdea[]>('/me/ideas/')
}

export function getMyIdea(ideaId: number): Promise<CreatorIdea> {
  return apiRequest<CreatorIdea>(`/me/ideas/${ideaId}/`)
}

export function createMyIdea(payload: CreatorIdeaPayload): Promise<CreatorIdea> {
  return apiRequest<CreatorIdea>('/me/ideas/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateMyIdea(ideaId: number, payload: CreatorIdeaPayload): Promise<CreatorIdea> {
  return apiRequest<CreatorIdea>(`/me/ideas/${ideaId}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteMyIdea(ideaId: number): Promise<void> {
  return apiRequest<void>(`/me/ideas/${ideaId}/`, {
    method: 'DELETE',
  })
}

export function publishMyIdea(ideaId: number): Promise<CreatorIdea> {
  return apiRequest<CreatorIdea>(`/me/ideas/${ideaId}/publish/`, {
    method: 'POST',
  })
}

export function withdrawMyIdea(ideaId: number): Promise<CreatorIdea> {
  return apiRequest<CreatorIdea>(`/me/ideas/${ideaId}/withdraw/`, {
    method: 'POST',
  })
}
