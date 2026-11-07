import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getCreator,
  getCreatorIdeasPage,
  getViewerCreatorFollowState,
  setCreatorFollowed,
} from '../../api/creators'
import { getViewerEngagement } from '../../api/engagement'
import type { CreatorPublic, CurrentUser, FeedPage, Idea } from '../../api/types'
import { changeUiLanguage } from '../../i18n'
import { SESSION_QUERY_KEY } from '../auth/session'
import { AVAILABLE_LANGUAGES_QUERY_KEY } from '../languages/languageQueries'
import { CreatorProfilePage } from './CreatorProfilePage'

vi.mock('../../api/creators', async () => {
  const actual = await vi.importActual<typeof import('../../api/creators')>('../../api/creators')
  return {
    ...actual,
    getCreator: vi.fn(),
    getCreatorIdeasPage: vi.fn(),
    getViewerCreatorFollowState: vi.fn(),
    setCreatorFollowed: vi.fn(),
  }
})

vi.mock('../../api/engagement', () => ({
  getViewerEngagement: vi.fn(),
  setSparked: vi.fn(),
  setSaved: vi.fn(),
}))

const creator: CreatorPublic = {
  id: 4,
  display_name: 'Maya Chen',
  bio_fa: 'زیست فارسی مایا',
  bio_en: 'Maya writes about systems, culture and useful questions.',
  avatar: null,
  is_verified: true,
  follower_count: 12,
  spark_count: 31,
  idea_count: 8,
}

const user: CurrentUser = {
  id: 7,
  email: 'reader@example.com',
  display_name: 'Reader',
  preferred_ui_language: 'en',
  capabilities: { can_moderate: false, can_administer: false },
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
      id: 4,
      display_name: 'Maya Chen',
      avatar: null,
      is_verified: true,
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

function renderPage(entry = '/creators/4', authenticated = false) {
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
        <Routes>
          <Route path="/creators/:creatorId" element={<CreatorProfilePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CreatorProfilePage', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await changeUiLanguage('en')
    vi.mocked(getCreator).mockResolvedValue(creator)
    vi.mocked(getCreatorIdeasPage).mockResolvedValue({
      next: null,
      previous: null,
      results: [idea(40, 'A creator idea')],
    })
    vi.mocked(getViewerEngagement).mockResolvedValue({ items: [] })
    vi.mocked(getViewerCreatorFollowState).mockResolvedValue({
      items: [{ creator_id: 4, following: false, can_follow: true }],
    })
    vi.mocked(setCreatorFollowed).mockResolvedValue()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders public identity, preferred bio, reach counts and published Ideas', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Maya Chen', level: 1 })).toBeInTheDocument()
    expect(
      screen.getByText('Maya writes about systems, culture and useful questions.'),
    ).toHaveAttribute('lang', 'en')
    expect(
      screen.getByText('Verified creator', { selector: '.creator-profile-page__verified' }),
    ).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('31')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { name: 'A creator idea', level: 2 }),
    ).toBeInTheDocument()
    expect(getViewerEngagement).not.toHaveBeenCalled()
    expect(getViewerCreatorFollowState).not.toHaveBeenCalled()
    expect(screen.getByRole('link', { name: 'Sign in to follow' })).toHaveAttribute(
      'href',
      '/login',
    )
  })

  it('falls back to the available English bio as LTR in Persian UI', async () => {
    await changeUiLanguage('fa')
    vi.mocked(getCreator).mockResolvedValue({
      ...creator,
      bio_fa: '',
      bio_en: 'English-only creator biography.',
    })

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Maya Chen', level: 1 })).toBeInTheDocument()
    const bio = screen.getByText('English-only creator biography.')
    expect(bio).toHaveAttribute('lang', 'en')
    expect(bio).toHaveAttribute('dir', 'ltr')
  })

  it('hydrates engagement when authenticated and appends the next creator page', async () => {
    const first: FeedPage = {
      next: 'http://localhost:8000/api/v1/creators/4/ideas/?cursor=second',
      previous: null,
      results: [idea(40, 'First creator idea')],
    }
    const second: FeedPage = {
      next: null,
      previous: 'http://localhost:8000/api/v1/creators/4/ideas/?cursor=first',
      results: [idea(39, 'Second creator idea')],
    }

    vi.mocked(getCreatorIdeasPage).mockImplementation(async (_creatorId, cursor) =>
      cursor === 'second' ? second : first,
    )
    vi.mocked(getViewerEngagement).mockImplementation(async (ideaIds) => ({
      items: ideaIds.map((ideaId) => ({
        idea_id: ideaId,
        sparked: false,
        saved: false,
      })),
    }))

    renderPage('/creators/4', true)

    expect(
      await screen.findByRole('heading', { name: 'First creator idea', level: 2 }),
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(getViewerEngagement).toHaveBeenCalledWith([40])
    })

    fireEvent.click(screen.getByRole('button', { name: 'Load more ideas' }))

    expect(
      await screen.findByRole('heading', { name: 'Second creator idea', level: 2 }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'First creator idea', level: 2 }),
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(
        vi
          .mocked(getViewerEngagement)
          .mock.calls.some(([ids]) => ids.includes(39) && ids.includes(40)),
      ).toBe(true)
    })
  })

  it('hydrates an existing Following state for authenticated readers', async () => {
    vi.mocked(getViewerCreatorFollowState).mockResolvedValue({
      items: [{ creator_id: 4, following: true, can_follow: true }],
    })

    renderPage('/creators/4', true)

    const button = await screen.findByRole('button', { name: 'Following' })
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(getViewerCreatorFollowState).toHaveBeenCalledWith([4])
  })

  it('shows ownership state instead of a follow button for the viewer own Creator profile', async () => {
    vi.mocked(getViewerCreatorFollowState).mockResolvedValue({
      items: [{ creator_id: 4, following: false, can_follow: false }],
    })

    renderPage('/creators/4', true)

    expect(await screen.findByText('Your creator profile')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Follow' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Following' })).not.toBeInTheDocument()
  })

  it('optimistically updates follower count and rolls back after a failed follow', async () => {
    let rejectFollow!: (error: Error) => void
    vi.mocked(setCreatorFollowed).mockReturnValue(
      new Promise<void>((_resolve, reject) => {
        rejectFollow = reject
      }),
    )

    renderPage('/creators/4', true)

    const button = await screen.findByRole('button', { name: 'Follow' })
    expect(screen.getByText('12')).toBeInTheDocument()

    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('13')).toBeInTheDocument()
    })
    expect(setCreatorFollowed).toHaveBeenCalledWith(4, true)

    rejectFollow(new Error('network failed'))

    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument()
    })
    expect(
      await screen.findByText(
        'Follow state could not be updated. Your previous state was restored.',
      ),
    ).toBeInTheDocument()
  })

  it('rejects an invalid creator route without making API requests', async () => {
    renderPage('/creators/not-a-number')

    expect(screen.getByRole('heading', { name: 'Creator not found' })).toBeInTheDocument()
    expect(getCreator).not.toHaveBeenCalled()
    expect(getCreatorIdeasPage).not.toHaveBeenCalled()
  })
})
