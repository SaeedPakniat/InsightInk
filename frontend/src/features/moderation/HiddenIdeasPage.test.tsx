import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getHiddenModerationIdeasPage, moderateIdeaDirectly } from '../../api/moderation'
import type { HiddenModerationIdea, HiddenModerationIdeaPage } from '../../api/types'
import { changeUiLanguage } from '../../i18n'
import { HiddenIdeasPage } from './HiddenIdeasPage'

vi.mock('../../api/moderation', async () => {
  const actual =
    await vi.importActual<typeof import('../../api/moderation')>('../../api/moderation')
  return {
    ...actual,
    getHiddenModerationIdeasPage: vi.fn(),
    moderateIdeaDirectly: vi.fn(),
  }
})

function hiddenIdea(
  id: number,
  overrides: Partial<HiddenModerationIdea> = {},
): HiddenModerationIdea {
  return {
    id,
    title: `Hidden idea ${id}`,
    body_excerpt: 'A bounded moderation excerpt.',
    language: 'en',
    status: 'hidden',
    creator: { id: 4, display_name: 'Creator Example' },
    source: { id: 7, type: 'article', title: 'Source Example' },
    published_at: '2026-11-01T08:00:00Z',
    updated_at: '2026-11-15T09:00:00Z',
    ...overrides,
  }
}

function renderPage(entry = '/moderation/ideas') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[entry]}>
          <HiddenIdeasPage />
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  }
}

describe('HiddenIdeasPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await changeUiLanguage('en')
  })

  afterEach(() => {
    cleanup()
  })

  it('renders the hidden-Idea workspace with returned safe metadata', async () => {
    vi.mocked(getHiddenModerationIdeasPage).mockResolvedValue({
      next: null,
      previous: null,
      results: [
        hiddenIdea(12, {
          title: 'Hidden systems note',
          body_excerpt: 'This is the excerpt returned by moderation.',
        }),
      ],
    })

    renderPage()

    expect(
      await screen.findByRole('heading', { name: 'Hidden Ideas', level: 1 }),
    ).toBeInTheDocument()
    expect(getHiddenModerationIdeasPage).toHaveBeenCalledWith(null)
    expect(screen.getByRole('link', { name: 'Reports' })).toHaveAttribute('href', '/moderation')
    expect(screen.getByRole('link', { name: 'Hidden Ideas' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(
      await screen.findByRole('heading', { name: 'Hidden systems note', level: 2 }),
    ).toBeInTheDocument()
    expect(screen.getByText('This is the excerpt returned by moderation.')).toBeInTheDocument()
    expect(screen.getByText('Creator Example')).toBeInTheDocument()
    expect(screen.getByText('Source Example')).toBeInTheDocument()
    expect(screen.getByText('EN')).toBeInTheDocument()
  })

  it('loads the next cursor page and de-duplicates Ideas', async () => {
    vi.mocked(getHiddenModerationIdeasPage).mockImplementation(
      async (cursor): Promise<HiddenModerationIdeaPage> =>
        cursor === 'second'
          ? {
              next: null,
              previous: 'previous',
              results: [hiddenIdea(2), hiddenIdea(1)],
            }
          : {
              next: 'http://localhost:8000/api/v1/moderation/ideas/?status=hidden&cursor=second',
              previous: null,
              results: [hiddenIdea(3), hiddenIdea(2)],
            },
    )

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Hidden idea 3' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Load more hidden Ideas' }))

    expect(await screen.findByRole('heading', { name: 'Hidden idea 1' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { name: 'Hidden idea 2' })).toHaveLength(1)
    expect(getHiddenModerationIdeasPage).toHaveBeenLastCalledWith('second')
  })

  it('restores a hidden Idea with an optional audit note and removes it after refetch', async () => {
    const pointer = userEvent.setup()
    let restored = false
    vi.mocked(getHiddenModerationIdeasPage).mockImplementation(async () => ({
      next: null,
      previous: null,
      results: restored ? [] : [hiddenIdea(25, { title: 'Restore candidate' })],
    }))
    vi.mocked(moderateIdeaDirectly).mockImplementation(async (ideaId, action, payload) => {
      expect(ideaId).toBe(25)
      expect(action).toBe('restore')
      expect(payload).toEqual({ note: 'Reviewed and safe.' })
      restored = true
      return { idea_id: ideaId, status: 'published', action: 'idea_restored' }
    })

    renderPage()

    await screen.findByRole('heading', { name: 'Restore candidate' })
    await pointer.click(screen.getByRole('button', { name: 'Restore Idea' }))

    expect(screen.getByText(/Restoring this Idea publishes it again/)).toBeInTheDocument()
    const note = screen.getByRole('textbox', { name: /Moderator note \(optional\)/ })
    await pointer.type(note, '  Reviewed and safe.  ')
    await pointer.click(screen.getByRole('button', { name: 'Restore Idea' }))

    await waitFor(() => expect(moderateIdeaDirectly).toHaveBeenCalledTimes(1))
    expect(await screen.findByRole('status')).toHaveTextContent(
      '“Restore candidate” was restored and is public again.',
    )
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Restore candidate' })).not.toBeInTheDocument(),
    )
    expect(screen.getByText('No hidden Ideas')).toBeInTheDocument()
  })

  it('keeps the card available and exposes localized failure feedback when restore fails', async () => {
    const pointer = userEvent.setup()
    vi.mocked(getHiddenModerationIdeasPage).mockResolvedValue({
      next: null,
      previous: null,
      results: [hiddenIdea(31)],
    })
    vi.mocked(moderateIdeaDirectly).mockRejectedValue(new Error('restore failed'))

    renderPage()

    await screen.findByRole('heading', { name: 'Hidden idea 31' })
    await pointer.click(screen.getByRole('button', { name: 'Restore Idea' }))
    await pointer.click(screen.getByRole('button', { name: 'Restore Idea' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The Idea moderation action could not be completed.',
    )
    expect(screen.getByRole('heading', { name: 'Hidden idea 31' })).toBeInTheDocument()
  })

  it('renders a retryable load error and an empty workspace', async () => {
    vi.mocked(getHiddenModerationIdeasPage)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ next: null, previous: null, results: [] })

    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Hidden Ideas could not be loaded')
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('No hidden Ideas')).toBeInTheDocument()
  })

  it('renders Persian workspace semantics in RTL', async () => {
    await changeUiLanguage('fa')
    vi.mocked(getHiddenModerationIdeasPage).mockResolvedValue({
      next: null,
      previous: null,
      results: [
        hiddenIdea(40, {
          title: 'ایده پنهان',
          body_excerpt: 'این متن کوتاه برای بررسی مدیریت است.',
          language: 'fa',
          creator: { id: 4, display_name: 'سازنده نمونه' },
          source: { id: 7, type: 'article', title: 'منبع نمونه' },
        }),
      ],
    })

    renderPage()

    expect(document.documentElement).toHaveAttribute('dir', 'rtl')
    expect(
      await screen.findByRole('heading', { name: 'ایده‌های پنهان‌شده', level: 1 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'گزارش‌ها' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'بازگرداندن ایده' })).toBeInTheDocument()
  })
})
