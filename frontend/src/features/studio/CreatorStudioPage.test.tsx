import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createMyCreatorProfile,
  deleteMyIdea,
  getMyCreatorProfile,
  getMyIdeas,
  getSources,
  publishMyIdea,
  updateMyCreatorProfile,
  withdrawMyIdea,
} from '../../api/studio'
import type { CreatorIdea, CreatorSelf, IdeaSource } from '../../api/types'
import { changeUiLanguage } from '../../i18n'
import { CreatorStudioPage } from './CreatorStudioPage'

vi.mock('../../api/studio', () => ({
  getMyCreatorProfile: vi.fn(),
  createMyCreatorProfile: vi.fn(),
  updateMyCreatorProfile: vi.fn(),
  getSources: vi.fn(),
  createMySource: vi.fn(),
  getMyIdeas: vi.fn(),
  getMyIdea: vi.fn(),
  createMyIdea: vi.fn(),
  updateMyIdea: vi.fn(),
  deleteMyIdea: vi.fn(),
  publishMyIdea: vi.fn(),
  withdrawMyIdea: vi.fn(),
}))

const profile: CreatorSelf = {
  id: 4,
  user_id: 8,
  bio_fa: '',
  bio_en: 'Systems and culture.',
  avatar: '',
  is_verified: false,
  created_at: '2026-11-07T08:00:00Z',
}

const source: IdeaSource = {
  id: 1,
  type: 'book',
  title: 'Meditations',
  original_creator_text: 'Marcus Aurelius',
  language: 'en',
  external_url: '',
  cover: '',
}

function idea(id: number, status: CreatorIdea['status'], title: string): CreatorIdea {
  return {
    id,
    language: 'en',
    title,
    body: 'Body',
    estimated_read_seconds: 60,
    status,
    published_at: status === 'published' ? '2026-11-07T09:00:00Z' : null,
    created_at: '2026-11-07T08:00:00Z',
    updated_at: '2026-11-07T09:00:00Z',
    source: 1,
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

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/studio']}>
        <CreatorStudioPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CreatorStudioPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await changeUiLanguage('en')
    vi.mocked(getSources).mockResolvedValue([source])
    vi.mocked(updateMyCreatorProfile).mockResolvedValue(profile)
    vi.mocked(deleteMyIdea).mockResolvedValue()
  })

  afterEach(() => {
    cleanup()
  })

  it('lets a Reader create the CreatorProfile that unlocks Studio', async () => {
    vi.mocked(getMyCreatorProfile).mockResolvedValue(null)
    vi.mocked(getMyIdeas).mockResolvedValue([])
    vi.mocked(createMyCreatorProfile).mockResolvedValue(profile)

    renderPage()

    expect(
      await screen.findByRole('heading', {
        name: 'Create your Creator profile',
      }),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('English biography'), {
      target: { value: 'Systems and culture.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create Creator profile' }))

    await waitFor(() => {
      expect(createMyCreatorProfile).toHaveBeenCalledWith({
        bio_fa: '',
        bio_en: 'Systems and culture.',
      })
    })

    expect(await screen.findByRole('heading', { name: 'Creator Studio' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create your first draft' })).toHaveAttribute(
      'href',
      '/studio/ideas/new',
    )
  })

  it('shows draft, published and hidden lifecycle states with only legal actions', async () => {
    vi.mocked(getMyCreatorProfile).mockResolvedValue(profile)
    vi.mocked(getMyIdeas).mockResolvedValue([
      idea(4, 'withdrawn', 'Withdrawn idea'),
      idea(3, 'hidden', 'Hidden idea'),
      idea(2, 'published', 'Published idea'),
      idea(1, 'draft', 'Draft idea'),
    ])

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Creator Studio' })).toBeInTheDocument()
    expect(screen.getByText('Draft idea')).toBeInTheDocument()
    expect(screen.getByText('Published idea')).toBeInTheDocument()
    expect(screen.getByText('Hidden idea')).toBeInTheDocument()
    expect(screen.getByText('Withdrawn idea')).toBeInTheDocument()

    expect(screen.getByRole('link', { name: 'Edit draft' })).toHaveAttribute(
      'href',
      '/studio/ideas/1/edit',
    )
    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View public Idea' })).toHaveAttribute(
      'href',
      '/ideas/2',
    )
    expect(
      screen.getByText('This Idea was hidden by moderation and is read-only in Creator Studio.'),
    ).toBeInTheDocument()
  })

  it('deletes a draft only after explicit confirmation', async () => {
    const draft = idea(1, 'draft', 'Draft idea')
    vi.mocked(getMyCreatorProfile).mockResolvedValue(profile)
    vi.mocked(getMyIdeas).mockResolvedValue([draft])

    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Delete draft' }))

    expect(
      screen.getByText('This permanently removes the private draft. This action cannot be undone.'),
    ).toBeInTheDocument()
    expect(deleteMyIdea).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Delete draft' }))

    await waitFor(() => {
      expect(deleteMyIdea).toHaveBeenCalledWith(1)
    })
    expect(screen.queryByText('Draft idea')).not.toBeInTheDocument()
  })

  it('withdraws a published Idea only after explicit confirmation', async () => {
    const published = {
      ...idea(2, 'published', 'Published idea'),
      published_at: '2026-11-07T09:00:00Z',
    }
    const withdrawn = {
      ...published,
      status: 'withdrawn' as const,
      updated_at: '2026-11-07T11:00:00Z',
    }
    vi.mocked(getMyCreatorProfile).mockResolvedValue(profile)
    vi.mocked(getMyIdeas).mockResolvedValue([published])
    vi.mocked(withdrawMyIdea).mockResolvedValue(withdrawn)

    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Withdraw from public' }))

    expect(
      screen.getByText(
        'This removes the Idea from public detail, feeds, search, recommendations, and your public Creator page while preserving its history. Republish is not available in the current lifecycle.',
      ),
    ).toBeInTheDocument()
    expect(withdrawMyIdea).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Withdraw Idea' }))

    await waitFor(() => {
      expect(withdrawMyIdea).toHaveBeenCalledWith(2)
    })

    expect(
      await screen.findByText(
        'You withdrew this Idea from public discovery. Its history is preserved and it remains read-only.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'View public Idea' })).not.toBeInTheDocument()
  })

  it('publishes only after explicit confirmation and updates the private history', async () => {
    const draft = idea(1, 'draft', 'Draft idea')
    const published = {
      ...draft,
      status: 'published' as const,
      published_at: '2026-11-07T10:00:00Z',
    }
    vi.mocked(getMyCreatorProfile).mockResolvedValue(profile)
    vi.mocked(getMyIdeas).mockResolvedValue([draft])
    vi.mocked(publishMyIdea).mockResolvedValue(published)

    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Publish' }))

    expect(
      screen.getByText(
        'Publishing makes this Idea public immediately. You cannot edit or delete it afterward, but you can later withdraw it from public discovery while preserving its history.',
      ),
    ).toBeInTheDocument()
    expect(publishMyIdea).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Publish now' }))

    await waitFor(() => {
      expect(publishMyIdea).toHaveBeenCalledWith(1)
    })

    expect(await screen.findByRole('link', { name: 'View public Idea' })).toHaveAttribute(
      'href',
      '/ideas/1',
    )
    expect(screen.queryByRole('link', { name: 'Edit draft' })).not.toBeInTheDocument()
  })
})
