import { apiRequest } from './client'
import type {
  ContentLanguage,
  CurrentContentLanguages,
  UpdateContentLanguagesPayload,
} from './types'

export function getLanguages(): Promise<ContentLanguage[]> {
  return apiRequest<ContentLanguage[]>('/languages/')
}

export function getCurrentContentLanguages(): Promise<CurrentContentLanguages> {
  return apiRequest<CurrentContentLanguages>('/me/languages/')
}

export function updateContentLanguages(
  payload: UpdateContentLanguagesPayload,
): Promise<CurrentContentLanguages> {
  return apiRequest<CurrentContentLanguages>('/me/languages/', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}
