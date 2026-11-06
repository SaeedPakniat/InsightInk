import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { Idea } from '../../api/types'
import { changeUiLanguage } from '../../i18n'
import { SESSION_QUERY_KEY } from '../auth/session'
import { AVAILABLE_LANGUAGES_QUERY_KEY } from '../languages/languageQueries'
import { IdeaCard } from './IdeaCard'

const persianIdea: Idea = {
  id: 40,
  language: 'fa',
  title: 'برای سؤال بزرگ، یک زاویه دید کافی نیست',
  body: 'موضوع‌های پیچیده معمولاً با یک پاسخ کوتاه تمام نمی‌شوند.',
  estimated_read_seconds: 80,
  published_at: '2026-10-29T08:00:00Z',
  creator: {
    id: 4,
    display_name: 'Maya Chen',
    avatar: null,
    is_verified: false,
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

const englishIdea: Idea = {
  ...persianIdea,
  id: 39,
  language: 'en',
  title: 'Big questions improve when they are broken into perspectives',
  body: 'Questions about creativity, technology, health, or society rarely have one useful lens.',
  estimated_read_seconds: 70,
}

function renderCard(idea: Idea) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  queryClient.setQueryData(SESSION_QUERY_KEY, null)
  queryClient.setQueryData(AVAILABLE_LANGUAGES_QUERY_KEY, [
    { code: 'en', name_en: 'English', name_fa: 'انگلیسی', native_name: 'English' },
    { code: 'fa', name_en: 'Persian', name_fa: 'فارسی', native_name: 'فارسی' },
  ])

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <IdeaCard idea={idea} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('IdeaCard', () => {
  beforeEach(async () => {
    await changeUiLanguage('en')
  })

  afterEach(() => {
    cleanup()
  })

  it('keeps Persian idea content RTL inside an English UI shell', () => {
    renderCard(persianIdea)

    const title = screen.getByRole('heading', {
      name: 'برای سؤال بزرگ، یک زاویه دید کافی نیست',
    })
    const content = title.closest('.idea-card__content')

    expect(content).toHaveAttribute('lang', 'fa')
    expect(content).toHaveAttribute('dir', 'rtl')
    expect(screen.getByText('Podcast')).toBeInTheDocument()
    expect(screen.getByText('Persian')).toBeInTheDocument()
    expect(screen.getByText('2 min read')).toBeInTheDocument()
    expect(screen.getByText('Science')).toBeInTheDocument()
    expect(screen.getByText('Creativity')).toBeInTheDocument()
  })

  it('renders creator and original source as separate attribution concepts', () => {
    renderCard(persianIdea)

    expect(screen.getByText('Maya Chen')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open source: TED Radio Hour' })).toHaveAttribute(
      'href',
      'https://www.ted.com/podcasts/ted-radio-hour',
    )
    expect(screen.getByText('Manoush Zomorodi — TED')).toBeInTheDocument()
  })

  it('links both title and explicit read action to the public Idea detail route', () => {
    renderCard(persianIdea)

    expect(
      screen.getByRole('link', { name: 'برای سؤال بزرگ، یک زاویه دید کافی نیست' }),
    ).toHaveAttribute('href', '/ideas/40')
    expect(screen.getByRole('link', { name: /Read full idea/ })).toHaveAttribute(
      'href',
      '/ideas/40',
    )
  })

  it('uses Persian UI labels while keeping English idea content LTR', async () => {
    await changeUiLanguage('fa')

    renderCard(englishIdea)

    const title = screen.getByRole('heading', {
      name: 'Big questions improve when they are broken into perspectives',
    })
    const content = title.closest('.idea-card__content')

    expect(content).toHaveAttribute('lang', 'en')
    expect(content).toHaveAttribute('dir', 'ltr')
    expect(screen.getByText('پادکست')).toBeInTheDocument()
    expect(screen.getByText('انگلیسی')).toBeInTheDocument()
    expect(screen.getByText('۲ دقیقه مطالعه')).toBeInTheDocument()
    expect(screen.getByText('علم')).toBeInTheDocument()
  })

  it('does not expose private engagement controls on an anonymous card', () => {
    renderCard(englishIdea)

    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /spark/i })).not.toBeInTheDocument()
  })
})
