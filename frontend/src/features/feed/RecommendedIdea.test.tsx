import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { RecommendationItem } from '../../api/types'
import { changeUiLanguage } from '../../i18n'
import { AVAILABLE_LANGUAGES_QUERY_KEY } from '../languages/languageQueries'
import { RecommendedIdea } from './RecommendedIdea'

const baseItem: RecommendationItem = {
  idea: {
    id: 1,
    language: 'en',
    title: 'A useful idea',
    body: 'A short useful body.',
    estimated_read_seconds: 60,
    published_at: '2026-11-01T08:00:00Z',
    creator: {
      id: 1,
      display_name: 'Creator One',
      avatar: null,
      is_verified: false,
    },
    source: {
      id: 1,
      type: 'book',
      title: 'Source Book',
      original_creator_text: 'Original Author',
      language: 'en',
      external_url: '',
      cover: '',
    },
    topics: [{ id: 1, slug: 'science', name_fa: 'علم', name_en: 'Science' }],
  },
  score: 5.4321,
  reason: 'Because you selected Science.',
}

function renderRecommended(item: RecommendationItem) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  queryClient.setQueryData(AVAILABLE_LANGUAGES_QUERY_KEY, [
    { code: 'en', name_en: 'English', name_fa: 'انگلیسی', native_name: 'English' },
  ])

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <RecommendedIdea item={item} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('RecommendedIdea', () => {
  beforeEach(async () => {
    await changeUiLanguage('en')
  })

  afterEach(() => {
    cleanup()
  })

  it('renders the transparent recommendation reason without exposing internal score', () => {
    renderRecommended(baseItem)

    const reason = screen
      .getByText('Because you selected Science.')
      .closest('.recommended-idea__reason')

    expect(reason).toHaveAttribute('lang', 'en')
    expect(reason).toHaveAttribute('dir', 'ltr')
    expect(screen.queryByText('5.4321')).not.toBeInTheDocument()
  })

  it('renders a Persian backend reason RTL even inside an English UI', () => {
    renderRecommended({
      ...baseItem,
      reason: 'چون موضوع «علم» را انتخاب کرده‌اید.',
    })

    const reason = screen
      .getByText('چون موضوع «علم» را انتخاب کرده‌اید.')
      .closest('.recommended-idea__reason')

    expect(reason).toHaveAttribute('lang', 'fa')
    expect(reason).toHaveAttribute('dir', 'rtl')
  })
})
