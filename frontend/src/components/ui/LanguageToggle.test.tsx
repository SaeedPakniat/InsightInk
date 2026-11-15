import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { changeUiLanguage } from '../../i18n'
import { LanguageToggle } from './LanguageToggle'

function mockReducedMotion(matches: boolean) {
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

describe('LanguageToggle', () => {
  beforeEach(async () => {
    await changeUiLanguage('fa')
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    document.documentElement.classList.remove('language-morph-active', 'language-morph-settling')
  })

  it('assembles English glyph tiles before switching the document to LTR', async () => {
    vi.useFakeTimers()
    mockReducedMotion(false)
    render(<LanguageToggle />)

    fireEvent.click(screen.getByRole('button', { name: 'English' }))

    expect(screen.getByTestId('language-morph')).toHaveClass('language-morph--to-ltr')
    expect(screen.getByText('IDEA')).toBeInTheDocument()
    expect(screen.getByText('READ')).toBeInTheDocument()
    expect(document.documentElement).toHaveClass('language-morph-active')
    expect(document.documentElement.dir).toBe('rtl')

    await act(async () => {
      vi.advanceTimersByTime(340)
      await Promise.resolve()
    })

    expect(document.documentElement.lang).toBe('en')
    expect(document.documentElement.dir).toBe('ltr')
    expect(document.documentElement).toHaveClass('language-morph-settling')

    act(() => {
      vi.advanceTimersByTime(560)
    })

    expect(screen.queryByTestId('language-morph')).not.toBeInTheDocument()
    expect(document.documentElement).not.toHaveClass('language-morph-active')
    expect(document.documentElement).not.toHaveClass('language-morph-settling')
  })

  it('uses the opposite tile flow when returning to Persian', async () => {
    vi.useFakeTimers()
    mockReducedMotion(false)
    await changeUiLanguage('en')
    render(<LanguageToggle />)

    fireEvent.click(screen.getByRole('button', { name: 'فارسی' }))

    expect(screen.getByTestId('language-morph')).toHaveClass('language-morph--to-rtl')
    expect(screen.getByText('ایده')).toBeInTheDocument()
    expect(screen.getByText('کتاب')).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(340)
      await Promise.resolve()
    })

    expect(document.documentElement.lang).toBe('fa')
    expect(document.documentElement.dir).toBe('rtl')

    act(() => {
      vi.advanceTimersByTime(560)
    })
  })

  it('switches immediately when reduced motion is requested', async () => {
    mockReducedMotion(true)
    render(<LanguageToggle />)

    fireEvent.click(screen.getByRole('button', { name: 'English' }))

    await act(async () => {
      await Promise.resolve()
    })

    expect(screen.queryByTestId('language-morph')).not.toBeInTheDocument()
    expect(document.documentElement.lang).toBe('en')
    expect(document.documentElement.dir).toBe('ltr')
  })

  it('lets an authenticated account preference override the local tab language', async () => {
    await changeUiLanguage('en')

    render(<LanguageToggle preferredLanguage="fa" />)

    await waitFor(() => {
      expect(document.documentElement.lang).toBe('fa')
      expect(document.documentElement.dir).toBe('rtl')
    })
  })

  it('persists an authenticated language change while preserving reduced-motion behavior', async () => {
    mockReducedMotion(true)
    const persist = vi.fn().mockResolvedValue(undefined)

    render(<LanguageToggle preferredLanguage="fa" onAuthenticatedLanguageChange={persist} />)

    fireEvent.click(screen.getByRole('button', { name: 'English' }))

    await waitFor(() => expect(persist).toHaveBeenCalledWith('en'))
    expect(document.documentElement.lang).toBe('en')
    expect(document.documentElement.dir).toBe('ltr')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('restores the previous language and reports a failed authenticated preference save', async () => {
    mockReducedMotion(true)
    const persist = vi.fn().mockRejectedValue(new Error('network'))

    render(<LanguageToggle preferredLanguage="fa" onAuthenticatedLanguageChange={persist} />)

    fireEvent.click(screen.getByRole('button', { name: 'English' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'ترجیح زبان ذخیره نشد و زبان قبلی بازگردانده شد.',
    )
    expect(document.documentElement.lang).toBe('fa')
    expect(document.documentElement.dir).toBe('rtl')
  })
})
