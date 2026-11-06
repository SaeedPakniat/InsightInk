import { beforeEach, describe, expect, it, vi } from 'vitest'

import { clearCsrfToken } from './client'
import { getViewerEngagement, setSaved, setSparked } from './engagement'

describe('engagement API', () => {
  beforeEach(() => {
    clearCsrfToken()
    vi.restoreAllMocks()
  })

  it('loads normalized viewer state for multiple Idea IDs in one request', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [
            { idea_id: 40, sparked: true, saved: false },
            { idea_id: 39, sparked: false, saved: true },
          ],
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    )

    const result = await getViewerEngagement([40, 39, 40])

    expect(result.items).toHaveLength(2)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/me/engagement/?idea_ids=40%2C39')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'GET',
      credentials: 'include',
    })
  })

  it.each([
    ['spark', setSparked, 40],
    ['save', setSaved, 39],
  ] as const)('uses explicit PUT/DELETE for %s state', async (_label, action, ideaId) => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: 'csrf-engagement' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    await action(ideaId, true)
    await action(ideaId, false)

    expect(fetchMock).toHaveBeenCalledTimes(3)

    const putRequest = fetchMock.mock.calls[1]
    expect(putRequest?.[0]).toContain(`/ideas/${ideaId}/`)
    expect(putRequest?.[1]).toMatchObject({
      method: 'PUT',
      credentials: 'include',
    })
    expect(new Headers(putRequest?.[1]?.headers).get('X-CSRFToken')).toBe('csrf-engagement')

    const deleteRequest = fetchMock.mock.calls[2]
    expect(deleteRequest?.[1]).toMatchObject({
      method: 'DELETE',
      credentials: 'include',
    })
  })
})
