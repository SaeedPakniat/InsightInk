import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { reportIdea } from '../../api/reporting'
import type { CurrentUser, PublicReport } from '../../api/types'
import { changeUiLanguage } from '../../i18n'
import { SESSION_QUERY_KEY } from '../auth/session'
import { IdeaReportAction } from './IdeaReportAction'

vi.mock('../../api/reporting', () => ({
  reportComment: vi.fn(),
  reportIdea: vi.fn(),
}))

const user: CurrentUser = {
  id: 7,
  email: 'reader@example.com',
  display_name: 'Reader',
  preferred_ui_language: 'en',
  capabilities: { can_moderate: false, can_administer: false },
}

function renderAction(authenticated: boolean) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  queryClient.setQueryData(SESSION_QUERY_KEY, authenticated ? user : null)

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/ideas/25']}>
        <IdeaReportAction ideaId={25} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('IdeaReportAction', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await changeUiLanguage('en')
  })

  afterEach(() => cleanup())

  it('offers anonymous readers a sign-in path without submitting', () => {
    renderAction(false)

    fireEvent.click(screen.getByRole('button', { name: 'Report Idea' }))

    expect(
      screen.getByText('Sign in to report this Idea for moderation review.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign in to report' })).toHaveAttribute(
      'href',
      '/login',
    )
    expect(reportIdea).not.toHaveBeenCalled()
  })

  it('submits a locked Idea report and shows local success', async () => {
    const result: PublicReport = {
      id: 12,
      reason: 'inappropriate_content',
      details: 'Unsafe content.',
      status: 'open',
      created_at: '2026-11-07T09:00:00Z',
    }
    vi.mocked(reportIdea).mockResolvedValue(result)

    renderAction(true)

    fireEvent.click(screen.getByRole('button', { name: 'Report Idea' }))
    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: 'inappropriate_content' },
    })
    fireEvent.change(screen.getByLabelText('Additional details (optional)'), {
      target: { value: '  Unsafe content.  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Submit report' }))

    await waitFor(() => {
      expect(reportIdea).toHaveBeenCalledWith(25, {
        reason: 'inappropriate_content',
        details: 'Unsafe content.',
      })
    })

    expect(await screen.findByText('Idea report submitted')).toBeInTheDocument()
  })
})
