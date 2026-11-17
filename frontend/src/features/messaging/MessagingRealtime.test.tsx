import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SESSION_QUERY_KEY } from '../auth/session'
import { MessagingRealtimeProvider } from './MessagingRealtime'
import { useMessagingRealtimeStatus } from './messagingRealtimeContext'
import {
  CONVERSATIONS_QUERY_KEY,
  MESSAGING_QUERY_KEY,
  conversationMessagesQueryKey,
} from './messagingQueries'

class FakeSocket {
  readyState = 0
  onopen: ((event: Event) => unknown) | null = null
  onmessage: ((event: MessageEvent) => unknown) | null = null
  onerror: ((event: Event) => unknown) | null = null
  onclose: ((event: CloseEvent) => unknown) | null = null
  closeCalls: Array<{ code?: number; reason?: string }> = []

  close(code?: number, reason?: string) {
    this.closeCalls.push({ code, reason })
  }

  emitOpen() {
    this.readyState = 1
    this.onopen?.(new Event('open'))
  }

  emitMessage(payload: unknown) {
    this.onmessage?.(
      new MessageEvent('message', {
        data: JSON.stringify(payload),
      }),
    )
  }

  emitClose(code = 1006) {
    this.readyState = 3
    this.onclose?.({ code } as CloseEvent)
  }
}

function StatusProbe() {
  const { status } = useMessagingRealtimeStatus()
  return <span>{status}</span>
}

function renderRealtime({
  userId = 7,
  reconnectDelays = [10, 20] as const,
}: {
  userId?: number | null
  reconnectDelays?: readonly number[]
} = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const sockets: FakeSocket[] = []
  const factory = () => {
    const socket = new FakeSocket()
    sockets.push(socket)
    return socket as unknown as WebSocket
  }

  const view = render(
    <QueryClientProvider client={queryClient}>
      <MessagingRealtimeProvider
        userId={userId}
        enabled
        socketFactory={factory}
        reconnectDelays={reconnectDelays}
      >
        <StatusProbe />
      </MessagingRealtimeProvider>
    </QueryClientProvider>,
  )

  return { ...view, queryClient, sockets, factory, reconnectDelays }
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('MessagingRealtimeProvider', () => {
  it('invalidates authoritative REST queries for every backend messaging event', async () => {
    const { queryClient, sockets } = renderRealtime()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    await waitFor(() => expect(sockets).toHaveLength(1))
    act(() => sockets[0]?.emitOpen())
    expect(screen.getByText('connected')).toBeInTheDocument()

    invalidate.mockClear()
    act(() =>
      sockets[0]?.emitMessage({
        type: 'message.created',
        message: { conversation_id: 44 },
      }),
    )
    expect(invalidate).toHaveBeenCalledWith({ queryKey: CONVERSATIONS_QUERY_KEY })
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: conversationMessagesQueryKey(44),
    })

    invalidate.mockClear()
    act(() =>
      sockets[0]?.emitMessage({
        type: 'conversation.created',
        conversation: { id: 45 },
      }),
    )
    expect(invalidate).toHaveBeenCalledWith({ queryKey: CONVERSATIONS_QUERY_KEY })

    invalidate.mockClear()
    act(() =>
      sockets[0]?.emitMessage({
        type: 'messages.read',
        conversation_id: 44,
      }),
    )
    expect(invalidate).toHaveBeenCalledWith({ queryKey: CONVERSATIONS_QUERY_KEY })
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: conversationMessagesQueryKey(44),
    })

    invalidate.mockClear()
    act(() => sockets[0]?.emitMessage({ type: 'sync.required', reason: 'connected' }))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: MESSAGING_QUERY_KEY })
  })

  it('reconnects with bounded backoff and refetches through sync.required after reconnect', async () => {
    vi.useFakeTimers()
    const { queryClient, sockets } = renderRealtime({ reconnectDelays: [10, 20] })
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    expect(sockets).toHaveLength(1)
    act(() => sockets[0]?.emitClose())
    expect(screen.getByText('reconnecting')).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })
    expect(sockets).toHaveLength(2)

    act(() => sockets[1]?.emitClose())
    await act(async () => {
      await vi.advanceTimersByTimeAsync(19)
    })
    expect(sockets).toHaveLength(2)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(sockets).toHaveLength(3)

    act(() => sockets[2]?.emitOpen())
    invalidate.mockClear()
    act(() => sockets[2]?.emitMessage({ type: 'sync.required', reason: 'connected' }))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: MESSAGING_QUERY_KEY })
  })

  it('stops reconnecting and closes the account socket when the session is removed', async () => {
    vi.useFakeTimers()
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const sockets: FakeSocket[] = []
    const factory = () => {
      const socket = new FakeSocket()
      sockets.push(socket)
      return socket as unknown as WebSocket
    }
    const reconnectDelays = [10] as const

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <MessagingRealtimeProvider
          userId={7}
          enabled
          socketFactory={factory}
          reconnectDelays={reconnectDelays}
        >
          <StatusProbe />
        </MessagingRealtimeProvider>
      </QueryClientProvider>,
    )

    expect(sockets).toHaveLength(1)
    act(() => sockets[0]?.emitClose())
    rerender(
      <QueryClientProvider client={queryClient}>
        <MessagingRealtimeProvider
          userId={null}
          enabled
          socketFactory={factory}
          reconnectDelays={reconnectDelays}
        >
          <StatusProbe />
        </MessagingRealtimeProvider>
      </QueryClientProvider>,
    )

    expect(screen.getByText('disconnected')).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })
    expect(sockets).toHaveLength(1)
  })

  it('treats a 4401 close as session loss instead of reconnecting aggressively', async () => {
    vi.useFakeTimers()
    const { queryClient, sockets } = renderRealtime({ reconnectDelays: [10] })
    queryClient.setQueryData(SESSION_QUERY_KEY, { id: 7 })
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    act(() => sockets[0]?.emitClose(4401))
    expect(screen.getByText('disconnected')).toBeInTheDocument()
    expect(queryClient.getQueryData(SESSION_QUERY_KEY)).toBeNull()
    expect(invalidate).toHaveBeenCalledWith({ queryKey: SESSION_QUERY_KEY })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })
    expect(sockets).toHaveLength(1)
  })
})
