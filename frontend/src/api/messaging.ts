import { apiRequest } from './client'
import type {
  Conversation,
  ConversationPage,
  ConversationReadResult,
  DirectMessage,
  DirectMessagePage,
} from './types'

function cursorFromUrl(url: string | null): string | null {
  if (!url) return null

  try {
    return new URL(url, window.location.origin).searchParams.get('cursor')
  } catch {
    return null
  }
}

export function conversationCursorFromUrl(url: string | null): string | null {
  return cursorFromUrl(url)
}

export function messageCursorFromUrl(url: string | null): string | null {
  return cursorFromUrl(url)
}

export function getConversationsPage(cursor: string | null = null): Promise<ConversationPage> {
  const suffix = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
  return apiRequest<ConversationPage>(`/conversations/${suffix}`)
}

export function startConversation(creatorId: number): Promise<Conversation> {
  return apiRequest<Conversation>('/conversations/', {
    method: 'POST',
    body: JSON.stringify({ creator_id: creatorId }),
  })
}

export function getMessagesPage(
  conversationId: number,
  cursor: string | null = null,
): Promise<DirectMessagePage> {
  const suffix = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
  return apiRequest<DirectMessagePage>(`/conversations/${conversationId}/messages/${suffix}`)
}

export function sendMessage(conversationId: number, body: string): Promise<DirectMessage> {
  return apiRequest<DirectMessage>(`/conversations/${conversationId}/messages/`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  })
}

export function markConversationRead(conversationId: number): Promise<ConversationReadResult> {
  return apiRequest<ConversationReadResult>(`/conversations/${conversationId}/read/`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export function messagingWebSocketUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws/messaging/`
}
