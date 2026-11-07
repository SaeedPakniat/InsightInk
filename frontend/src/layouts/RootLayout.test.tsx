import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, type ReactNode } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { CurrentUser } from '../api/types'
import { changeUiLanguage } from '../i18n'
import { SESSION_QUERY_KEY } from '../features/auth/session'
import { RootLayout } from './RootLayout'

function user(canModerate: boolean): CurrentUser {
  return {
    id: canModerate ? 9 : 1,
    email: canModerate ? 'moderator@example.com' : 'reader@example.com',
    display_name: canModerate ? 'Moderator' : 'Reader',
    preferred_ui_language: 'en',
    capabilities: {
      can_moderate: canModerate,
      can_administer: false,
    },
  }
}

const SuspendedPage = lazy(() => new Promise<{ default: () => null }>(() => {}))

function renderLayout(currentUser: CurrentUser | null, child: ReactNode = <div>Page content</div>) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  queryClient.setQueryData(SESSION_QUERY_KEY, currentUser)

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<RootLayout />}>
            <Route index element={child} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('RootLayout moderation navigation', () => {
  beforeEach(async () => {
    await changeUiLanguage('en')
  })

  afterEach(() => {
    cleanup()
  })

  it('shows moderation navigation only to users with the capability', async () => {
    renderLayout(user(true))

    expect(await screen.findByRole('link', { name: 'Moderation' })).toHaveAttribute(
      'href',
      '/moderation',
    )
  })

  it('does not expose moderation navigation to an ordinary reader', () => {
    renderLayout(user(false))

    expect(screen.queryByRole('link', { name: 'Moderation' })).not.toBeInTheDocument()
  })

  it('keeps the shell mounted and shows localized feedback while a route chunk loads', () => {
    renderLayout(user(false), <SuspendedPage />)

    expect(screen.getByText('InsightInk')).toBeInTheDocument()
    expect(screen.getByText('Loading this view…')).toBeInTheDocument()
  })
})
