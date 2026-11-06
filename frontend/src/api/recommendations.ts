import { apiRequest } from './client'
import type { RecommendationItem } from './types'

export function getRecommendations(): Promise<RecommendationItem[]> {
  return apiRequest<RecommendationItem[]>('/recommendations/')
}
