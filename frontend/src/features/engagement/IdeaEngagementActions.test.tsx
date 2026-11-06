import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setSaved, setSparked } from '../../api/engagement'
import type { CurrentUser, ViewerEngagementItem } from '../../api/types'
import { changeUiLanguage } from '../../i18n'
import { SESSION_QUERY_KEY } from '../auth/session'
import { IdeaEngagementActions } from './IdeaEngagementActions'
import { viewerEngagementKey } from './viewerEngagement'

vi.mock('../../api/engagement', () => ({
  getViewerEngagement: vi.fn(),
  setSparked: vi.fn(),
  setSaved: vi.fn(),
}))

const user: CurrentUser = {
  id: 7,
  email: 'reader@example.com',
  display_name: 'Reader',
  preferred_ui_language: 'en',
}

function renderActions(
  state: ViewerEngagementItem | null,
  {
    authenticated = true,
    variant = 'card',
  }: { authenticated?: boolean; variant?: 'card' | 'detail' } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  queryClient.setQueryData(SESSION_QUERY_KEY, authenticated ? user : null)
  if (state) {
    queryClient.setQueryData(viewerEngagementKey(state.idea_id), state)
  }

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/ideas/40']}>
          <IdeaEngagementActions ideaId={40} variant={variant} />
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  }
}

describe('IdeaEngagementActions', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await changeUiLanguage('en')
  })

  afterEach(() => {
    cleanup()
  })

  it('optimistically presses Spark before the PUT request resolves', async () => {
    let resolveSpark!: () => void
    vi.mocked(setSparked).mockReturnValue(
      new Promise<void>((resolve) => {
        resolveSpark = resolve
      }),
    )

    renderActions({
      idea_id: 40,
      sparked: false,
      saved: false,
    })

    const sparkButton = screen.getByRole('button', { name: 'Spark' })
    expect(sparkButton).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(sparkButton)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Remove Spark' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
    })
    expect(setSparked).toHaveBeenCalledWith(40, true)

    resolveSpark()
  })

  it('rolls Save back to the previous state when DELETE fails', async () => {
    let rejectSave!: (error: Error) => void
    vi.mocked(setSaved).mockReturnValue(
      new Promise<void>((_resolve, reject) => {
        rejectSave = reject
      }),
    )

    renderActions({
      idea_id: 40,
      sparked: false,
      saved: true,
    })

    fireEvent.click(screen.getByRole('button', { name: 'Remove from saved' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('aria-pressed', 'false')
    })

    rejectSave(new Error('network failed'))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Remove from saved' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
    })
    expect(
      screen.getByText('That action could not be saved. Your previous state was restored.'),
    ).toBeInTheDocument()
  })

  it('disables both controls while either mutation is pending', async () => {
    vi.mocked(setSparked).mockReturnValue(new Promise<void>(() => undefined))

    renderActions({
      idea_id: 40,
      sparked: false,
      saved: false,
    })

    fireEvent.click(screen.getByRole('button', { name: 'Spark' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Remove Spark' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    })
  })

  it('offers sign-in on public detail instead of private controls for anonymous readers', () => {
    renderActions(null, { authenticated: false, variant: 'detail' })

    expect(screen.queryByRole('button', { name: /Spark|Save/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign in to Spark or Save' })).toHaveAttribute(
      'href',
      '/login',
    )
  })
})
