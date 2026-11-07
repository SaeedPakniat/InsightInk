import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { reportComment } from '../../api/reporting'
import type { CurrentUser, PublicReport } from '../../api/types'
import { changeUiLanguage } from '../../i18n'
import { SESSION_QUERY_KEY } from '../auth/session'
import { CommentReportAction } from './CommentReportAction'

vi.mock('../../api/reporting', () => ({
  reportComment: vi.fn(),
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
      <MemoryRouter initialEntries={['/ideas/40']}>
        <CommentReportAction commentId={11} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CommentReportAction', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await changeUiLanguage('en')
  })

  afterEach(() => {
    cleanup()
  })

  it('offers an anonymous reader a sign-in path that returns to the Idea', () => {
    renderAction(false)

    fireEvent.click(screen.getByRole('button', { name: 'Report' }))

    expect(screen.getByRole('link', { name: 'Sign in to report' })).toHaveAttribute(
      'href',
      '/login',
    )
    expect(
      screen.getByText('Sign in to report this comment for moderation review.'),
    ).toBeInTheDocument()
  })

  it('requires an explicit locked reason before submission', () => {
    renderAction(true)

    fireEvent.click(screen.getByRole('button', { name: 'Report' }))

    expect(screen.getByRole('button', { name: 'Submit report' })).toBeDisabled()
    expect(screen.getByLabelText('Reason')).toHaveValue('')

    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: 'spam' },
    })

    expect(screen.getByRole('button', { name: 'Submit report' })).toBeEnabled()
    expect(screen.getByRole('option', { name: 'Harassment' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Spam' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Inappropriate content' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Other' })).toBeInTheDocument()
  })

  it('submits trimmed optional details and replaces the form with a success state', async () => {
    const report: PublicReport = {
      id: 9,
      reason: 'other',
      details: 'Useful moderation context',
      status: 'open',
      created_at: '2026-11-07T09:00:00Z',
    }
    vi.mocked(reportComment).mockResolvedValue(report)

    renderAction(true)

    fireEvent.click(screen.getByRole('button', { name: 'Report' }))
    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: 'other' },
    })
    fireEvent.change(screen.getByLabelText('Additional details (optional)'), {
      target: { value: '  Useful moderation context  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Submit report' }))

    await waitFor(() => {
      expect(reportComment).toHaveBeenCalledWith(11, {
        reason: 'other',
        details: 'Useful moderation context',
      })
    })

    expect(await screen.findByText('Report submitted')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Submit report' })).not.toBeInTheDocument()
  })

  it('preserves the form and shows an error when submission fails', async () => {
    vi.mocked(reportComment).mockRejectedValue(new Error('network'))

    renderAction(true)

    fireEvent.click(screen.getByRole('button', { name: 'Report' }))
    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: 'spam' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Submit report' }))

    expect(
      await screen.findByText('The report could not be submitted. Please try again.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Reason')).toHaveValue('spam')
  })
})
