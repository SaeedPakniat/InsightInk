import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CurrentUser } from '../../api/types'
import { changeUiLanguage } from '../../i18n'
import { SESSION_QUERY_KEY } from './session'
import { LoginPage } from './LoginPage'

const { loginMock } = vi.hoisted(() => ({ loginMock: vi.fn() }))

vi.mock('../../api/auth', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../api/auth')>()
  return { ...original, login: loginMock }
})

const user: CurrentUser = {
  id: 1,
  email: 'reader@example.com',
  display_name: 'Reader',
  preferred_ui_language: 'en',
  avatar_url: null,
  capabilities: {
    can_moderate: false,
    can_administer: false,
  },
}

function DestinationProbe() {
  const location = useLocation()
  return (
    <div data-testid="destination">{`${location.pathname}${location.search}${location.hash}`}</div>
  )
}

describe('LoginPage return location', () => {
  beforeEach(async () => {
    loginMock.mockReset()
    await changeUiLanguage('en')
  })

  afterEach(() => {
    cleanup()
  })

  it('returns to the full protected path including query and hash after login', async () => {
    loginMock.mockResolvedValue(user)
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    const pointer = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={[
            {
              pathname: '/login',
              state: { from: '/library?sort=oldest#saved-item' },
            },
          ]}
        >
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/library" element={<DestinationProbe />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await pointer.type(screen.getByRole('textbox', { name: 'Email' }), 'reader@example.com')
    await pointer.type(screen.getByLabelText('Password'), 'password')
    await pointer.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByTestId('destination')).toHaveTextContent(
      '/library?sort=oldest#saved-item',
    )
    await waitFor(() => expect(queryClient.getQueryData(SESSION_QUERY_KEY)).toEqual(user))
  })
})
