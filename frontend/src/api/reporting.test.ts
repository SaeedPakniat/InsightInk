import { beforeEach, describe, expect, it, vi } from 'vitest'

import { clearCsrfToken } from './client'
import { reportComment, reportIdea } from './reporting'

describe('reporting API', () => {
  beforeEach(() => {
    clearCsrfToken()
    vi.restoreAllMocks()
  })

  it('submits a comment report with CSRF and preserves the locked payload shape', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: 'report-csrf' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 9,
            reason: 'harassment',
            details: 'Repeated personal attacks.',
            status: 'open',
            created_at: '2026-11-07T09:00:00Z',
          }),
          {
            status: 201,
            headers: { 'content-type': 'application/json' },
          },
        ),
      )

    const result = await reportComment(11, {
      reason: 'harassment',
      details: 'Repeated personal attacks.',
    })

    expect(result.status).toBe('open')
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/v1/comments/11/report/')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({
        reason: 'harassment',
        details: 'Repeated personal attacks.',
      }),
    })
    expect(new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get('X-CSRFToken')).toBe(
      'report-csrf',
    )
  })

  it('submits an Idea report through the dedicated Idea endpoint', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: 'idea-report-csrf' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 12,
            reason: 'spam',
            details: '',
            status: 'open',
            created_at: '2026-11-07T09:00:00Z',
          }),
          {
            status: 201,
            headers: { 'content-type': 'application/json' },
          },
        ),
      )

    await reportIdea(25, { reason: 'spam' })

    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/v1/ideas/25/report/')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ reason: 'spam' }),
    })
  })
})
