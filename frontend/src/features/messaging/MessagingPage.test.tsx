import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../api/client'
import type { Conversation, CurrentUser, DirectMessage } from '../../api/types'
import { changeUiLanguage } from '../../i18n'
import { SESSION_QUERY_KEY } from '../auth/session'
import { MessagingPage } from './MessagingPage'

const { getConversationsPageMock, getMessagesPageMock, markConversationReadMock, sendMessageMock } =
  vi.hoisted(() => ({
    getConversationsPageMock: vi.fn(),
    getMessagesPageMock: vi.fn(),
    markConversationReadMock: vi.fn(),
    sendMessageMock: vi.fn(),
  }))

vi.mock('../../api/messaging', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../api/messaging')>()
  return {
    ...original,
    getConversationsPage: getConversationsPageMock,
    getMessagesPage: getMessagesPageMock,
    markConversationRead: markConversationReadMock,
    sendMessage: sendMessageMock,
  }
})

const currentUser: CurrentUser = {
  id: 1,
  email: 'reader@example.com',
  display_name: 'Reader Example',
  preferred_ui_language: 'en',
  avatar_url: null,
  capabilities: { can_moderate: false, can_administer: false },
}

function conversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 8,
    reader: { id: 1, display_name: 'Reader Example', avatar_url: null },
    creator: {
      id: 12,
      user_id: 2,
      display_name: 'Creator Example',
      avatar: null,
      account_avatar_url: null,
      is_verified: true,
    },
    viewer_role: 'reader',
    last_message: {
      id: 102,
      sender_id: 2,
      body_excerpt: 'Incoming private message',
      created_at: '2026-11-17T10:02:00Z',
      read_at: null,
      is_read: false,
    },
    unread_count: 2,
    created_at: '2026-11-17T09:00:00Z',
    updated_at: '2026-11-17T10:02:00Z',
    ...overrides,
  }
}

function message(overrides: Partial<DirectMessage> = {}): DirectMessage {
  return {
    id: 101,
    sender: { id: 2, display_name: 'Creator Example', avatar_url: null },
    body: 'Hello from the creator.',
    created_at: '2026-11-17T10:01:00Z',
    read_at: null,
    is_read: false,
    ...overrides,
  }
}

function renderPage(
  initialEntry = '/messages',
  conversations = [conversation({ unread_count: 0 })],
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  queryClient.setQueryData(SESSION_QUERY_KEY, currentUser)

  getConversationsPageMock.mockResolvedValue({
    next: null,
    previous: null,
    results: conversations,
  })
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/messages" element={<MessagingPage />} />
            <Route path="/messages/:conversationId" element={<MessagingPage />} />
            <Route path="/creators/:creatorId" element={<div>Creator profile</div>} />
            <Route path="/search" element={<div>Search page</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  }
}

beforeEach(async () => {
  vi.clearAllMocks()
  getMessagesPageMock.mockResolvedValue({
    next: null,
    previous: null,
    results: [message()],
  })
  markConversationReadMock.mockResolvedValue({
    marked_read: 1,
    unread_count: 0,
    read_at: '2026-11-17T10:03:00Z',
  })
  await changeUiLanguage('en')
})

afterEach(() => {
  cleanup()
})

describe('MessagingPage', () => {
  it('renders conversation previews, unread state, and active-safe identity data', async () => {
    renderPage('/messages', [
      conversation(),
      conversation({
        id: 9,
        creator: {
          id: 13,
          user_id: 3,
          display_name: 'Second Creator',
          avatar: null,
          account_avatar_url: null,
          is_verified: false,
        },
        last_message: null,
        unread_count: 0,
      }),
    ])

    expect(await screen.findByRole('heading', { name: 'Messages' })).toBeInTheDocument()
    expect(await screen.findByText('Creator Example')).toBeInTheDocument()
    expect(screen.getByText('Incoming private message')).toBeInTheDocument()
    expect(screen.getByLabelText('2 unread messages')).toBeInTheDocument()
    expect(screen.getByText('Second Creator')).toBeInTheDocument()
    expect(screen.getByText('No messages yet')).toBeInTheDocument()
  })

  it('renders the empty conversation state with a discovery path', async () => {
    renderPage('/messages', [])

    expect(await screen.findByText('No conversations yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Find creators' })).toHaveAttribute('href', '/search')
  })

  it('opens a conversation route and renders chronological message history', async () => {
    const pointer = userEvent.setup()
    getMessagesPageMock.mockResolvedValue({
      next: null,
      previous: null,
      results: [
        message({ id: 103, body: 'Newest', created_at: '2026-11-17T10:03:00Z' }),
        message({ id: 101, body: 'Oldest', created_at: '2026-11-17T10:01:00Z' }),
      ],
    })
    renderPage('/messages', [conversation({ unread_count: 0 })])

    await pointer.click(await screen.findByRole('link', { name: /Creator Example/ }))

    expect(await screen.findByRole('heading', { name: 'Creator Example' })).toBeInTheDocument()
    expect(getMessagesPageMock).toHaveBeenCalledWith(8, null)
    const bubbles = screen.getAllByRole('listitem')
    const messageTexts = bubbles
      .map((item) => item.textContent || '')
      .filter((item) => item.includes('Oldest') || item.includes('Newest'))
    expect(messageTexts[0]).toContain('Oldest')
    expect(messageTexts[1]).toContain('Newest')
    expect(document.querySelector('.messaging-page--selected')).toBeInTheDocument()
  })

  it('sends through REST and adds the authoritative response once', async () => {
    const pointer = userEvent.setup()
    const sent = message({
      id: 104,
      sender: { id: 1, display_name: 'Reader Example', avatar_url: null },
      body: 'A new reply',
      created_at: '2026-11-17T10:04:00Z',
    })
    sendMessageMock.mockResolvedValue(sent)
    renderPage('/messages/8', [conversation({ unread_count: 0 })])

    const composer = await screen.findByLabelText('Message')
    await pointer.type(composer, '  A new reply  ')
    await pointer.click(screen.getByRole('button', { name: 'Send message' }))

    await waitFor(() => expect(sendMessageMock).toHaveBeenCalledWith(8, 'A new reply'))
    expect(await screen.findByText('A new reply')).toBeInTheDocument()
    expect(screen.getAllByText('A new reply')).toHaveLength(1)
    expect(composer).toHaveValue('')
  })

  it('enforces the 4000-character client boundary without sending', async () => {
    renderPage('/messages/8', [conversation({ unread_count: 0 })])
    const composer = await screen.findByLabelText('Message')

    fireEvent.change(composer, { target: { value: 'x'.repeat(4001) } })

    expect(screen.getByText('Messages can be at most 4000 characters.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled()
    expect(sendMessageMock).not.toHaveBeenCalled()
  })

  it('marks incoming unread messages once when the conversation is opened', async () => {
    renderPage('/messages/8', [conversation({ unread_count: 2 })])

    await waitFor(() => expect(markConversationReadMock).toHaveBeenCalledTimes(1))
    expect(markConversationReadMock).toHaveBeenCalledWith(8)
  })

  it('offers reporting only for received messages', async () => {
    getMessagesPageMock.mockResolvedValue({
      next: null,
      previous: null,
      results: [
        message({
          id: 102,
          sender: { id: 1, display_name: 'Reader Example', avatar_url: null },
          body: 'My outgoing message',
        }),
        message({ id: 101, body: 'Received message' }),
      ],
    })
    renderPage('/messages/8', [conversation({ unread_count: 0 })])

    expect(await screen.findByText('Received message')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Report message' })).toHaveLength(1)
  })

  it('uses the privacy-preserving 404 as a not-found state', async () => {
    getMessagesPageMock.mockRejectedValue(new ApiError(404, null))
    renderPage('/messages/8', [conversation({ unread_count: 0 })])

    expect(await screen.findByText('Conversation not found')).toBeInTheDocument()
    expect(
      screen.getByText(
        'This private conversation does not exist or is not available to this account.',
      ),
    ).toBeInTheDocument()
  })

  it('supports Persian RTL and English LTR without changing message content direction', async () => {
    await changeUiLanguage('fa')
    renderPage('/messages/8', [conversation({ unread_count: 0 })])

    expect(await screen.findByRole('heading', { name: 'پیام‌ها' })).toBeInTheDocument()
    expect(document.documentElement.dir).toBe('rtl')
    expect(await screen.findByText('Hello from the creator.')).toHaveAttribute('dir', 'auto')

    cleanup()
    await changeUiLanguage('en')
    renderPage('/messages/8', [conversation({ unread_count: 0 })])
    expect(await screen.findByRole('heading', { name: 'Messages' })).toBeInTheDocument()
    expect(document.documentElement.dir).toBe('ltr')
  })
})
