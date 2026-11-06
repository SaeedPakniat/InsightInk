import { apiRequest } from './client'
import type { FeedPage } from './types'

export function getFeedPage(): Promise<FeedPage> {
  return apiRequest<FeedPage>('/feed/')
}
