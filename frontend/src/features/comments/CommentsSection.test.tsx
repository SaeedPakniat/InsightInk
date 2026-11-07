import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createIdeaComment, deleteComment, getIdeaComments } from '../../api/comments'
import type { CurrentUser, IdeaComment } from '../../api/types'
import { changeUiLanguage } from '../../i18n'
import { SESSION_QUERY_KEY } from '../auth/session'
import { CommentsSection } from './CommentsSection'

vi.mock('../../api/comments', () => ({
  getIdeaComments: vi.fn(),
  createIdeaComment: vi.fn(),
  deleteComment: vi.fn(),
}))

const user: CurrentUser = {
  id: 1,
  email: 'reader@example.com',
  display_name: 'Reader',
  preferred_ui_language: 'en',
}

const comments: IdeaComment[] = [
  {
    id: 10,
    author: { id: 1, display_name: 'Reader' },
    body: 'My existing thought',
    created_at: '2026-11-06T10:00:00Z',
    updated_at: '2026-11-06T10:00:00Z',
  },
  {
    id: 11,
    author: { id: 2, display_name: 'Other Reader' },
    body: 'این یک نظر فارسی است.',
    created_at: '2026-11-06T10:05:00Z',
    updated_at: '2026-11-06T10:05:00Z',
  },
]

function renderSection(authenticated: boolean) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  queryClient.setQueryData(SESSION_QUERY_KEY, authenticated ? user : null)

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/ideas/40']}>
          <CommentsSection ideaId={40} />
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  }
}

describe('CommentsSection', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await changeUiLanguage('en')
    vi.mocked(getIdeaComments).mockResolvedValue(comments)
  })

  afterEach(() => {
    cleanup()
  })

  it('lets anonymous readers read comments but not post or delete', async () => {
    renderSection(false)

    expect(await screen.findByText('My existing thought')).toBeInTheDocument()
    expect(screen.getByText('این یک نظر فارسی است.')).toHaveAttribute('dir', 'rtl')
    expect(screen.getByRole('link', { name: 'Sign in to comment' })).toHaveAttribute(
      'href',
      '/login',
    )
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Report' })).toHaveLength(2)
  })

  it('shows delete controls only on the current user comment and requires confirmation', async () => {
    vi.mocked(deleteComment).mockResolvedValue()

    renderSection(true)

    expect(await screen.findByText('My existing thought')).toBeInTheDocument()

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
    expect(deleteButtons).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'Report' })).toHaveLength(1)

    fireEvent.click(deleteButtons[0])

    expect(screen.getByRole('button', { name: 'Confirm delete' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }))

    await waitFor(() => {
      expect(deleteComment).toHaveBeenCalledWith(10)
    })
    expect(screen.queryByText('My existing thought')).not.toBeInTheDocument()
    expect(screen.getByText('این یک نظر فارسی است.')).toBeInTheDocument()
  })

  it('shows a newly submitted comment optimistically before POST resolves', async () => {
    let resolveCreate!: (comment: IdeaComment) => void
    vi.mocked(createIdeaComment).mockReturnValue(
      new Promise<IdeaComment>((resolve) => {
        resolveCreate = resolve
      }),
    )

    renderSection(true)

    await screen.findByText('My existing thought')
    const textarea = screen.getByRole('textbox', { name: 'Your thought' })
    fireEvent.change(textarea, { target: { value: 'A fresh useful angle' } })
    fireEvent.click(screen.getByRole('button', { name: 'Post comment' }))

    await waitFor(() => {
      expect(
        screen.getByText('A fresh useful angle', { selector: '.comment-item__body' }),
      ).toBeInTheDocument()
    })
    expect(
      screen
        .getAllByText('Posting…')
        .some((element) => element.closest('.comment-item--optimistic')),
    ).toBe(true)
    expect(textarea).toHaveValue('')

    resolveCreate({
      id: 12,
      author: { id: 1, display_name: 'Reader' },
      body: 'A fresh useful angle',
      created_at: '2026-11-06T10:10:00Z',
      updated_at: '2026-11-06T10:10:00Z',
    })

    await waitFor(() => {
      expect(screen.queryByText('Posting…')).not.toBeInTheDocument()
    })
    expect(screen.getByText('A fresh useful angle')).toBeInTheDocument()
  })

  it('restores the draft and removes the optimistic comment when POST fails', async () => {
    vi.mocked(createIdeaComment).mockRejectedValue(new Error('network'))

    renderSection(true)

    await screen.findByText('My existing thought')
    const textarea = screen.getByRole('textbox', { name: 'Your thought' })
    fireEvent.change(textarea, { target: { value: 'Please restore this draft' } })
    fireEvent.click(screen.getByRole('button', { name: 'Post comment' }))

    await waitFor(() => {
      expect(textarea).toHaveValue('Please restore this draft')
    })
    expect(
      screen.queryByText('Please restore this draft', { selector: '.comment-item__body' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByText('Your comment could not be posted. Your draft was restored.'),
    ).toBeInTheDocument()
  })
})
