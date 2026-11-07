import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getModerationReportsPage } from '../../api/moderation'
import type { ModerationReportListItem, ModerationReportPage } from '../../api/types'
import { changeUiLanguage } from '../../i18n'
import { ModerationQueuePage } from './ModerationQueuePage'

vi.mock('../../api/moderation', async () => {
  const actual =
    await vi.importActual<typeof import('../../api/moderation')>('../../api/moderation')
  return {
    ...actual,
    getModerationReportsPage: vi.fn(),
  }
})

function report(
  id: number,
  status: ModerationReportListItem['status'] = 'open',
): ModerationReportListItem {
  return {
    id,
    reporter: { id: 1, display_name: 'Reader One' },
    target_type: 'comment',
    target_id: 2,
    reason: 'spam',
    status,
    created_at: '2026-11-07T06:00:00Z',
    resolved_at: null,
  }
}

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{location.search}</output>
}

function renderPage(entry = '/moderation') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[entry]}>
        <LocationProbe />
        <ModerationQueuePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ModerationQueuePage', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await changeUiLanguage('en')
  })

  afterEach(() => {
    cleanup()
  })

  it('defaults to open reports and links each case to its detail route', async () => {
    vi.mocked(getModerationReportsPage).mockResolvedValue({
      next: null,
      previous: null,
      results: [report(2)],
    })

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Report queue' })).toBeInTheDocument()
    expect(getModerationReportsPage).toHaveBeenCalledWith('open', null)
    expect(screen.getByRole('button', { name: 'Open' })).toHaveAttribute('aria-pressed', 'true')
    expect(await screen.findByRole('link', { name: /Report #2/ })).toHaveAttribute(
      'href',
      '/moderation/reports/2',
    )
  })

  it('changes the status filter through URL state', async () => {
    vi.mocked(getModerationReportsPage).mockImplementation(
      async (status): Promise<ModerationReportPage> => ({
        next: null,
        previous: null,
        results: status === 'reviewing' ? [report(3, 'reviewing')] : [],
      }),
    )

    renderPage()

    await screen.findByRole('heading', { name: 'Report queue' })
    fireEvent.click(screen.getByRole('button', { name: 'Reviewing' }))

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('status=reviewing')
    })
    expect(await screen.findByRole('link', { name: /Report #3/ })).toBeInTheDocument()
    expect(getModerationReportsPage).toHaveBeenLastCalledWith('reviewing', null)
  })

  it('loads and de-duplicates the next cursor page', async () => {
    vi.mocked(getModerationReportsPage).mockImplementation(async (_status, cursor) =>
      cursor === 'second'
        ? {
            next: null,
            previous: 'previous',
            results: [report(2), report(1)],
          }
        : {
            next: 'http://localhost:8000/api/v1/moderation/reports/?status=open&cursor=second',
            previous: null,
            results: [report(3), report(2)],
          },
    )

    renderPage()

    expect(await screen.findByRole('link', { name: /Report #3/ })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Load more reports' }))

    expect(await screen.findByRole('link', { name: /Report #1/ })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Report #2/ })).toHaveLength(1)
  })
})
