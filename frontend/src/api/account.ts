import { apiRequest } from './client'
import type { CurrentUser, UiLanguage } from './types'

export type CurrentUserUpdatePayload = {
  display_name?: string
  preferred_ui_language?: UiLanguage
}

export type AvatarUploadResponse = {
  avatar_url: string | null
}

export function updateCurrentUser(payload: CurrentUserUpdatePayload): Promise<CurrentUser> {
  return apiRequest<CurrentUser>('/me/', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function uploadCurrentUserAvatar(file: File): Promise<AvatarUploadResponse> {
  const body = new FormData()
  body.append('avatar', file)

  return apiRequest<AvatarUploadResponse>('/me/avatar/', {
    method: 'PUT',
    body,
  })
}

export function removeCurrentUserAvatar(): Promise<void> {
  return apiRequest<void>('/me/avatar/', {
    method: 'DELETE',
  })
}
