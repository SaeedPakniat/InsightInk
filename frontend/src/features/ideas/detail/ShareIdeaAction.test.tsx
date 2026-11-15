import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { changeUiLanguage } from '../../../i18n'
import { ShareIdeaAction } from './ShareIdeaAction'

function defineNavigatorProperty(name: 'share' | 'clipboard', value: unknown) {
  Object.defineProperty(navigator, name, {
    configurable: true,
    value,
  })
}

describe('ShareIdeaAction', () => {
  beforeEach(async () => {
    await changeUiLanguage('en')
    Reflect.deleteProperty(navigator, 'share')
    Reflect.deleteProperty(navigator, 'clipboard')
  })

  afterEach(() => {
    cleanup()
    Reflect.deleteProperty(navigator, 'share')
    Reflect.deleteProperty(navigator, 'clipboard')
  })

  it('uses the Web Share API when the browser supports it', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    defineNavigatorProperty('share', share)
    render(<ShareIdeaAction ideaId={40} title="Useful Idea" />)

    fireEvent.click(screen.getByRole('button', { name: 'Share' }))

    await waitFor(() =>
      expect(share).toHaveBeenCalledWith({
        title: 'Useful Idea',
        text: 'Read “Useful Idea” on InsightInk.',
        url: new URL('/ideas/40', window.location.origin).toString(),
      }),
    )
    expect(await screen.findByRole('status')).toHaveTextContent('Idea shared.')
  })

  it('copies the canonical Idea URL when Web Share is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    defineNavigatorProperty('clipboard', { writeText })
    render(<ShareIdeaAction ideaId={40} title="Useful Idea" />)

    fireEvent.click(screen.getByRole('button', { name: 'Share' }))

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        new URL('/ideas/40', window.location.origin).toString(),
      ),
    )
    expect(await screen.findByRole('status')).toHaveTextContent('Idea link copied.')
  })

  it('reports a clipboard fallback failure without breaking the page', async () => {
    defineNavigatorProperty('clipboard', {
      writeText: vi.fn().mockRejectedValue(new Error('denied')),
    })
    render(<ShareIdeaAction ideaId={40} title="Useful Idea" />)

    fireEvent.click(screen.getByRole('button', { name: 'Share' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This Idea could not be shared. Try again.',
    )
    expect(screen.getByRole('button', { name: 'Share' })).toBeEnabled()
  })

  it('treats native share cancellation as a neutral dismissal', async () => {
    defineNavigatorProperty(
      'share',
      vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError')),
    )
    render(<ShareIdeaAction ideaId={40} title="Useful Idea" />)

    fireEvent.click(screen.getByRole('button', { name: 'Share' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Share' })).toBeEnabled())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
