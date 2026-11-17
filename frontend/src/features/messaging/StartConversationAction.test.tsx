import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Conversation, CurrentUser } from '../../api/types'
import { changeUiLanguage } from '../../i18n'
import { SESSION_QUERY_KEY } from '../auth/session'
import { creatorFollowStateKey } from '../creators/creatorFollowState'
import { StartConversationAction } from './StartConversationAction'

const { startConversationMock } = vi.hoisted(() => ({
  startConversationMock: vi.fn(),
}))

vi.mock('../../api/messaging', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../api/messaging')>()
  return {
    ...original,
    startConversation: startConversationMock,
  }
})

const user: CurrentUser = {
  id: 1,
  email: 'reader@example.com',
  display_name: 'Reader',
  preferred_ui_language: 'en',
  avatar_url: null,
  capabilities: { can_moderate: false, can_administer: false },
}

const startedConversation: Conversation = {
  id: 33,
  reader: { id: 1, display_name: 'Reader', avatar_url: null },
  creator: {
    id: 12,
    user_id: 2,
    display_name: 'Creator',
    avatar: null,
    account_avatar_url: null,
    is_verified: false,
  },
  viewer_role: 'reader',
  last_message: null,
  unread_count: 0,
  created_at: '2026-11-17T12:00:00Z',
  updated_at: '2026-11-17T12:00:00Z',
}

function renderAction({
  session = user,
  canFollow = true,
}: {
  session?: CurrentUser | null
  canFollow?: boolean
} = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  queryClient.setQueryData(SESSION_QUERY_KEY, session)
  if (session) {
    queryClient.setQueryData(creatorFollowStateKey(12), {
      creator_id: 12,
      following: false,
      can_follow: canFollow,
    })
  }

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/creators/12']}>
        <Routes>
          <Route path="/creators/:creatorId" element={<StartConversationAction creatorId={12} />} />
          <Route path="/messages/:conversationId" element={<div>Conversation opened</div>} />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(async () => {
  vi.clearAllMocks()
  startConversationMock.mockResolvedValue(startedConversation)
  await changeUiLanguage('en')
})

afterEach(() => {
  cleanup()
})

describe('StartConversationAction', () => {
  it('starts the canonical backend conversation and navigates to it', async () => {
    const pointer = userEvent.setup()
    renderAction()

    await pointer.click(screen.getByRole('button', { name: 'Message Creator' }))

    await waitFor(() => expect(startConversationMock).toHaveBeenCalledWith(12))
    expect(await screen.findByText('Conversation opened')).toBeInTheDocument()
  })

  it('does not expose messaging on the viewer own Creator profile', () => {
    renderAction({ canFollow: false })

    expect(screen.queryByRole('button', { name: 'Message Creator' })).not.toBeInTheDocument()
    expect(startConversationMock).not.toHaveBeenCalled()
  })

  it('sends anonymous readers through the existing login return-path flow', () => {
    renderAction({ session: null })

    const link = screen.getByRole('link', { name: 'Sign in to message' })
    expect(link).toHaveAttribute('href', '/login')
  })
})
