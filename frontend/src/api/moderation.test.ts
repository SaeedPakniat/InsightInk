import { beforeEach, describe, expect, it, vi } from 'vitest'

import { clearCsrfToken } from './client'
import {
  actOnModerationReport,
  cursorFromModerationUrl,
  getModerationReport,
  getModerationReportsPage,
} from './moderation'

describe('moderation API', () => {
  beforeEach(() => {
    clearCsrfToken()
    vi.restoreAllMocks()
  })

  it('loads a filtered cursor page from the exact moderator endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          next: null,
          previous: null,
          results: [],
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    )

    await getModerationReportsPage('reviewing', 'next-token')

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      '/api/v1/moderation/reports/?status=reviewing&cursor=next-token',
    )
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'GET',
      credentials: 'include',
    })
  })

  it('loads a single report detail', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 9,
          reporter: { id: 1, display_name: 'Reader' },
          target_type: 'comment',
          target_id: 2,
          reason: 'spam',
          status: 'open',
          created_at: '2026-11-07T06:00:00Z',
          resolved_at: null,
          details: '',
          target_comment: null,
          actions: [],
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    )

    await getModerationReport(9)

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/moderation/reports/9/')
  })

  it('posts moderation actions with CSRF and an optional note', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: 'moderator-csrf' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 9,
            reporter: { id: 1, display_name: 'Reader' },
            target_type: 'comment',
            target_id: 2,
            reason: 'spam',
            status: 'reviewing',
            created_at: '2026-11-07T06:00:00Z',
            resolved_at: null,
            details: '',
            target_comment: null,
            actions: [],
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
      )

    await actOnModerationReport(9, 'start-review', {
      note: 'Taking this case.',
    })

    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/v1/moderation/reports/9/start-review/')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ note: 'Taking this case.' }),
    })
    expect(new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get('X-CSRFToken')).toBe(
      'moderator-csrf',
    )
  })

  it('handles the 204 hide-comment action', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: 'moderator-csrf' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    await expect(actOnModerationReport(9, 'hide-comment', {})).resolves.toBeNull()
  })

  it('extracts cursor values from report pagination URLs', () => {
    expect(
      cursorFromModerationUrl('http://localhost:8000/api/v1/moderation/reports/?cursor=second'),
    ).toBe('second')
    expect(cursorFromModerationUrl(null)).toBeNull()
  })
})
