import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getViewerEngagement } from '../../api/engagement'
import { getSavedLibrary } from '../../api/library'
import type { CurrentUser, Idea, SavedLibraryItem } from '../../api/types'
import { changeUiLanguage } from '../../i18n'
import { SESSION_QUERY_KEY } from '../auth/session'
import { AVAILABLE_LANGUAGES_QUERY_KEY } from '../languages/languageQueries'
import { SavedLibraryPage } from './SavedLibraryPage'

vi.mock('../../api/library', () => ({
  getSavedLibrary: vi.fn(),
}))

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

function idea(id: number, title: string): Idea {
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
      mutations: { retry: false },
    },
  })

  queryClient.setQueryData(SESSION_QUERY_KEY, user)
  queryClient.setQueryData(AVAILABLE_LANGUAGES_QUERY_KEY, [
    { code: 'en', name_en: 'English', name_fa: 'انگلیسی', native_name: 'English' },
  ])

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/library']}>
        <SavedLibraryPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SavedLibraryPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await changeUiLanguage('en')
    vi.mocked(getViewerEngagement).mockImplementation(async (ideaIds) => ({
      items: ideaIds.map((ideaId) => ({
        idea_id: ideaId,
        sparked: false,
        saved: true,
      })),
    }))
  })

  afterEach(() => {
    cleanup()
  })

  it('preserves backend newest-saved-first ordering and shows saved metadata', async () => {
    const items: SavedLibraryItem[] = [
      {
        saved_at: '2026-11-06T10:00:00Z',
        idea: idea(40, 'Newest saved idea'),
      },
      {
        saved_at: '2026-11-01T10:00:00Z',
        idea: idea(39, 'Older saved idea'),
      },
    ]
    vi.mocked(getSavedLibrary).mockResolvedValue(items)

    renderPage()

    const headings = await screen.findAllByRole('heading', { level: 2 })
    expect(headings.map((heading) => heading.textContent)).toEqual([
      'Newest saved idea',
      'Older saved idea',
    ])
    expect(screen.getByText('2 saved ideas')).toBeInTheDocument()
    expect(screen.getAllByText(/Saved /)).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'Library' })).toHaveAttribute('aria-current', 'page')
  })

  it('shows a useful empty state with a route back to discovery', async () => {
    vi.mocked(getSavedLibrary).mockResolvedValue([])

    renderPage()

    expect(await screen.findByText('Nothing saved yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Explore ideas' })).toHaveAttribute('href', '/explore')
  })

  it('shows retry state when the library request fails', async () => {
    vi.mocked(getSavedLibrary).mockRejectedValue(new Error('network'))

    renderPage()

    expect(await screen.findByText('Your library could not be loaded')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
