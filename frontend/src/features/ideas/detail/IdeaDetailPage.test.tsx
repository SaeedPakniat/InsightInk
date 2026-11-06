import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../../api/client'
import { getIdea } from '../../../api/ideas'
import type { Idea } from '../../../api/types'
import { changeUiLanguage } from '../../../i18n'
import { IdeaDetailPage } from './IdeaDetailPage'

vi.mock('../../../api/ideas', () => ({
  getIdea: vi.fn(),
}))

const idea: Idea = {
  id: 40,
  language: 'fa',
  title: 'برای سؤال بزرگ، یک زاویه دید کافی نیست',
  body: 'موضوع‌های پیچیده معمولاً با یک پاسخ کوتاه تمام نمی‌شوند. کنار هم گذاشتن دیدگاه‌های مختلف کمک می‌کند تفاوت‌ها را پاک نکنیم.',
  estimated_read_seconds: 80,
  published_at: '2026-10-29T08:00:00Z',
  creator: {
    id: 4,
    display_name: 'Maya Chen',
    avatar: null,
    is_verified: true,
  },
  source: {
    id: 20,
    type: 'podcast',
    title: 'TED Radio Hour',
    original_creator_text: 'Manoush Zomorodi — TED',
    language: 'en',
    external_url: 'https://www.ted.com/podcasts/ted-radio-hour',
    cover: '',
  },
  topics: [
    { id: 5, slug: 'science', name_fa: 'علم', name_en: 'Science' },
    { id: 10, slug: 'creativity', name_fa: 'خلاقیت', name_en: 'Creativity' },
  ],
}

function renderDetail(entry = '/ideas/40') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/ideas/:ideaId" element={<IdeaDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('IdeaDetailPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await changeUiLanguage('en')
  })

  afterEach(() => {
    cleanup()
  })

  it('renders the complete Persian Idea as RTL while keeping UI metadata localized', async () => {
    vi.mocked(getIdea).mockResolvedValue(idea)

    renderDetail()

    const title = await screen.findByRole('heading', {
      name: 'برای سؤال بزرگ، یک زاویه دید کافی نیست',
    })
    const heading = title.closest('.idea-detail-page__heading')
    const body = screen
      .getByText(/موضوع‌های پیچیده معمولاً با یک پاسخ کوتاه/)
      .closest('.idea-detail-page__body')

    expect(heading).toHaveAttribute('lang', 'fa')
    expect(heading).toHaveAttribute('dir', 'rtl')
    expect(body).toHaveAttribute('lang', 'fa')
    expect(body).toHaveAttribute('dir', 'rtl')
    expect(screen.getByText('Podcast')).toBeInTheDocument()
    expect(screen.getByText('2 min read')).toBeInTheDocument()
    expect(screen.getByText('Science')).toBeInTheDocument()
    expect(screen.getByText('Creativity')).toBeInTheDocument()
    expect(screen.getByText('Maya Chen')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open original source' })).toHaveAttribute(
      'href',
      'https://www.ted.com/podcasts/ted-radio-hour',
    )
  })

  it('turns a backend 404 into the public unavailable-Idea state', async () => {
    vi.mocked(getIdea).mockRejectedValue(new ApiError(404, { detail: 'Not found.' }))

    renderDetail('/ideas/9999')

    expect(await screen.findByText('This idea is not available')).toBeInTheDocument()
    expect(
      screen.getByText('It may not exist, may not be published, or may no longer be public.'),
    ).toBeInTheDocument()
  })

  it('rejects an invalid route id without requesting the API', async () => {
    renderDetail('/ideas/not-a-number')

    expect(await screen.findByText('This idea is not available')).toBeInTheDocument()
    expect(getIdea).not.toHaveBeenCalled()
  })
})
