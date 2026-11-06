import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getCurrentContentLanguages,
  getLanguages,
  updateContentLanguages,
} from '../../../api/languages'
import type { ContentLanguage } from '../../../api/types'
import { changeUiLanguage } from '../../../i18n'
import { ContentLanguagesPage } from './ContentLanguagesPage'

vi.mock('../../../api/languages', () => ({
  getLanguages: vi.fn(),
  getCurrentContentLanguages: vi.fn(),
  updateContentLanguages: vi.fn(),
}))

const english: ContentLanguage = {
  code: 'en',
  name_en: 'English',
  name_fa: 'انگلیسی',
  native_name: 'English',
}

const japanese: ContentLanguage = {
  code: 'ja',
  name_en: 'Japanese',
  name_fa: 'ژاپنی',
  native_name: '日本語',
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
      <MemoryRouter initialEntries={['/onboarding/languages']}>
        <Routes>
          <Route path="/onboarding/languages" element={<ContentLanguagesPage />} />
          <Route path="/app" element={<div>App destination</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ContentLanguagesPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await changeUiLanguage('en')
  })

  afterEach(() => {
    cleanup()
  })

  it('loads catalog and saved choices, saves replacement codes, and returns to the app', async () => {
    vi.mocked(getLanguages).mockResolvedValue([english, japanese])
    vi.mocked(getCurrentContentLanguages).mockResolvedValue({
      languages: [english],
    })
    vi.mocked(updateContentLanguages).mockResolvedValue({
      languages: [english, japanese],
    })

    renderPage()

    const japaneseButton = await screen.findByRole('button', { name: /Japanese/ })
    expect(japaneseButton).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(japaneseButton)
    fireEvent.click(screen.getByRole('button', { name: 'Save languages' }))

    await waitFor(() => {
      expect(vi.mocked(updateContentLanguages).mock.calls[0]?.[0]).toEqual({
        languages: ['en', 'ja'],
      })
    })

    expect(await screen.findByText('App destination')).toBeInTheDocument()
  })
})
