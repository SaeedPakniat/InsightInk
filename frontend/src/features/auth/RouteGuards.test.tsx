import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { CurrentUser } from '../../api/types'
import { changeUiLanguage } from '../../i18n'
import { SESSION_QUERY_KEY } from './session'
import { RequireAuth, RequireModerator } from './RouteGuards'

function user(canModerate: boolean): CurrentUser {
  return {
    id: canModerate ? 9 : 1,
    email: canModerate ? 'moderator@example.com' : 'reader@example.com',
    display_name: canModerate ? 'Moderator' : 'Reader',
    preferred_ui_language: 'en',
    avatar_url: null,
    capabilities: {
      can_moderate: canModerate,
      can_administer: false,
    },
  }
}

function LoginStateProbe() {
  const location = useLocation()
  const state = location.state as { from?: string } | null
  return <div>Login return: {state?.from ?? 'none'}</div>
}

function renderGuard(sessionData: CurrentUser | null, initialEntry = '/moderation') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  queryClient.setQueryData(SESSION_QUERY_KEY, sessionData)

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route element={<RequireModerator />}>
            <Route path="/moderation" element={<div>Moderator workspace</div>} />
          </Route>
          <Route path="/app" element={<div>Reader app</div>} />
          <Route path="/login" element={<LoginStateProbe />} />
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

  it('redirects an anonymous visitor to login with the full return location', async () => {
    renderGuard(null, '/moderation?status=in_review#case-12')
    expect(
      await screen.findByText('Login return: /moderation?status=in_review#case-12'),
    ).toBeInTheDocument()
  })
})

function renderAccountGuard(sessionData: CurrentUser | null, initialEntry = '/account') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  queryClient.setQueryData(SESSION_QUERY_KEY, sessionData)

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route element={<RequireAuth />}>
            <Route path="/account" element={<div>Account page</div>} />
          </Route>
          <Route path="/login" element={<LoginStateProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('RequireAuth account route', () => {
  afterEach(() => {
    cleanup()
  })

  it('allows an authenticated user to access the account route', async () => {
    renderAccountGuard(user(false))
    expect(await screen.findByText('Account page')).toBeInTheDocument()
  })

  it('redirects an anonymous visitor away from the account route with query/hash intact', async () => {
    renderAccountGuard(null, '/account?panel=profile#photo')
    expect(
      await screen.findByText('Login return: /account?panel=profile#photo'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Account page')).not.toBeInTheDocument()
  })
})
