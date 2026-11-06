import { apiRequest } from './client'
import type { SavedLibraryItem } from './types'

export function getSavedLibrary(): Promise<SavedLibraryItem[]> {
  return apiRequest<SavedLibraryItem[]>('/library/saved/')
}
