import { apiRequest } from './client'
import type { CurrentInterests, Topic, UpdateInterestsPayload } from './types'

export function getTopics(): Promise<Topic[]> {
  return apiRequest<Topic[]>('/topics/')
}

export function getCurrentInterests(): Promise<CurrentInterests> {
  return apiRequest<CurrentInterests>('/me/interests/')
}

export function updateInterests(payload: UpdateInterestsPayload): Promise<CurrentInterests> {
  return apiRequest<CurrentInterests>('/me/interests/', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}
