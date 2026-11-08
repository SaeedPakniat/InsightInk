import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { actOnModerationReport, getModerationReport } from '../../api/moderation'
import type { CurrentUser, ModerationReportDetail } from '../../api/types'
import { changeUiLanguage } from '../../i18n'
import { SESSION_QUERY_KEY } from '../auth/session'
import { ModerationReportPage } from './ModerationReportPage'

vi.mock('../../api/moderation', async () => {
  const actual =
    await vi.importActual<typeof import('../../api/moderation')>('../../api/moderation')
  return {
    ...actual,
    getModerationReport: vi.fn(),
    actOnModerationReport: vi.fn(),
  }
})

function report(status: ModerationReportDetail['status'] = 'open'): ModerationReportDetail {
  return {
    id: 2,
    reporter: { id: 1, display_name: 'Reader One' },
    target_type: 'comment',
    target_id: 5,
    reason: 'harassment',
    status,
    created_at: '2026-11-07T06:00:00Z',
    resolved_at: status === 'resolved' || status === 'rejected' ? '2026-11-07T07:00:00Z' : null,
    details: 'Repeated personal attacks.',
    target_idea: null,
    target_comment: {
      id: 5,
      author: { id: 8, display_name: 'Comment Author' },
      body: 'Reported comment body.',
      status: 'visible',
      created_at: '2026-11-07T05:00:00Z',
      updated_at: '2026-11-07T05:00:00Z',
    },
    actions:
      status === 'open'
        ? []
        : [
            {
              id: 10,
              moderator: { id: 9, display_name: 'Demo Moderator' },
              action_type: 'review_started',
              target_type: 'comment',
              target_id: 5,
              note: 'Taking this case.',
              created_at: '2026-11-07T06:30:00Z',
            },
          ],
  }
}

const moderator: CurrentUser = {
  id: 9,
  email: 'moderator@example.com',
  display_name: 'Demo Moderator',
  preferred_ui_language: 'en',
  capabilities: { can_moderate: true, can_administer: false },
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  queryClient.setQueryData(SESSION_QUERY_KEY, moderator)

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/moderation/reports/2']}>
        <Routes>
          <Route path="/moderation/reports/:reportId" element={<ModerationReportPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ModerationReportPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await changeUiLanguage('en')
    vi.mocked(actOnModerationReport).mockResolvedValue()
  })

  afterEach(() => {
    cleanup()
  })

  it('shows report context and only Start review for an open case', async () => {
    vi.mocked(getModerationReport).mockResolvedValue(report('open'))

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Report #2' })).toBeInTheDocument()
    expect(screen.getByText('Repeated personal attacks.')).toBeInTheDocument()
    expect(screen.getByText('Reported comment body.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start review' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Resolve report' })).not.toBeInTheDocument()
    expect(screen.getByText('No moderation actions have been recorded yet.')).toBeInTheDocument()
  })

  it('submits a trimmed audit note when starting review', async () => {
    vi.mocked(getModerationReport).mockResolvedValue(report('open'))

    renderPage()

    await screen.findByRole('heading', { name: 'Report #2' })
    fireEvent.change(screen.getByLabelText('Moderator note (optional)'), {
      target: { value: '  Taking this case.  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Start review' }))

    await waitFor(() => {
      expect(actOnModerationReport).toHaveBeenCalledWith(2, 'start-review', {
        note: 'Taking this case.',
      })
    })
  })

  it('shows only reviewing-stage actions and renders the audit trail', async () => {
    vi.mocked(getModerationReport).mockResolvedValue(report('reviewing'))

    renderPage()

    expect(await screen.findByRole('button', { name: 'Hide reported comment' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resolve report' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reject report' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start review' })).not.toBeInTheDocument()
    expect(screen.getByText('Review started')).toBeInTheDocument()
    expect(screen.getByText('Demo Moderator')).toBeInTheDocument()
    expect(screen.getByText('Taking this case.')).toBeInTheDocument()
  })

  it('renders an Idea report target with source context and direct moderation controls', async () => {
    const ideaReport: ModerationReportDetail = {
      ...report('open'),
      target_type: 'idea',
      target_id: 25,
      target_comment: null,
      target_idea: {
        id: 25,
        title: 'Reported Idea',
        body: 'This is the reported Idea body.',
        language: 'en',
        status: 'published',
        creator: {
          id: 4,
          display_name: 'Idea Creator',
          avatar: null,
          is_verified: false,
        },
        source: {
          id: 91,
          type: 'website',
          title: 'Original Website',
          original_creator_text: 'Original Author',
          language: 'en',
          external_url: 'https://example.com',
          cover: '',
        },
        published_at: '2026-11-07T05:00:00Z',
      },
    }
    vi.mocked(getModerationReport).mockResolvedValue(ideaReport)

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Reported Idea' })).toBeInTheDocument()
    expect(screen.getByText('This is the reported Idea body.')).toBeInTheDocument()
    expect(screen.getByText('Original Website')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hide Idea' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Hide reported comment' })).not.toBeInTheDocument()
  })

  it('hides moderation actions after the case reaches a terminal state', async () => {
    vi.mocked(getModerationReport).mockResolvedValue(report('resolved'))

    renderPage()

    expect(await screen.findByText('Case complete')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Resolve report' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reject report' })).not.toBeInTheDocument()
  })
})
