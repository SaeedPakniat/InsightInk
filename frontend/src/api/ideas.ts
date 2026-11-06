import { apiRequest } from './client'
import type { Idea } from './types'

export function getIdea(ideaId: number): Promise<Idea> {
  return apiRequest<Idea>(`/ideas/${ideaId}/`)
}
