import { apiRequest } from './client'
import type { FeedPage } from './types'

export function getFeedPage(cursor: string | null = null): Promise<FeedPage> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
  return apiRequest<FeedPage>(`/feed/${query}`)
}

export function cursorFromFeedUrl(url: string | null): string | null {
  if (!url) return null

  try {
    return new URL(url, window.location.origin).searchParams.get('cursor')
  } catch {
    return null
  }
}
