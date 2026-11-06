import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getCurrentInterests, getTopics, updateInterests } from '../../api/interests'
import type { Topic } from '../../api/types'
import { changeUiLanguage } from '../../i18n'
import { InterestsOnboardingPage } from './InterestsOnboardingPage'

vi.mock('../../api/interests', () => ({
  getTopics: vi.fn(),
  getCurrentInterests: vi.fn(),
  updateInterests: vi.fn(),
}))

const technology: Topic = {
  id: 1,
  slug: 'technology',
  name_fa: 'فناوری',
  name_en: 'Technology',
}

const science: Topic = {
  id: 2,
  slug: 'science',
  name_fa: 'علم',
  name_en: 'Science',
}

function renderPage(entry = '/onboarding/interests') {
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
          <Route path="/onboarding/interests" element={<InterestsOnboardingPage />} />
          <Route path="/onboarding/languages" element={<div>Languages destination</div>} />
          <Route path="/app" element={<div>App destination</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('InterestsOnboardingPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await changeUiLanguage('en')
  })

  afterEach(() => {
    cleanup()
  })

  it('loads topics, preserves saved interests, saves a new selection, and returns to the app', async () => {
    vi.mocked(getTopics).mockResolvedValue([technology, science])
    vi.mocked(getCurrentInterests).mockResolvedValue({ topics: [science] })
    vi.mocked(updateInterests).mockResolvedValue({ topics: [science, technology] })

    renderPage()

    const scienceButton = await screen.findByRole('button', { name: /Science/ })
    expect(scienceButton).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: /Technology/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Save and continue' }))

    await waitFor(() => {
      expect(vi.mocked(updateInterests).mock.calls[0]?.[0]).toEqual({ topics: [2, 1] })
    })
    expect(await screen.findByText('App destination')).toBeInTheDocument()
  })

  it('continues first-time setup to content languages after saving interests', async () => {
    vi.mocked(getTopics).mockResolvedValue([technology, science])
    vi.mocked(getCurrentInterests).mockResolvedValue({ topics: [] })
    vi.mocked(updateInterests).mockResolvedValue({ topics: [technology] })

    renderPage('/onboarding/interests?setup=1')

    fireEvent.click(await screen.findByRole('button', { name: /Technology/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Save and continue' }))

    expect(await screen.findByText('Languages destination')).toBeInTheDocument()
  })

  it('shows a real empty state when the backend has no topics', async () => {
    vi.mocked(getTopics).mockResolvedValue([])
    vi.mocked(getCurrentInterests).mockResolvedValue({ topics: [] })

    renderPage()

    expect(await screen.findByText('No topics are available yet')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save and continue' })).not.toBeInTheDocument()
  })
})
