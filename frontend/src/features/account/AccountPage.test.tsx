import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../api/client'
import type { CurrentUser } from '../../api/types'
import { changeUiLanguage } from '../../i18n'
import { SESSION_QUERY_KEY } from '../auth/session'
import { RootLayout } from '../../layouts/RootLayout'
import { AccountPage } from './AccountPage'

const { updateMock, uploadMock, removeMock } = vi.hoisted(() => ({
  updateMock: vi.fn(),
  uploadMock: vi.fn(),
  removeMock: vi.fn(),
}))

vi.mock('../../api/account', () => ({
  updateCurrentUser: updateMock,
  uploadCurrentUserAvatar: uploadMock,
  removeCurrentUserAvatar: removeMock,
}))

function currentUser(overrides: Partial<CurrentUser> = {}): CurrentUser {
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

function renderPage(user: CurrentUser = currentUser()) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  queryClient.setQueryData(SESSION_QUERY_KEY, user)

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AccountPage />
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  }
}

function renderPageWithShell(user: CurrentUser = currentUser()) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  queryClient.setQueryData(SESSION_QUERY_KEY, user)

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/account']}>
          <Routes>
            <Route element={<RootLayout />}>
              <Route path="/account" element={<AccountPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  }
}

describe('AccountPage', () => {
  beforeEach(async () => {
    updateMock.mockReset()
    uploadMock.mockReset()
    removeMock.mockReset()
    await changeUiLanguage('en')
  })

  afterEach(() => {
    cleanup()
  })

  it('renders current account identity and an existing avatar', () => {
    renderPage(
      currentUser({
        avatar_url: 'https://media.example/user_avatars/reader.webp',
      }),
    )

    expect(screen.getByRole('heading', { name: 'Account', level: 1 })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Reader Example')).toBeInTheDocument()
    expect(screen.getByDisplayValue('reader@example.com')).toHaveAttribute('readonly')
    expect(screen.getByRole('img', { name: 'Reader Example' })).toHaveAttribute(
      'src',
      'https://media.example/user_avatars/reader.webp',
    )
  })

  it('links the existing interests and content-language settings from Account', () => {
    renderPage()

    expect(
      screen.getByRole('navigation', { name: 'Reading preference settings' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Interests/ })).toHaveAttribute(
      'href',
      '/onboarding/interests',
    )
    expect(screen.getByRole('link', { name: /Content languages/ })).toHaveAttribute(
      'href',
      '/onboarding/languages',
    )
  })

  it('uses account initials when avatar_url is null', () => {
    renderPage()

    expect(screen.queryByRole('img', { name: 'Reader Example' })).not.toBeInTheDocument()
    expect(screen.getByText('RE')).toBeInTheDocument()
  })

  it('updates the display name and replaces the canonical session cache', async () => {
    const pointer = userEvent.setup()
    const updated = currentUser({ display_name: 'Updated Reader' })
    updateMock.mockResolvedValueOnce(updated)
    const { queryClient } = renderPage()

    const input = screen.getByRole('textbox', { name: 'Display name' })
    await pointer.clear(input)
    await pointer.type(input, 'Updated Reader')
    await pointer.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(updateMock.mock.calls[0]?.[0]).toEqual({ display_name: 'Updated Reader' })
    await waitFor(() => expect(queryClient.getQueryData(SESSION_QUERY_KEY)).toEqual(updated))
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Your account details were updated.',
    )
  })

  it('updates the persistent header identity immediately after a profile save', async () => {
    const pointer = userEvent.setup()
    updateMock.mockResolvedValueOnce(currentUser({ display_name: 'Header Updated' }))
    renderPageWithShell()

    const input = screen.getByRole('textbox', { name: 'Display name' })
    await pointer.clear(input)
    await pointer.type(input, 'Header Updated')
    await pointer.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(
      await screen.findByRole('button', { name: 'Open account menu for Header Updated' }),
    ).toBeInTheDocument()
  })

  it('uploads a new avatar and updates only avatar_url in the session cache', async () => {
    const pointer = userEvent.setup()
    uploadMock.mockResolvedValueOnce({
      avatar_url: 'https://media.example/user_avatars/new.webp',
    })
    const { queryClient } = renderPage()
    const file = new File(['avatar'], 'new.webp', { type: 'image/webp' })

    await pointer.upload(screen.getByLabelText('Choose image'), file)
    await pointer.click(screen.getByRole('button', { name: 'Upload photo' }))

    expect(uploadMock.mock.calls[0]?.[0]).toBe(file)
    await waitFor(() =>
      expect((queryClient.getQueryData(SESSION_QUERY_KEY) as CurrentUser).avatar_url).toBe(
        'https://media.example/user_avatars/new.webp',
      ),
    )
    expect(screen.getByRole('img', { name: 'Reader Example' })).toHaveAttribute(
      'src',
      'https://media.example/user_avatars/new.webp',
    )
  })

  it('replaces an existing avatar through the same upload flow', async () => {
    const pointer = userEvent.setup()
    uploadMock.mockResolvedValueOnce({
      avatar_url: 'https://media.example/user_avatars/replaced.jpg',
    })
    renderPage(
      currentUser({
        avatar_url: 'https://media.example/user_avatars/old.png',
      }),
    )
    const file = new File(['replacement'], 'replacement.jpg', { type: 'image/jpeg' })

    await pointer.upload(screen.getByLabelText('Choose image'), file)
    await pointer.click(screen.getByRole('button', { name: 'Replace photo' }))

    expect(uploadMock.mock.calls[0]?.[0]).toBe(file)
    expect(await screen.findByRole('img', { name: 'Reader Example' })).toHaveAttribute(
      'src',
      'https://media.example/user_avatars/replaced.jpg',
    )
  })

  it('confirms avatar removal, clears the session avatar, and restores initials', async () => {
    const pointer = userEvent.setup()
    removeMock.mockResolvedValueOnce(undefined)
    const { queryClient } = renderPage(
      currentUser({
        avatar_url: 'https://media.example/user_avatars/current.png',
      }),
    )

    await pointer.click(screen.getByRole('button', { name: 'Remove photo' }))
    expect(screen.getByRole('group', { name: 'Confirm profile photo removal' })).toBeInTheDocument()
    await pointer.click(screen.getByRole('button', { name: 'Yes, remove photo' }))

    expect(removeMock).toHaveBeenCalledTimes(1)
    await waitFor(() =>
      expect((queryClient.getQueryData(SESSION_QUERY_KEY) as CurrentUser).avatar_url).toBeNull(),
    )
    expect(screen.queryByRole('img', { name: 'Reader Example' })).not.toBeInTheDocument()
    expect(screen.getByText('RE')).toBeInTheDocument()
  })

  it('rejects an oversized file before upload', () => {
    renderPage()
    const file = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'too-large.png', {
      type: 'image/png',
    })

    fireEvent.change(screen.getByLabelText('Choose image'), {
      target: { files: [file] },
    })

    expect(screen.getByRole('alert')).toHaveTextContent('Choose an image no larger than 5 MiB.')
    expect(uploadMock).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Upload photo' })).toBeDisabled()
  })

  it('rejects a clearly unsupported MIME type before upload', () => {
    renderPage()
    const file = new File(['not-an-image'], 'avatar.gif', { type: 'image/gif' })

    fireEvent.change(screen.getByLabelText('Choose image'), {
      target: { files: [file] },
    })

    expect(screen.getByRole('alert')).toHaveTextContent('Choose a JPEG, PNG or WebP image.')
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it('maps the backend avatar field error to localized upload feedback', async () => {
    const pointer = userEvent.setup()
    uploadMock.mockRejectedValueOnce(
      new ApiError(400, {
        avatar: ['Avatar must be a JPEG, PNG, or WebP image.'],
      }),
    )
    renderPage()
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' })

    await pointer.upload(screen.getByLabelText('Choose image'), file)
    await pointer.click(screen.getByRole('button', { name: 'Upload photo' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a JPEG, PNG or WebP image.')
  })

  it('shows a generic upload error without losing the selected file', async () => {
    const pointer = userEvent.setup()
    uploadMock.mockRejectedValueOnce(new Error('network unavailable'))
    renderPage()
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' })

    await pointer.upload(screen.getByLabelText('Choose image'), file)
    await pointer.click(screen.getByRole('button', { name: 'Upload photo' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The profile photo could not be uploaded. Try again.',
    )
    expect(screen.getByText('Selected: avatar.png')).toBeInTheDocument()
  })

  it('shows a localized display-name validation error', async () => {
    const pointer = userEvent.setup()
    updateMock.mockRejectedValueOnce(
      new ApiError(400, {
        display_name: ['Ensure this field has no more than 150 characters.'],
      }),
    )
    renderPage()

    await pointer.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(
      await screen.findByText('The display name is invalid or longer than 150 characters.'),
    ).toBeInTheDocument()
  })

  it('disables the relevant profile and avatar controls while mutations are pending', async () => {
    const pointer = userEvent.setup()
    updateMock.mockReturnValueOnce(new Promise(() => {}))
    uploadMock.mockReturnValueOnce(new Promise(() => {}))
    renderPage()

    await pointer.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
    expect(screen.getByRole('textbox', { name: 'Display name' })).toBeDisabled()

    const fileInput = screen.getByLabelText('Choose image')
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' })
    await pointer.upload(fileInput, file)
    await pointer.click(screen.getByRole('button', { name: 'Upload photo' }))

    expect(screen.getByRole('button', { name: 'Uploading…' })).toBeDisabled()
    expect(fileInput).toBeDisabled()
  })

  it('renders localized Persian account semantics in RTL', async () => {
    await changeUiLanguage('fa')
    renderPage(currentUser({ display_name: 'مینا رضایی', preferred_ui_language: 'fa' }))

    expect(document.documentElement).toHaveAttribute('dir', 'rtl')
    expect(screen.getByRole('heading', { name: 'حساب کاربری', level: 1 })).toBeInTheDocument()
    expect(screen.getByLabelText('انتخاب تصویر')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'تنظیمات ترجیحات مطالعه' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /علایق/ })).toHaveAttribute(
      'href',
      '/onboarding/interests',
    )
  })
})
