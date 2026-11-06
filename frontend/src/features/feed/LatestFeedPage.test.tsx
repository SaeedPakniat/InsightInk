import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getFeedPage } from '../../api/feed'
import type { FeedPage, Idea } from '../../api/types'
import { changeUiLanguage } from '../../i18n'
import { SESSION_QUERY_KEY } from '../auth/session'
import { LatestFeedPage } from './LatestFeedPage'

vi.mock('../../api/feed', async () => {
  const actual = await vi.importActual<typeof import('../../api/feed')>('../../api/feed')
  return {
    ...actual,
    getFeedPage: vi.fn(),
  }
})

function idea(id: number): Idea {
  return {
    id,
    language: 'en',
    title: `Idea ${id}`,
    body: `Body ${id}`,
    estimated_read_seconds: 60,
    published_at: '2026-11-01T08:00:00Z',
    creator: {
      id: 1,
      display_name: 'Creator',
      avatar: null,
      is_verified: false,
    },
    source: {
      id: 1,
      type: 'article',
      title: 'Source',
      original_creator_text: 'Author',
      language: 'en',
      external_url: '',
      cover: '',
    },
    topics: [],
  }
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  queryClient.setQueryData(SESSION_QUERY_KEY, null)

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/explore']}>
        <LatestFeedPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('LatestFeedPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await changeUiLanguage('en')
  })

  afterEach(() => {
    cleanup()
  })

  it('appends the next cursor page without replacing the first page', async () => {
    const first: FeedPage = {
      next: 'http://localhost:5173/api/v1/feed/?cursor=second',
      previous: null,
      results: [idea(40), idea(39)],
    }
    const second: FeedPage = {
      next: null,
      previous: 'http://localhost:5173/api/v1/feed/?cursor=first',
      results: [idea(38), idea(37)],
    }

    vi.mocked(getFeedPage).mockImplementation(async (cursor) =>
      cursor === 'second' ? second : first,
    )

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Idea 40' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Idea 39' })).toBeInTheDocument()
    expect(screen.getByText('2 ideas loaded')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Load 10 more' }))

    expect(await screen.findByRole('heading', { name: 'Idea 38' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Idea 40' })).toBeInTheDocument()
    expect(screen.getByText('4 ideas loaded')).toBeInTheDocument()
    expect(screen.getByText('You reached the end of the current collection.')).toBeInTheDocument()
  })
})
