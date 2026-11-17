import { beforeEach, describe, expect, it, vi } from 'vitest'

import { clearCsrfToken } from './client'
import {
  conversationCursorFromUrl,
  getConversationsPage,
  getMessagesPage,
  markConversationRead,
  messageCursorFromUrl,
  messagingWebSocketUrl,
  sendMessage,
  startConversation,
} from './messaging'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('messaging API', () => {
  beforeEach(() => {
    clearCsrfToken()
    vi.restoreAllMocks()
  })

  it('reads cursor-paginated conversation and message history endpoints', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ next: null, previous: null, results: [] }))
      .mockResolvedValueOnce(jsonResponse({ next: null, previous: null, results: [] }))

    await getConversationsPage('conversation-cursor')
    await getMessagesPage(42, 'message-cursor')

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/conversations/?cursor=conversation-cursor')
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      '/api/v1/conversations/42/messages/?cursor=message-cursor',
    )
  })

  it('starts the canonical Reader-Creator conversation with creator_id and CSRF', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'messaging-csrf' }))
      .mockResolvedValueOnce(jsonResponse({ id: 9 }, 201))

    await startConversation(17)

    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/v1/conversations/')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ creator_id: 17 }),
    })
    expect(new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get('X-CSRFToken')).toBe(
      'messaging-csrf',
    )
  })

  it('sends messages and marks read strictly through REST', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ csrfToken: 'message-csrf' }))
      .mockResolvedValueOnce(jsonResponse({ id: 101, body: 'Hello' }, 201))
      .mockResolvedValueOnce(
        jsonResponse({
          marked_read: 1,
          unread_count: 0,
          read_at: '2026-11-17T10:00:00Z',
        }),
      )

    await sendMessage(5, 'Hello')
    await markConversationRead(5)

    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/v1/conversations/5/messages/')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ body: 'Hello' }),
    })
    expect(fetchMock.mock.calls[2]?.[0]).toBe('/api/v1/conversations/5/read/')
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({}),
    })
  })

  it('extracts backend cursors without leaking absolute API URLs into query keys', () => {
    expect(
      conversationCursorFromUrl('https://example.test/api/v1/conversations/?cursor=abc%2B123'),
    ).toBe('abc+123')
    expect(messageCursorFromUrl('/api/v1/conversations/5/messages/?cursor=older')).toBe('older')
    expect(messageCursorFromUrl(null)).toBeNull()
  })

  it('uses the current session origin for the account-level messaging socket', () => {
    const url = new URL(messagingWebSocketUrl())
    expect(url.protocol).toBe(window.location.protocol === 'https:' ? 'wss:' : 'ws:')
    expect(url.host).toBe(window.location.host)
    expect(url.pathname).toBe('/ws/messaging/')
  })
})
