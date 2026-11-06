import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Topic } from '../../api/types'
import { changeUiLanguage } from '../../i18n'
import { InterestSelectionForm } from './InterestSelectionForm'

const topics: Topic[] = [
  { id: 1, slug: 'technology', name_fa: 'فناوری', name_en: 'Technology' },
  { id: 2, slug: 'science', name_fa: 'علم', name_en: 'Science' },
  { id: 3, slug: 'history', name_fa: 'تاریخ', name_en: 'History' },
]

describe('InterestSelectionForm', () => {
  beforeEach(async () => {
    await changeUiLanguage('en')
  })

  afterEach(() => {
    cleanup()
  })

  it('starts from saved interests and keeps selection as local draft state', () => {
    const onSave = vi.fn()

    render(
      <InterestSelectionForm
        topics={topics}
        initialTopicIds={[2]}
        isSaving={false}
        saveError={false}
        onSave={onSave}
      />,
    )

    expect(screen.getByRole('button', { name: /Science/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Technology/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    )

    fireEvent.click(screen.getByRole('button', { name: /Technology/ }))

    expect(screen.getByRole('button', { name: /Technology/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(onSave).not.toHaveBeenCalled()
  })

  it('submits the selected topic ids only when the user saves', () => {
    const onSave = vi.fn()

    render(
      <InterestSelectionForm
        topics={topics}
        initialTopicIds={[2]}
        isSaving={false}
        saveError={false}
        onSave={onSave}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Technology/ }))
    fireEvent.click(screen.getByRole('button', { name: /Science/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Save and continue' }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith([1])
  })

  it('renders Persian topic names as the primary labels in Persian UI', async () => {
    await changeUiLanguage('fa')

    render(
      <InterestSelectionForm
        topics={topics}
        initialTopicIds={[]}
        isSaving={false}
        saveError={false}
        onSave={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /فناوری/ })).toBeInTheDocument()
    expect(screen.getByText('Technology')).toHaveAttribute('dir', 'ltr')
  })
})
