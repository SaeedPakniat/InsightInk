import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getRecommendations } from '../../api/recommendations'
import type { RecommendationItem } from '../../api/types'
import { changeUiLanguage } from '../../i18n'
import { PersonalizedFeed } from './PersonalizedFeed'

vi.mock('../../api/recommendations', () => ({
  getRecommendations: vi.fn(),
}))

function recommendation(id: number): RecommendationItem {
  return {
    idea: {
      id,
      language: id % 2 === 0 ? 'fa' : 'en',
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
    },
    score: 10 - id / 100,
    reason: 'Because it was published recently.',
  }
}

function renderFeed() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PersonalizedFeed />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PersonalizedFeed', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await changeUiLanguage('en')
  })

  afterEach(() => {
    cleanup()
  })

  it('renders the complete personalized set instead of a two-card preview', async () => {
    vi.mocked(getRecommendations).mockResolvedValue(
      Array.from({ length: 20 }, (_, index) => recommendation(index + 1)),
    )

    renderFeed()

    expect(await screen.findByRole('heading', { name: 'Idea 1' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Idea 20' })).toBeInTheDocument()
    expect(screen.getByText('20 recommendations')).toBeInTheDocument()
    expect(screen.getByText('That is your current personalized set.')).toBeInTheDocument()
  })

  it('shows an interest-oriented empty state when no recommendations exist', async () => {
    vi.mocked(getRecommendations).mockResolvedValue([])

    renderFeed()

    expect(await screen.findByText('Your personalized set is empty')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Edit interests' })).toHaveAttribute(
      'href',
      '/onboarding/interests',
    )
  })
})
