import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, type ReactNode } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CurrentUser } from '../api/types'
import { changeUiLanguage } from '../i18n'
import { SESSION_QUERY_KEY } from '../features/auth/session'
import { RECOMMENDATIONS_QUERY_KEY } from '../features/feed/recommendations'
import { RootLayout } from './RootLayout'

const { logoutMock, updateCurrentUserMock } = vi.hoisted(() => ({
  logoutMock: vi.fn(),
  updateCurrentUserMock: vi.fn(),
}))

vi.mock('../api/auth', async (importOriginal) => {
  const original = await importOriginal<typeof import('../api/auth')>()
  return { ...original, logout: logoutMock }
})

vi.mock('../api/account', async (importOriginal) => {
  const original = await importOriginal<typeof import('../api/account')>()
  return { ...original, updateCurrentUser: updateCurrentUserMock }
})

function mockReducedMotion(matches = true) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  )
}

function user(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: 1,
    email: 'reader@example.com',
    display_name: 'Reader Example',
    preferred_ui_language: 'en',
    avatar_url: null,
    capabilities: {
      can_moderate: false,
      can_administer: false,
    },
    ...overrides,
  }
}

const SuspendedPage = lazy(() => new Promise<{ default: () => null }>(() => {}))

function renderLayout(
  currentUser: CurrentUser | null,
  options: { path?: string; child?: ReactNode } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  queryClient.setQueryData(SESSION_QUERY_KEY, currentUser)

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[options.path ?? '/app']}>
          <Routes>
            <Route element={<RootLayout />}>
              <Route path="*" element={options.child ?? <div>Page content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  }
}

describe('RootLayout application shell', () => {
  beforeEach(async () => {
    logoutMock.mockReset()
    updateCurrentUserMock.mockReset()
    await changeUiLanguage('en')
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('shows the complete reader navigation to authenticated users', () => {
    renderLayout(user())

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/app')
    expect(screen.getByRole('link', { name: 'Explore' })).toHaveAttribute('href', '/explore')
    expect(screen.getByRole('link', { name: 'Search' })).toHaveAttribute('href', '/search')
    expect(screen.getByRole('link', { name: 'Library' })).toHaveAttribute('href', '/library')
    expect(screen.getByRole('link', { name: 'Creator Studio' })).toHaveAttribute('href', '/studio')
  })

  it('keeps authenticated destinations hidden from anonymous visitors', () => {
    renderLayout(null, { path: '/' })

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Search' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create account' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Library' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Creator Studio' })).not.toBeInTheDocument()
  })

  it('shows moderation only when the current user has the capability', () => {
    const moderator = user({
      capabilities: { can_moderate: true, can_administer: false },
    })
    const { unmount } = renderLayout(moderator)

    expect(screen.getByRole('link', { name: 'Moderation' })).toHaveAttribute('href', '/moderation')

    unmount()
    renderLayout(user())
    expect(screen.queryByRole('link', { name: 'Moderation' })).not.toBeInTheDocument()
  })

  it('renders an avatar URL and falls back to stable initials when absent', () => {
    const { unmount } = renderLayout(
      user({ avatar_url: 'https://media.example/avatar.webp', display_name: 'Mina Reader' }),
    )
    expect(screen.getByRole('img', { name: 'Mina Reader' })).toHaveAttribute(
      'src',
      'https://media.example/avatar.webp',
    )

    unmount()
    renderLayout(user({ avatar_url: undefined }))
    expect(screen.getByText('RE')).toBeInTheDocument()
  })

  it('uses the email identity when display_name is blank', () => {
    renderLayout(user({ display_name: '   ', email: 'quiet.reader@example.com' }))

    expect(screen.getByRole('button', { name: 'Open account menu for quiet.reader' })).toBeVisible()
    expect(screen.getByText('QU')).toBeInTheDocument()
  })

  it('opens and closes the mobile menu with correct accessibility state', async () => {
    const pointer = userEvent.setup()
    renderLayout(user())
    const trigger = screen.getByRole('button', { name: 'Open navigation menu' })

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveAttribute('aria-controls', 'mobile-navigation')
    await pointer.click(trigger)
    expect(screen.getByRole('button', { name: 'Close navigation menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeInTheDocument()
    await pointer.click(screen.getByRole('button', { name: 'Close navigation menu' }))
    expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).not.toBeInTheDocument()
  })

  it('closes the mobile menu on Escape and returns focus to its trigger', async () => {
    const pointer = userEvent.setup()
    renderLayout(user())
    await pointer.click(screen.getByRole('button', { name: 'Open navigation menu' }))
    await pointer.keyboard('{Escape}')

    const trigger = screen.getByRole('button', { name: 'Open navigation menu' })
    expect(trigger).toHaveFocus()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('opens and closes the account menu', async () => {
    const pointer = userEvent.setup()
    renderLayout(user())
    const trigger = screen.getByRole('button', { name: 'Open account menu for Reader Example' })

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await pointer.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('reader@example.com')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Account' })).toHaveAttribute('href', '/account')
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument()
    await pointer.keyboard('{Escape}')
    expect(trigger).toHaveFocus()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('keeps the interface language control directly in the persistent header', async () => {
    const pointer = userEvent.setup()
    renderLayout(user())

    const header = screen.getByRole('banner')
    const languageControl = screen.getByRole('group', { name: 'Interface language' })
    expect(header).toContainElement(languageControl)
    expect(screen.getAllByRole('group', { name: 'Interface language' })).toHaveLength(1)

    await pointer.click(
      screen.getByRole('button', { name: 'Open account menu for Reader Example' }),
    )
    expect(screen.getAllByRole('group', { name: 'Interface language' })).toHaveLength(1)

    await pointer.click(screen.getByRole('button', { name: 'Open navigation menu' }))
    expect(screen.getAllByRole('group', { name: 'Interface language' })).toHaveLength(1)
  })

  it('lets the authenticated account preference override a different local language', async () => {
    await changeUiLanguage('en')

    renderLayout(user({ preferred_ui_language: 'fa' }))

    await waitFor(() => {
      expect(document.documentElement.lang).toBe('fa')
      expect(document.documentElement.dir).toBe('rtl')
    })
  })

  it('persists authenticated language changes into the session and invalidates recommendations', async () => {
    mockReducedMotion()
    const updatedUser = user({ preferred_ui_language: 'fa' })
    updateCurrentUserMock.mockResolvedValue(updatedUser)
    const pointer = userEvent.setup()
    const { queryClient } = renderLayout(user({ preferred_ui_language: 'en' }))
    queryClient.setQueryData(RECOMMENDATIONS_QUERY_KEY, [])

    await pointer.click(screen.getByRole('button', { name: 'فارسی' }))

    await waitFor(() => {
      expect(updateCurrentUserMock).toHaveBeenCalledWith({
        preferred_ui_language: 'fa',
      })
    })
    expect(queryClient.getQueryData(SESSION_QUERY_KEY)).toEqual(updatedUser)
    expect(queryClient.getQueryState(RECOMMENDATIONS_QUERY_KEY)?.isInvalidated).toBe(true)
    expect(document.documentElement.lang).toBe('fa')
    expect(document.documentElement.dir).toBe('rtl')
  })

  it('marks the matching nested route as the current page', () => {
    renderLayout(user(), { path: '/studio/ideas/new' })

    expect(screen.getByRole('link', { name: 'Creator Studio' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current')
  })

  it('updates the session and navigates to the public shell after logout', async () => {
    logoutMock.mockResolvedValue(undefined)
    const pointer = userEvent.setup()
    const { queryClient } = renderLayout(user())
    await pointer.click(
      screen.getByRole('button', { name: 'Open account menu for Reader Example' }),
    )
    await pointer.click(screen.getByRole('button', { name: 'Log out' }))

    await waitFor(() => expect(queryClient.getQueryData(SESSION_QUERY_KEY)).toBeNull())
    expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /account menu/i })).not.toBeInTheDocument()
  })

  it('keeps the account menu usable and reports a logout failure', async () => {
    logoutMock.mockRejectedValue(new Error('network unavailable'))
    const pointer = userEvent.setup()
    renderLayout(user())
    await pointer.click(
      screen.getByRole('button', { name: 'Open account menu for Reader Example' }),
    )
    await pointer.click(screen.getByRole('button', { name: 'Log out' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Sign out could not be completed. Try again.',
    )
    expect(screen.getByRole('button', { name: 'Log out' })).toBeEnabled()
  })

  it('preserves Persian RTL semantics and localized shell labels', async () => {
    await changeUiLanguage('fa')
    renderLayout(user({ display_name: 'مینا رضایی', preferred_ui_language: 'fa' }))

    expect(document.documentElement).toHaveAttribute('dir', 'rtl')
    expect(screen.getByRole('navigation', { name: 'ناوبری اصلی' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'استودیوی سازنده' })).toBeInTheDocument()
  })

  it('keeps the shell mounted while a route chunk loads', () => {
    renderLayout(user(), { child: <SuspendedPage /> })

    expect(screen.getByText('InsightInk')).toBeInTheDocument()
    expect(screen.getByText('Loading this view…')).toBeInTheDocument()
  })
})
