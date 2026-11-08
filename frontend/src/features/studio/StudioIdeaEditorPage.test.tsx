import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getTopics } from '../../api/interests'
import { getLanguages } from '../../api/languages'
import {
  createMyIdea,
  createMySource,
  getMyCreatorProfile,
  getMyIdea,
  getSources,
  updateMyIdea,
} from '../../api/studio'
import type { ContentLanguage, CreatorIdea, CreatorSelf, IdeaSource, Topic } from '../../api/types'
import { changeUiLanguage } from '../../i18n'
import { StudioIdeaEditorPage } from './StudioIdeaEditorPage'

vi.mock('../../api/languages', () => ({
  getLanguages: vi.fn(),
  getCurrentContentLanguages: vi.fn(),
  updateContentLanguages: vi.fn(),
}))

vi.mock('../../api/interests', () => ({
  getTopics: vi.fn(),
  getCurrentInterests: vi.fn(),
  updateInterests: vi.fn(),
}))

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
  bio_en: '',
  avatar: '',
  is_verified: false,
  created_at: '2026-11-07T08:00:00Z',
}

const languages: ContentLanguage[] = [
  {
    code: 'en',
    name_en: 'English',
    name_fa: 'انگلیسی',
    native_name: 'English',
  },
  {
    code: 'fa',
    name_en: 'Persian',
    name_fa: 'فارسی',
    native_name: 'فارسی',
  },
]

const topics: Topic[] = [
  { id: 1, slug: 'technology', name_en: 'Technology', name_fa: 'فناوری' },
  { id: 2, slug: 'philosophy', name_en: 'Philosophy', name_fa: 'فلسفه' },
]

const sources: IdeaSource[] = [
  {
    id: 1,
    type: 'book',
    title: 'Meditations',
    original_creator_text: 'Marcus Aurelius',
    language: 'en',
    external_url: '',
    cover: '',
  },
  {
    id: 2,
    type: 'podcast',
    title: 'Hidden Brain',
    original_creator_text: 'Hidden Brain Media',
    language: 'en',
    external_url: '',
    cover: '',
  },
]

function draft(status: CreatorIdea['status'] = 'draft'): CreatorIdea {
  return {
    id: 10,
    language: 'en',
    title: 'Existing draft',
    body: 'Existing body',
    estimated_read_seconds: 90,
    status,
    published_at: status === 'published' ? '2026-11-07T09:00:00Z' : null,
    created_at: '2026-11-07T08:00:00Z',
    updated_at: '2026-11-07T08:30:00Z',
    source: 1,
    topics: [1],
  }
}

function renderEditor(entry: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/studio/ideas/new" element={<StudioIdeaEditorPage />} />
          <Route path="/studio/ideas/:ideaId/edit" element={<StudioIdeaEditorPage />} />
          <Route path="/studio" element={<div>Studio home</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('StudioIdeaEditorPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await changeUiLanguage('en')
    vi.mocked(getMyCreatorProfile).mockResolvedValue(profile)
    vi.mocked(getLanguages).mockResolvedValue(languages)
    vi.mocked(getTopics).mockResolvedValue(topics)
    vi.mocked(getSources).mockResolvedValue(sources)
  })

  afterEach(() => {
    cleanup()
  })

  it('creates a private draft from the backend catalogs and never sends lifecycle fields', async () => {
    const saved = draft()
    vi.mocked(createMyIdea).mockResolvedValue(saved)

    renderEditor('/studio/ideas/new')

    expect(await screen.findByRole('heading', { name: 'Create a new Idea' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: '  A useful distinction  ' },
    })
    fireEvent.change(screen.getByLabelText('Idea body'), {
      target: { value: '  The useful body.  ' },
    })
    fireEvent.change(screen.getByLabelText('Estimated reading time (seconds)'), {
      target: { value: '75' },
    })
    fireEvent.change(screen.getByLabelText('Source'), {
      target: { value: '2' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Philosophy/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))

    await waitFor(() => {
      expect(createMyIdea).toHaveBeenCalledWith({
        language: 'en',
        title: 'A useful distinction',
        body: 'The useful body.',
        estimated_read_seconds: 75,
        source: 2,
        topics: [2],
      })
    })

    const payload = vi.mocked(createMyIdea).mock.calls[0]?.[0]
    expect(payload).not.toHaveProperty('status')
    expect(payload).not.toHaveProperty('published_at')
    expect(await screen.findByText('Studio home')).toBeInTheDocument()
  })

  it('creates a custom Source inline and auto-selects it for the draft', async () => {
    const customSource: IdeaSource = {
      id: 91,
      type: 'website',
      title: 'The Bitter Lesson',
      original_creator_text: 'Rich Sutton',
      language: 'en',
      external_url: 'http://www.incompleteideas.net/IncIdeas/BitterLesson.html',
      cover: '',
    }
    const saved = {
      ...draft(),
      source: 91,
      title: 'Custom source draft',
    }
    vi.mocked(createMySource).mockResolvedValue(customSource)
    vi.mocked(createMyIdea).mockResolvedValue(saved)

    renderEditor('/studio/ideas/new')

    fireEvent.click(await screen.findByRole('button', { name: 'Add custom source' }))
    fireEvent.change(screen.getByLabelText('Source title'), {
      target: { value: 'The Bitter Lesson' },
    })
    fireEvent.change(screen.getByLabelText('Author / creator / publisher (optional)'), {
      target: { value: 'Rich Sutton' },
    })
    fireEvent.change(screen.getByLabelText('Original URL (optional)'), {
      target: {
        value: 'http://www.incompleteideas.net/IncIdeas/BitterLesson.html',
      },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create and select source' }))

    await waitFor(() => {
      expect(createMySource).toHaveBeenCalledWith({
        type: 'website',
        title: 'The Bitter Lesson',
        original_creator_text: 'Rich Sutton',
        language: 'en',
        external_url: 'http://www.incompleteideas.net/IncIdeas/BitterLesson.html',
      })
    })

    expect(screen.getByLabelText('Source')).toHaveValue('91')

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Custom source draft' },
    })
    fireEvent.change(screen.getByLabelText('Idea body'), {
      target: { value: 'Body using a custom source.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))

    await waitFor(() => {
      expect(createMyIdea).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 91,
        }),
      )
    })
  })

  it('loads an owned draft for editing and persists changed draft fields', async () => {
    const existing = draft()
    vi.mocked(getMyIdea).mockResolvedValue(existing)
    vi.mocked(updateMyIdea).mockResolvedValue({
      ...existing,
      title: 'Edited draft',
    })

    renderEditor('/studio/ideas/10/edit')

    expect(await screen.findByRole('heading', { name: 'Edit draft' })).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveValue('Existing draft')
    expect(screen.getByRole('button', { name: /Technology/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Edited draft' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(updateMyIdea).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          title: 'Edited draft',
          language: 'en',
          source: 1,
          topics: [1],
        }),
      )
    })
  })

  it('keeps published Ideas read-only instead of rendering an editable form', async () => {
    vi.mocked(getMyIdea).mockResolvedValue(draft('published'))

    renderEditor('/studio/ideas/10/edit')

    expect(
      await screen.findByRole('heading', { name: 'This Idea is read-only' }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View public Idea' })).toHaveAttribute(
      'href',
      '/ideas/10',
    )
  })

  it('blocks draft creation when a required Creator catalog is empty', async () => {
    vi.mocked(getSources).mockResolvedValue([])

    renderEditor('/studio/ideas/new')

    expect(
      await screen.findByRole('heading', {
        name: 'Creator catalog unavailable',
      }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save draft' })).not.toBeInTheDocument()
  })

  it('requires CreatorProfile before the private editor becomes available', async () => {
    vi.mocked(getMyCreatorProfile).mockResolvedValue(null)

    renderEditor('/studio/ideas/new')

    expect(
      await screen.findByRole('heading', { name: 'Creator profile required' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Set up Creator profile' })).toHaveAttribute(
      'href',
      '/studio',
    )
    expect(createMyIdea).not.toHaveBeenCalled()
  })
})
