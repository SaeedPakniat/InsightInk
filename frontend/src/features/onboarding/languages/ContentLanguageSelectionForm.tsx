import { useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import type { ContentLanguage } from '../../../api/types'
import { Button } from '../../../components/ui/Button'
import { FormField } from '../../../components/ui/FormField'

type ContentLanguageSelectionFormProps = {
  languages: ContentLanguage[]
  initialCodes: string[]
  isSaving: boolean
  saveError: boolean
  onSave: (codes: string[]) => void
}

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase()
}

export function ContentLanguageSelectionForm({
  languages,
  initialCodes,
  isSaving,
  saveError,
  onSave,
}: ContentLanguageSelectionFormProps) {
  const { i18n, t } = useTranslation()
  const isEnglishUi = i18n.language.startsWith('en')
  const [selectedCodes, setSelectedCodes] = useState<string[]>(initialCodes)
  const [query, setQuery] = useState('')

  const visibleLanguages = useMemo(() => {
    const search = normalizeSearch(query)
    if (!search) return languages

    return languages.filter((language) =>
      [language.code, language.name_en, language.name_fa, language.native_name].some((value) =>
        normalizeSearch(value).includes(search),
      ),
    )
  }, [languages, query])

  const toggleLanguage = (code: string) => {
    setSelectedCodes((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
    )
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSave(selectedCodes)
  }

  const selectedCount = new Intl.NumberFormat(isEnglishUi ? 'en' : 'fa').format(
    selectedCodes.length,
  )
  const totalCount = new Intl.NumberFormat(isEnglishUi ? 'en' : 'fa').format(languages.length)

  return (
    <form className="content-languages-form" onSubmit={handleSubmit}>
      <div className="content-languages-form__summary" aria-live="polite">
        <span>{t('onboarding.languages.selectedCount', { count: selectedCount })}</span>
        <span>{t('onboarding.languages.availableCount', { count: totalCount })}</span>
      </div>

      <div className="content-languages-form__search">
        <FormField
          type="search"
          value={query}
          label={t('onboarding.languages.searchLabel')}
          placeholder={t('onboarding.languages.searchPlaceholder')}
          autoComplete="off"
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {selectedCodes.length === 0 && (
        <p className="content-languages-form__warning" role="status">
          {t('onboarding.languages.emptyWarning')}
        </p>
      )}

      {saveError && (
        <p className="form-error" role="alert">
          {t('onboarding.languages.saveError')}
        </p>
      )}

      <div className="content-languages-form__actions">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? t('onboarding.languages.saving') : t('onboarding.languages.continue')}
        </Button>
      </div>

      {visibleLanguages.length > 0 ? (
        <div className="content-language-grid">
          {visibleLanguages.map((language) => {
            const selected = selectedCodes.includes(language.code)
            const displayName = isEnglishUi ? language.name_en : language.name_fa
            const showNative =
              normalizeSearch(displayName) !== normalizeSearch(language.native_name)

            return (
              <button
                className="content-language-option"
                type="button"
                key={language.code}
                aria-pressed={selected}
                onClick={() => toggleLanguage(language.code)}
              >
                <span className="content-language-option__check" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d="m6.5 12.5 3.3 3.3 7.7-8" />
                  </svg>
                </span>

                <span className="content-language-option__copy">
                  <span className="content-language-option__topline">
                    <strong>{displayName}</strong>
                    <code>{language.code}</code>
                  </span>
                  {showNative && (
                    <span
                      className="content-language-option__native"
                      lang={language.code}
                      dir="auto"
                    >
                      {language.native_name}
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="content-languages-form__no-results">
          <strong>{t('onboarding.languages.noResultsTitle')}</strong>
          <p>{t('onboarding.languages.noResultsBody')}</p>
        </div>
      )}
    </form>
  )
}
