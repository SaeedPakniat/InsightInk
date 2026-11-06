import { ApiError, apiRequest, clearCsrfToken } from './client'
import type { CurrentUser, LoginPayload, RegisterPayload } from './types'

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    return await apiRequest<CurrentUser>('/me/')
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return null
    }
    throw error
  }
}

export async function login(payload: LoginPayload): Promise<CurrentUser> {
  const user = await apiRequest<CurrentUser>('/auth/login/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  clearCsrfToken()
  return user
}

export async function register(payload: RegisterPayload): Promise<CurrentUser> {
  const user = await apiRequest<CurrentUser>('/auth/register/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  clearCsrfToken()
  return user
}

export async function logout(): Promise<void> {
  await apiRequest<null>('/auth/logout/', { method: 'POST' })
  clearCsrfToken()
}
