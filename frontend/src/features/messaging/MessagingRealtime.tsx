import { type PropsWithChildren, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { messagingWebSocketUrl } from '../../api/messaging'
import type { MessagingRealtimeEvent, MessagingSocketStatus } from '../../api/types'
import { SESSION_QUERY_KEY } from '../auth/session'
import {
  CONVERSATIONS_QUERY_KEY,
  MESSAGING_QUERY_KEY,
  conversationMessagesQueryKey,
} from './messagingQueries'
import { MessagingRealtimeContext } from './messagingRealtimeContext'

type MessagingSocket = Pick<
  WebSocket,
  'close' | 'onclose' | 'onerror' | 'onmessage' | 'onopen' | 'readyState'
>

export type MessagingSocketFactory = () => MessagingSocket

const RECONNECT_DELAYS_MS = [1000, 2000, 5000, 10_000] as const

function defaultSocketFactory(): MessagingSocket {
  return new WebSocket(messagingWebSocketUrl())
}

function isRealtimeEvent(value: unknown): value is MessagingRealtimeEvent {
  if (!value || typeof value !== 'object') return false
  return typeof (value as { type?: unknown }).type === 'string'
}

export function MessagingRealtimeProvider({
  children,
  userId,
  enabled = import.meta.env.MODE !== 'test',
  socketFactory = defaultSocketFactory,
  reconnectDelays = RECONNECT_DELAYS_MS,
}: PropsWithChildren<{
  userId: number | null
  enabled?: boolean
  socketFactory?: MessagingSocketFactory
  reconnectDelays?: readonly number[]
}>) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<MessagingSocketStatus>('disconnected')

  useEffect(() => {
    if (!enabled || !userId) return

    let disposed = false
    let socket: MessagingSocket | null = null
    let reconnectTimer: number | null = null
    let reconnectAttempt = 0

    const invalidateConversation = (conversationId: number) => {
      void queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY })
      void queryClient.invalidateQueries({
        queryKey: conversationMessagesQueryKey(conversationId),
      })
    }

    const handleEvent = (event: MessagingRealtimeEvent) => {
      if (event.type === 'sync.required') {
        void queryClient.invalidateQueries({ queryKey: MESSAGING_QUERY_KEY })
        return
      }

      if (event.type === 'conversation.created') {
        void queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY })
        return
      }

      if (event.type === 'message.created') {
        invalidateConversation(event.message.conversation_id)
        return
      }

      if (event.type === 'messages.read') {
        invalidateConversation(event.conversation_id)
      }
    }

    const connect = (reconnecting: boolean) => {
      if (disposed) return
      setStatus(reconnecting ? 'reconnecting' : 'connecting')

      const nextSocket = socketFactory()
      socket = nextSocket

      nextSocket.onopen = () => {
        if (disposed || socket !== nextSocket) return
        reconnectAttempt = 0
        setStatus('connected')
      }

      nextSocket.onmessage = (message) => {
        if (disposed || socket !== nextSocket || typeof message.data !== 'string') return

        try {
          const parsed = JSON.parse(message.data) as unknown
          if (isRealtimeEvent(parsed)) handleEvent(parsed)
        } catch {
          // Ignore malformed delivery events; REST remains authoritative.
        }
      }

      nextSocket.onerror = () => {
        if (disposed || socket !== nextSocket) return
        try {
          nextSocket.close()
        } catch {
          // onclose/reconnect is best-effort.
        }
      }

      nextSocket.onclose = (event) => {
        if (disposed || socket !== nextSocket) return
        socket = null

        if (event.code === 4401) {
          setStatus('disconnected')
          queryClient.setQueryData(SESSION_QUERY_KEY, null)
          void queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY })
          return
        }

        setStatus('reconnecting')
        const delays = reconnectDelays.length ? reconnectDelays : RECONNECT_DELAYS_MS
        const delay = delays[Math.min(reconnectAttempt, delays.length - 1)] ?? 10_000
        reconnectAttempt += 1
        reconnectTimer = window.setTimeout(() => connect(true), delay)
      }
    }

    connect(false)

    return () => {
      disposed = true
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer)
      const activeSocket = socket
      socket = null
      if (activeSocket) {
        try {
          activeSocket.close(1000, 'session changed')
        } catch {
          // Cleanup only.
        }
      }
    }
  }, [enabled, queryClient, reconnectDelays, socketFactory, userId])

  const effectiveStatus: MessagingSocketStatus = !enabled || !userId ? 'disconnected' : status
  const value = useMemo(() => ({ status: effectiveStatus }), [effectiveStatus])

  return (
    <MessagingRealtimeContext.Provider value={value}>{children}</MessagingRealtimeContext.Provider>
  )
}
