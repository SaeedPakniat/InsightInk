import { apiRequest } from './client'
import type { FeedPage, SearchFilters } from './types'

export function getSearchPage(
  filters: SearchFilters,
  cursor: string | null = null,
): Promise<FeedPage> {
  const params = new URLSearchParams()

  const query = filters.q?.trim()
  if (query) params.set('q', query)
  if (filters.type) params.set('type', filters.type)
  if (filters.topic) params.set('topic', filters.topic)
  if (cursor) params.set('cursor', cursor)

  const suffix = params.toString()
  return apiRequest<FeedPage>(`/search/${suffix ? `?${suffix}` : ''}`)
}

export function cursorFromSearchUrl(url: string | null): string | null {
  if (!url) return null

  try {
    return new URL(url, window.location.origin).searchParams.get('cursor')
  } catch {
    return null
  }
}
