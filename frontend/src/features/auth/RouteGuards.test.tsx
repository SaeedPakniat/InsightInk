import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { CurrentUser } from '../../api/types'
import { changeUiLanguage } from '../../i18n'
import { SESSION_QUERY_KEY } from './session'
import { RequireModerator } from './RouteGuards'

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

function renderGuard(sessionData: CurrentUser | null) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  queryClient.setQueryData(SESSION_QUERY_KEY, sessionData)

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/moderation']}>
        <Routes>
          <Route element={<RequireModerator />}>
            <Route path="/moderation" element={<div>Moderator workspace</div>} />
          </Route>
          <Route path="/app" element={<div>Reader app</div>} />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('RequireModerator', () => {
  beforeEach(async () => {
    await changeUiLanguage('en')
  })

  afterEach(() => {
    cleanup()
  })

  it('allows a user with moderation capability', async () => {
    renderGuard(user(true))
    expect(await screen.findByText('Moderator workspace')).toBeInTheDocument()
  })

  it('redirects an authenticated ordinary reader to the app', async () => {
    renderGuard(user(false))
    expect(await screen.findByText('Reader app')).toBeInTheDocument()
    expect(screen.queryByText('Moderator workspace')).not.toBeInTheDocument()
  })

  it('redirects an anonymous visitor to login', async () => {
    renderGuard(null)
    expect(await screen.findByText('Login page')).toBeInTheDocument()
  })
})
