import { type InfiniteData, type QueryClient, useInfiniteQuery } from '@tanstack/react-query'

import {
  conversationCursorFromUrl,
  getConversationsPage,
  getMessagesPage,
  messageCursorFromUrl,
} from '../../api/messaging'
import type {
  Conversation,
  ConversationPage,
  DirectMessage,
  DirectMessagePage,
} from '../../api/types'

export const MESSAGING_QUERY_KEY = ['messaging'] as const
export const CONVERSATIONS_QUERY_KEY = [...MESSAGING_QUERY_KEY, 'conversations'] as const

export function conversationMessagesQueryKey(conversationId: number) {
  return [...MESSAGING_QUERY_KEY, 'conversation', conversationId, 'messages'] as const
}

export function useConversations(enabled = true) {
  return useInfiniteQuery({
    queryKey: CONVERSATIONS_QUERY_KEY,
    queryFn: ({ pageParam }) => getConversationsPage(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => conversationCursorFromUrl(lastPage.next),
    enabled,
    staleTime: 15_000,
  })
}

export function flattenConversations(pages: ConversationPage[]): Conversation[] {
  const seen = new Set<number>()
  const conversations: Conversation[] = []

  for (const page of pages) {
    for (const conversation of page.results) {
      if (seen.has(conversation.id)) continue
      seen.add(conversation.id)
      conversations.push(conversation)
    }
  }

  return conversations
}

export function useConversationMessages(conversationId: number, enabled = true) {
  return useInfiniteQuery({
    queryKey: conversationMessagesQueryKey(conversationId),
    queryFn: ({ pageParam }) => getMessagesPage(conversationId, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => messageCursorFromUrl(lastPage.next),
    enabled: enabled && conversationId > 0,
    staleTime: 10_000,
  })
}

export function flattenMessages(pages: DirectMessagePage[]): DirectMessage[] {
  const byId = new Map<number, DirectMessage>()

  for (const page of pages) {
    for (const message of page.results) {
      if (!byId.has(message.id)) byId.set(message.id, message)
    }
  }

  return [...byId.values()].sort((a, b) => a.id - b.id)
}

export function appendMessageToCache(
  queryClient: QueryClient,
  conversationId: number,
  message: DirectMessage,
) {
  const key = conversationMessagesQueryKey(conversationId)

  queryClient.setQueryData<InfiniteData<DirectMessagePage>>(key, (current) => {
    if (!current) return current
    if (current.pages.some((page) => page.results.some((item) => item.id === message.id))) {
      return current
    }

    const firstPage = current.pages[0]
    if (!firstPage) return current

    return {
      ...current,
      pages: [
        {
          ...firstPage,
          results: [message, ...firstPage.results],
        },
        ...current.pages.slice(1),
      ],
    }
  })
}

export function markConversationReadInCache(
  queryClient: QueryClient,
  conversationId: number,
  readAt: string,
) {
  queryClient.setQueryData<InfiniteData<ConversationPage>>(CONVERSATIONS_QUERY_KEY, (current) => {
    if (!current) return current

    return {
      ...current,
      pages: current.pages.map((page) => ({
        ...page,
        results: page.results.map((conversation) => {
          if (conversation.id !== conversationId) return conversation
          return {
            ...conversation,
            unread_count: 0,
            last_message: conversation.last_message
              ? {
                  ...conversation.last_message,
                  read_at: conversation.last_message.read_at ?? readAt,
                  is_read: true,
                }
              : null,
          }
        }),
      })),
    }
  })
}
