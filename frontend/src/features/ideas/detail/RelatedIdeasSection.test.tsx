import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getViewerEngagement } from '../../../api/engagement'
import { getRelatedIdeas } from '../../../api/recommendations'
import type { CurrentUser, Idea, RelatedIdeaItem } from '../../../api/types'
import { changeUiLanguage } from '../../../i18n'
import { SESSION_QUERY_KEY } from '../../auth/session'
import { AVAILABLE_LANGUAGES_QUERY_KEY } from '../../languages/languageQueries'
import { RelatedIdeasSection } from './RelatedIdeasSection'

vi.mock('../../../api/recommendations', () => ({
  getRelatedIdeas: vi.fn(),
  getRecommendations: vi.fn(),
}))

vi.mock('../../../api/engagement', () => ({
  getViewerEngagement: vi.fn(),
  setSaved: vi.fn(),
  setSparked: vi.fn(),
}))

const relatedIdea: Idea = {
  id: 41,
  language: 'en',
  title: 'A useful adjacent idea',
  body: 'A related perspective connected through a shared topic.',
  estimated_read_seconds: 70,
  published_at: '2026-11-10T08:00:00Z',
  creator: {
    id: 5,
    display_name: 'Related Creator',
    avatar: null,
    is_verified: false,
  },
  source: {
    id: 21,
    type: 'book',
    title: 'Related Source',
    original_creator_text: 'Source Author',
    language: 'en',
    external_url: '',
    cover: '',
  },
  topics: [{ id: 5, slug: 'science', name_fa: 'علم', name_en: 'Science' }],
}

const relatedItem: RelatedIdeaItem = {
  idea: relatedIdea,
  score: 1.25,
  similarity: 0.5,
  reason: 'Shared topic: Science. This time in a different format.',
}

const authenticatedUser: CurrentUser = {
  id: 9,
  email: 'reader@example.com',
  display_name: 'Reader',
  preferred_ui_language: 'en',
  avatar_url: null,
  capabilities: {
    can_moderate: false,
    can_administer: false,
  },
}

function renderSection(session: CurrentUser | null = null) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  queryClient.setQueryData(SESSION_QUERY_KEY, session)
  queryClient.setQueryData(AVAILABLE_LANGUAGES_QUERY_KEY, [
    { code: 'en', name_en: 'English', name_fa: 'انگلیسی', native_name: 'English' },
    { code: 'fa', name_en: 'Persian', name_fa: 'فارسی', native_name: 'فارسی' },
  ])

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <RelatedIdeasSection ideaId={40} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('RelatedIdeasSection', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.mocked(getViewerEngagement).mockResolvedValue({ items: [] })
    await changeUiLanguage('en')
  })

  afterEach(() => {
    cleanup()
  })

  it('renders public related Ideas and their deterministic explanation', async () => {
    vi.mocked(getRelatedIdeas).mockResolvedValue([relatedItem])

    renderSection()

    expect(await screen.findByRole('heading', { name: 'Related Ideas' })).toBeInTheDocument()
    expect(getRelatedIdeas).toHaveBeenCalledWith(40)
    expect(
      await screen.findByRole('heading', { name: 'A useful adjacent idea' }),
    ).toBeInTheDocument()
    expect(
      screen
        .getByText('Shared topic: Science. This time in a different format.')
        .closest('.recommended-idea__reason'),
    ).toHaveAttribute('dir', 'ltr')
    expect(screen.getByRole('link', { name: 'A useful adjacent idea' })).toHaveAttribute(
      'href',
      '/ideas/41',
    )
    expect(getViewerEngagement).not.toHaveBeenCalled()
  })

  it('hydrates engagement only for authenticated viewers', async () => {
    vi.mocked(getRelatedIdeas).mockResolvedValue([relatedItem])
    vi.mocked(getViewerEngagement).mockResolvedValue({
      items: [{ idea_id: 41, sparked: true, saved: false }],
    })

    renderSection(authenticatedUser)

    await screen.findByRole('heading', { name: 'A useful adjacent idea' })

    await waitFor(() => {
      expect(getViewerEngagement).toHaveBeenCalledWith([41])
    })
  })

  it('renders an explicit empty state', async () => {
    vi.mocked(getRelatedIdeas).mockResolvedValue([])

    renderSection()

    expect(await screen.findByText('No related Ideas yet')).toBeInTheDocument()
    expect(
      screen.getByText('There are no other public Ideas with enough topic overlap right now.'),
    ).toBeInTheDocument()
  })

  it('renders a retryable error state', async () => {
    vi.mocked(getRelatedIdeas)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce([relatedItem])

    renderSection()

    expect(await screen.findByRole('alert')).toHaveTextContent('Related Ideas could not be loaded')
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(
      await screen.findByRole('heading', { name: 'A useful adjacent idea' }),
    ).toBeInTheDocument()
    expect(getRelatedIdeas).toHaveBeenCalledTimes(2)
  })

  it('preserves Persian reason direction in an English UI', async () => {
    vi.mocked(getRelatedIdeas).mockResolvedValue([
      {
        ...relatedItem,
        idea: {
          ...relatedIdea,
          id: 42,
          language: 'fa',
          title: 'ایده مرتبط',
          body: 'یک زاویه مرتبط دیگر.',
        },
        reason: 'موضوع مشترک: «علم».',
      },
    ])

    renderSection()

    const reason = await screen.findByText('موضوع مشترک: «علم».')
    expect(reason.closest('.recommended-idea__reason')).toHaveAttribute('lang', 'fa')
    expect(reason.closest('.recommended-idea__reason')).toHaveAttribute('dir', 'rtl')
  })

  it('localizes the section chrome in Persian RTL', async () => {
    await changeUiLanguage('fa')
    vi.mocked(getRelatedIdeas).mockResolvedValue([])

    renderSection()

    expect(document.documentElement).toHaveAttribute('dir', 'rtl')
    expect(await screen.findByRole('heading', { name: 'ایده‌های مرتبط' })).toBeInTheDocument()
    expect(await screen.findByText('هنوز ایدهٔ مرتبطی وجود ندارد')).toBeInTheDocument()
  })
})
