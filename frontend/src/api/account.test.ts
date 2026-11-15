import { beforeEach, describe, expect, it, vi } from 'vitest'

import { apiRequest } from './client'
import { removeCurrentUserAvatar, updateCurrentUser, uploadCurrentUserAvatar } from './account'

vi.mock('./client', () => ({
  apiRequest: vi.fn(),
}))

const apiRequestMock = vi.mocked(apiRequest)

describe('account API', () => {
  beforeEach(() => {
    apiRequestMock.mockReset()
  })

  it('updates current-user metadata with PATCH /me/', async () => {
    apiRequestMock.mockResolvedValueOnce({
      id: 1,
      email: 'reader@example.com',
      display_name: 'Updated Reader',
      preferred_ui_language: 'en',
      avatar_url: null,
      capabilities: { can_moderate: false, can_administer: false },
    })

    await updateCurrentUser({ display_name: 'Updated Reader' })

    expect(apiRequestMock).toHaveBeenCalledWith('/me/', {
      method: 'PATCH',
      body: JSON.stringify({ display_name: 'Updated Reader' }),
    })
  })

  it('uploads the exact avatar multipart field with PUT /me/avatar/', async () => {
    apiRequestMock.mockResolvedValueOnce({ avatar_url: '/media/user_avatars/new.webp' })
    const file = new File(['avatar'], 'avatar.webp', { type: 'image/webp' })

    await uploadCurrentUserAvatar(file)

    expect(apiRequestMock).toHaveBeenCalledTimes(1)
    const [path, options] = apiRequestMock.mock.calls[0]
    expect(path).toBe('/me/avatar/')
    expect(options?.method).toBe('PUT')
    expect(options?.body).toBeInstanceOf(FormData)

    const body = options?.body as FormData
    expect(body.get('avatar')).toBe(file)
  })

  it('removes the current avatar with DELETE /me/avatar/', async () => {
    apiRequestMock.mockResolvedValueOnce(undefined)

    await removeCurrentUserAvatar()

    expect(apiRequestMock).toHaveBeenCalledWith('/me/avatar/', {
      method: 'DELETE',
    })
  })
})
