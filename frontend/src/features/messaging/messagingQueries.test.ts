import { QueryClient, type InfiniteData } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import type {
  Conversation,
  ConversationPage,
  DirectMessage,
  DirectMessagePage,
} from '../../api/types'
import {
  appendMessageToCache,
  CONVERSATIONS_QUERY_KEY,
  conversationMessagesQueryKey,
  flattenConversations,
  flattenMessages,
  markConversationReadInCache,
} from './messagingQueries'

function conversation(id: number, unread = 0): Conversation {
  return {
    id,
    reader: { id: 1, display_name: 'Reader', avatar_url: null },
    creator: {
      id: 9,
      user_id: 2,
      display_name: 'Creator',
      avatar: null,
      account_avatar_url: null,
      is_verified: false,
    },
    viewer_role: 'reader',
    last_message: {
      id: 100 + id,
      sender_id: 2,
      body_excerpt: 'Hello',
      created_at: '2026-11-17T10:00:00Z',
      read_at: unread ? null : '2026-11-17T10:01:00Z',
      is_read: unread === 0,
    },
    unread_count: unread,
    created_at: '2026-11-17T09:00:00Z',
    updated_at: '2026-11-17T10:00:00Z',
  }
}

function message(id: number, body = `Message ${id}`): DirectMessage {
  return {
    id,
    sender: { id: id % 2 ? 1 : 2, display_name: id % 2 ? 'Reader' : 'Creator', avatar_url: null },
    body,
    created_at: `2026-11-17T10:00:${String(id).padStart(2, '0')}Z`,
    read_at: null,
    is_read: false,
  }
}

describe('messaging query helpers', () => {
  it('deduplicates conversations across cursor pages', () => {
    const pages: ConversationPage[] = [
      { next: 'next', previous: null, results: [conversation(3), conversation(2)] },
      { next: null, previous: 'previous', results: [conversation(2), conversation(1)] },
    ]

    expect(flattenConversations(pages).map((item) => item.id)).toEqual([3, 2, 1])
  })

  it('deduplicates newest-first history and presents messages in chronological order', () => {
    const pages: DirectMessagePage[] = [
      { next: 'next', previous: null, results: [message(5), message(4), message(3)] },
      { next: null, previous: 'previous', results: [message(3), message(2), message(1)] },
    ]

    expect(flattenMessages(pages).map((item) => item.id)).toEqual([1, 2, 3, 4, 5])
  })

  it('does not duplicate an authoritative REST message when the same id is observed again', () => {
    const queryClient = new QueryClient()
    const key = conversationMessagesQueryKey(8)
    const existing: InfiniteData<DirectMessagePage> = {
      pages: [{ next: null, previous: null, results: [message(10)] }],
      pageParams: [null],
    }
    queryClient.setQueryData(key, existing)

    appendMessageToCache(queryClient, 8, message(11, 'REST response'))
    appendMessageToCache(queryClient, 8, message(11, 'same authoritative id'))

    const cached = queryClient.getQueryData<InfiniteData<DirectMessagePage>>(key)
    expect(cached?.pages[0]?.results.map((item) => item.id)).toEqual([11, 10])
  })

  it('clears unread state and marks the conversation preview read after a successful read POST', () => {
    const queryClient = new QueryClient()
    const existing: InfiniteData<ConversationPage> = {
      pages: [{ next: null, previous: null, results: [conversation(8, 2)] }],
      pageParams: [null],
    }
    queryClient.setQueryData(CONVERSATIONS_QUERY_KEY, existing)

    markConversationReadInCache(queryClient, 8, '2026-11-17T10:03:00Z')

    const cached = queryClient.getQueryData<InfiniteData<ConversationPage>>(CONVERSATIONS_QUERY_KEY)
    expect(cached?.pages[0]?.results[0]?.unread_count).toBe(0)
    expect(cached?.pages[0]?.results[0]?.last_message).toMatchObject({
      is_read: true,
      read_at: '2026-11-17T10:03:00Z',
    })
  })
})
