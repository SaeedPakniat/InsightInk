import { beforeEach, describe, expect, it, vi } from 'vitest'

import { clearCsrfToken } from './client'
import {
  cursorFromCreatorIdeasUrl,
  getCreator,
  getCreatorIdeasPage,
  getViewerCreatorFollowState,
  setCreatorFollowed,
} from './creators'

describe('creators API', () => {
  beforeEach(() => {
    clearCsrfToken()
    vi.restoreAllMocks()
  })

  it('loads a public creator profile from the exact endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 4,
          display_name: 'Maya Chen',
          bio_fa: '',
          bio_en: 'English bio',
          avatar: null,
          is_verified: false,
          follower_count: 2,
          spark_count: 8,
          idea_count: 10,
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    )

    const result = await getCreator(4)

    expect(result.display_name).toBe('Maya Chen')
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/creators/4/')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'GET',
      credentials: 'include',
    })
  })

  it('loads creator Ideas with an opaque cursor', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ next: null, previous: null, results: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    await getCreatorIdeasPage(4, 'next-token')

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/creators/4/ideas/?cursor=next-token')
  })

  it('extracts cursor values from creator pagination URLs', () => {
    expect(
      cursorFromCreatorIdeasUrl('http://localhost:8000/api/v1/creators/4/ideas/?cursor=second'),
    ).toBe('second')
    expect(cursorFromCreatorIdeasUrl(null)).toBeNull()
  })

  it('reads explicit viewer follow state without CSRF on GET', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [{ creator_id: 4, following: true, can_follow: true }],
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    )

    const result = await getViewerCreatorFollowState([4, 4])

    expect(result.items[0]).toEqual({
      creator_id: 4,
      following: true,
      can_follow: true,
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/me/creator-follows/?creator_ids=4')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'GET',
      credentials: 'include',
    })
  })

  it('uses explicit CSRF-protected PUT and DELETE for follow mutations', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: 'follow-csrf' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    await setCreatorFollowed(4, true)
    await setCreatorFollowed(4, false)

    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/v1/creators/4/follow/')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'PUT',
      credentials: 'include',
    })
    expect(new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get('X-CSRFToken')).toBe(
      'follow-csrf',
    )
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({
      method: 'DELETE',
      credentials: 'include',
    })
  })
})
