import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ContentLanguage } from '../../../api/types'
import { changeUiLanguage } from '../../../i18n'
import { ContentLanguageSelectionForm } from './ContentLanguageSelectionForm'

const languages: ContentLanguage[] = [
  { code: 'en', name_en: 'English', name_fa: 'انگلیسی', native_name: 'English' },
  { code: 'fa', name_en: 'Persian', name_fa: 'فارسی', native_name: 'فارسی' },
  { code: 'es', name_en: 'Spanish', name_fa: 'اسپانیایی', native_name: 'Español' },
  { code: 'ar', name_en: 'Arabic', name_fa: 'عربی', native_name: 'العربية' },
  { code: 'ja', name_en: 'Japanese', name_fa: 'ژاپنی', native_name: '日本語' },
]

describe('ContentLanguageSelectionForm', () => {
  beforeEach(async () => {
    await changeUiLanguage('en')
  })

  afterEach(() => {
    cleanup()
  })

  it('starts from saved choices and keeps edits local until save', () => {
    const onSave = vi.fn()

    render(
      <ContentLanguageSelectionForm
        languages={languages}
        initialCodes={['en', 'fa']}
        isSaving={false}
        saveError={false}
        onSave={onSave}
      />,
    )

    expect(screen.getByRole('button', { name: /English/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Japanese/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    )

    fireEvent.click(screen.getByRole('button', { name: /Japanese/ }))

    expect(screen.getByRole('button', { name: /Japanese/ })).toHaveAttribute('aria-pressed', 'true')
    expect(onSave).not.toHaveBeenCalled()
  })

  it('searches across English, Persian, native names and codes', () => {
    render(
      <ContentLanguageSelectionForm
        languages={languages}
        initialCodes={[]}
        isSaving={false}
        saveError={false}
        onSave={vi.fn()}
      />,
    )

    const search = screen.getByRole('searchbox', { name: 'Search languages' })

    fireEvent.change(search, { target: { value: 'Español' } })
    expect(screen.getByRole('button', { name: /Spanish/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Japanese/ })).not.toBeInTheDocument()

    fireEvent.change(search, { target: { value: 'ژاپنی' } })
    expect(screen.getByRole('button', { name: /Japanese/ })).toBeInTheDocument()

    fireEvent.change(search, { target: { value: 'ar' } })
    expect(screen.getByRole('button', { name: /Arabic/ })).toBeInTheDocument()
  })

  it('submits the exact selected codes only when the user saves', () => {
    const onSave = vi.fn()

    render(
      <ContentLanguageSelectionForm
        languages={languages}
        initialCodes={['en', 'fa']}
        isSaving={false}
        saveError={false}
        onSave={onSave}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Persian/ }))
    fireEvent.click(screen.getByRole('button', { name: /Japanese/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Save languages' }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith(['en', 'ja'])
  })

  it('warns when zero discovery languages are selected', () => {
    render(
      <ContentLanguageSelectionForm
        languages={languages}
        initialCodes={[]}
        isSaving={false}
        saveError={false}
        onSave={vi.fn()}
      />,
    )

    expect(
      screen.getByText(/Your personalized and Latest discovery feeds will be empty/),
    ).toBeInTheDocument()
  })

  it('uses Persian catalog names in Persian UI while preserving native names', async () => {
    await changeUiLanguage('fa')

    render(
      <ContentLanguageSelectionForm
        languages={languages}
        initialCodes={['ja']}
        isSaving={false}
        saveError={false}
        onSave={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /ژاپنی/ })).toBeInTheDocument()
    expect(screen.getByText('日本語')).toHaveAttribute('lang', 'ja')
  })
})
