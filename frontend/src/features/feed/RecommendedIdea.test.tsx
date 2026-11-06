import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { RecommendationItem } from '../../api/types'
import { changeUiLanguage } from '../../i18n'
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

describe('RecommendedIdea', () => {
  beforeEach(async () => {
    await changeUiLanguage('en')
  })

  afterEach(() => {
    cleanup()
  })

  it('renders the transparent recommendation reason without exposing internal score', () => {
    render(<RecommendedIdea item={baseItem} />)

    const reason = screen
      .getByText('Because you selected Science.')
      .closest('.recommended-idea__reason')

    expect(reason).toHaveAttribute('lang', 'en')
    expect(reason).toHaveAttribute('dir', 'ltr')
    expect(screen.queryByText('5.4321')).not.toBeInTheDocument()
  })

  it('renders a Persian backend reason RTL even inside an English UI', () => {
    render(
      <RecommendedIdea
        item={{
          ...baseItem,
          reason: 'چون موضوع «علم» را انتخاب کرده‌اید.',
        }}
      />,
    )

    const reason = screen
      .getByText('چون موضوع «علم» را انتخاب کرده‌اید.')
      .closest('.recommended-idea__reason')

    expect(reason).toHaveAttribute('lang', 'fa')
    expect(reason).toHaveAttribute('dir', 'rtl')
  })
})
