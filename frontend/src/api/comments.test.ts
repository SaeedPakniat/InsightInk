import { beforeEach, describe, expect, it, vi } from 'vitest'

import { clearCsrfToken } from './client'
import { createIdeaComment, deleteComment, getIdeaComments } from './comments'

describe('comments API', () => {
  beforeEach(() => {
    clearCsrfToken()
    vi.restoreAllMocks()
  })

  it('reads public comments from the exact Idea comments endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            id: 7,
            author: { id: 2, display_name: 'Reader' },
            body: 'A useful comment',
            created_at: '2026-11-06T10:00:00Z',
            updated_at: '2026-11-06T10:00:00Z',
          },
        ]),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    )

    const comments = await getIdeaComments(40)

    expect(comments).toHaveLength(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/ideas/40/comments/')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'GET',
      credentials: 'include',
    })
  })

  it('posts a comment with CSRF protection', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: 'csrf-comment' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 8,
            author: { id: 2, display_name: 'Reader' },
            body: 'New thought',
            created_at: '2026-11-06T10:01:00Z',
            updated_at: '2026-11-06T10:01:00Z',
          }),
          {
            status: 201,
            headers: { 'content-type': 'application/json' },
          },
        ),
      )

    await createIdeaComment(40, { body: 'New thought' })

    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/v1/ideas/40/comments/')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ body: 'New thought' }),
    })
    expect(new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get('X-CSRFToken')).toBe(
      'csrf-comment',
    )
  })

  it('deletes a comment with CSRF protection', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: 'csrf-delete-comment' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    await deleteComment(8)

    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/v1/comments/8/')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'DELETE',
      credentials: 'include',
    })
  })
})
