import { apiRequest } from './client'
import type { RecommendationItem, RelatedIdeaItem } from './types'

export function getRecommendations(): Promise<RecommendationItem[]> {
  return apiRequest<RecommendationItem[]>('/recommendations/')
}

export function getRelatedIdeas(ideaId: number): Promise<RelatedIdeaItem[]> {
  return apiRequest<RelatedIdeaItem[]>(`/ideas/${ideaId}/related/`)
}
