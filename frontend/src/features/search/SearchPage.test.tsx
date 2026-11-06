import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getViewerEngagement } from '../../api/engagement'
import { getTopics } from '../../api/interests'
import { getSearchPage } from '../../api/search'
import type { CurrentUser, FeedPage, Idea, Topic } from '../../api/types'
import { changeUiLanguage } from '../../i18n'
import { SESSION_QUERY_KEY } from '../auth/session'
import { AVAILABLE_LANGUAGES_QUERY_KEY } from '../languages/languageQueries'
import { SearchPage } from './SearchPage'

vi.mock('../../api/search', async () => {
  const actual = await vi.importActual<typeof import('../../api/search')>('../../api/search')
  return {
    ...actual,
    getSearchPage: vi.fn(),
  }
})

vi.mock('../../api/interests', () => ({
  getTopics: vi.fn(),
  getCurrentInterests: vi.fn(),
  updateInterests: vi.fn(),
}))

vi.mock('../../api/engagement', () => ({
  getViewerEngagement: vi.fn(),
  setSparked: vi.fn(),
  setSaved: vi.fn(),
}))

const science: Topic = {
  id: 5,
  slug: 'science',
  name_fa: 'علم',
  name_en: 'Science',
}

const user: CurrentUser = {
  id: 7,
  email: 'reader@example.com',
  display_name: 'Reader',
  preferred_ui_language: 'en',
}

function idea(id: number, title = `Idea ${id}`): Idea {
  return {
    id,
    language: 'en',
    title,
    body: `Body for ${title}`,
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
      type: 'book',
      title: 'Source',
      original_creator_text: 'Author',
      language: 'en',
      external_url: '',
      cover: '',
    },
    topics: [science],
  }
}

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{location.search}</output>
}

function renderPage(entry = '/search', authenticated = false) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  queryClient.setQueryData(SESSION_QUERY_KEY, authenticated ? user : null)
  queryClient.setQueryData(AVAILABLE_LANGUAGES_QUERY_KEY, [
    {
      code: 'en',
      name_en: 'English',
      name_fa: 'انگلیسی',
      native_name: 'English',
    },
  ])

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[entry]}>
        <LocationProbe />
        <SearchPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SearchPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await changeUiLanguage('en')
    vi.mocked(getTopics).mockResolvedValue([science])
    vi.mocked(getViewerEngagement).mockResolvedValue({ items: [] })
  })

  afterEach(() => {
    cleanup()
  })

  it('reads query and filters from the URL and searches publicly', async () => {
    vi.mocked(getSearchPage).mockResolvedValue({
      next: null,
      previous: null,
      results: [idea(40, 'Systems Thinking')],
    })

    renderPage('/search?q=systems&type=book&topic=science')

    expect(await screen.findByRole('heading', { name: 'Systems Thinking' })).toBeInTheDocument()
    expect(getSearchPage).toHaveBeenCalledWith(
      { q: 'systems', type: 'book', topic: 'science' },
      null,
    )
    expect(screen.getByRole('searchbox', { name: 'Search ideas' })).toHaveValue('systems')
    expect(screen.getByLabelText('Format')).toHaveValue('book')
    expect(screen.getByLabelText('Topic')).toHaveValue('science')
    expect(
      screen.getByText('You are searching across all currently supported content languages.'),
    ).toBeInTheDocument()
  })

  it('submits a new query into the URL instead of searching on every keystroke', async () => {
    vi.mocked(getSearchPage).mockImplementation(async (filters) => ({
      next: null,
      previous: null,
      results: filters.q ? [idea(39, 'Focused result')] : [],
    }))

    renderPage()

    await waitFor(() => {
      expect(getSearchPage).toHaveBeenCalledWith({}, null)
    })

    const input = screen.getByRole('searchbox', { name: 'Search ideas' })
    fireEvent.change(input, { target: { value: 'focus' } })

    expect(vi.mocked(getSearchPage).mock.calls).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    expect(await screen.findByRole('heading', { name: 'Focused result' })).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('?q=focus')
    expect(getSearchPage).toHaveBeenLastCalledWith({ q: 'focus' }, null)
  })

  it('keeps source/topic filters in the shareable URL and can clear them', async () => {
    vi.mocked(getSearchPage).mockResolvedValue({
      next: null,
      previous: null,
      results: [],
    })

    renderPage()

    await screen.findByRole('heading', { name: 'Browse published ideas' })

    fireEvent.change(screen.getByLabelText('Format'), {
      target: { value: 'podcast' },
    })

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('type=podcast')
    })

    fireEvent.change(screen.getByLabelText('Topic'), {
      target: { value: 'science' },
    })

    await waitFor(() => {
      const location = screen.getByTestId('location').textContent ?? ''
      expect(location).toContain('type=podcast')
      expect(location).toContain('topic=science')
    })

    fireEvent.click(
      within(screen.getByRole('search')).getByRole('button', { name: 'Clear search' }),
    )

    expect(screen.getByTestId('location')).toHaveTextContent('')
    expect(screen.getByLabelText('Format')).toHaveValue('')
    expect(screen.getByLabelText('Topic')).toHaveValue('')
  })

  it('hydrates engagement for authenticated results and loads the next cursor page', async () => {
    const first: FeedPage = {
      next: 'http://localhost:8000/api/v1/search/?q=focus&cursor=second',
      previous: null,
      results: [idea(40, 'First match')],
    }
    const second: FeedPage = {
      next: null,
      previous: 'http://localhost:8000/api/v1/search/?q=focus&cursor=first',
      results: [idea(39, 'Second match')],
    }

    vi.mocked(getSearchPage).mockImplementation(async (_filters, cursor) =>
      cursor === 'second' ? second : first,
    )
    vi.mocked(getViewerEngagement).mockImplementation(async (ideaIds) => ({
      items: ideaIds.map((ideaId) => ({
        idea_id: ideaId,
        sparked: false,
        saved: false,
      })),
    }))

    renderPage('/search?q=focus', true)

    expect(await screen.findByRole('heading', { name: 'First match' })).toBeInTheDocument()

    await waitFor(() => {
      expect(getViewerEngagement).toHaveBeenCalledWith([40])
    })

    expect(screen.getByText('Results follow your selected content languages.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Edit languages' })).toHaveAttribute(
      'href',
      '/onboarding/languages',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Load more results' }))

    expect(await screen.findByRole('heading', { name: 'Second match' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'First match' })).toBeInTheDocument()
  })
})
