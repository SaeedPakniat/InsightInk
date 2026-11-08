import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { moderateIdeaDirectly } from '../../api/moderation'
import type { CurrentUser } from '../../api/types'
import { changeUiLanguage } from '../../i18n'
import { SESSION_QUERY_KEY } from '../auth/session'
import { IdeaModerationControls } from './IdeaModerationControls'

vi.mock('../../api/moderation', async () => {
  const actual =
    await vi.importActual<typeof import('../../api/moderation')>('../../api/moderation')
  return {
    ...actual,
    moderateIdeaDirectly: vi.fn(),
  }
})

function user(canModerate: boolean): CurrentUser {
  return {
    id: 9,
    email: 'moderator@example.com',
    display_name: 'Moderator',
    preferred_ui_language: 'en',
    capabilities: {
      can_moderate: canModerate,
      can_administer: false,
    },
  }
}

function renderControls(canModerate: boolean, initialStatus: 'published' | 'hidden' = 'published') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  queryClient.setQueryData(SESSION_QUERY_KEY, user(canModerate))

  return render(
    <QueryClientProvider client={queryClient}>
      <IdeaModerationControls ideaId={25} initialStatus={initialStatus} />
    </QueryClientProvider>,
  )
}

describe('IdeaModerationControls', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await changeUiLanguage('en')
  })

  afterEach(() => cleanup())

  it('does not render privileged controls for ordinary readers', () => {
    renderControls(false)
    expect(screen.queryByRole('button', { name: 'Hide Idea' })).not.toBeInTheDocument()
  })

  it('hides a public Idea with an optional audit note, then offers restore', async () => {
    vi.mocked(moderateIdeaDirectly).mockResolvedValue({
      idea_id: 25,
      status: 'hidden',
      action: 'idea_hidden',
    })

    renderControls(true)

    fireEvent.click(screen.getByRole('button', { name: 'Hide Idea' }))
    fireEvent.change(screen.getByLabelText('Moderator note (optional)'), {
      target: { value: '  Clear policy violation.  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Hide Idea' }))

    await waitFor(() => {
      expect(moderateIdeaDirectly).toHaveBeenCalledWith(25, 'hide', {
        note: 'Clear policy violation.',
      })
    })

    expect(await screen.findByRole('button', { name: 'Restore Idea' })).toBeInTheDocument()
  })

  it('restores an already hidden Idea', async () => {
    vi.mocked(moderateIdeaDirectly).mockResolvedValue({
      idea_id: 25,
      status: 'published',
      action: 'idea_restored',
    })

    renderControls(true, 'hidden')

    fireEvent.click(screen.getByRole('button', { name: 'Restore Idea' }))
    fireEvent.click(screen.getByRole('button', { name: 'Restore Idea' }))

    await waitFor(() => {
      expect(moderateIdeaDirectly).toHaveBeenCalledWith(25, 'restore', {})
    })

    expect(await screen.findByRole('button', { name: 'Hide Idea' })).toBeInTheDocument()
  })
})
