import { useTranslation } from 'react-i18next'

import { useAvailableLanguages } from './languageQueries'

type ContentLanguageBadgeProps = {
  code: string
}

export function ContentLanguageBadge({ code }: ContentLanguageBadgeProps) {
  const { i18n, t } = useTranslation()
  const catalog = useAvailableLanguages()
  const isEnglishUi = i18n.language.startsWith('en')
  const normalizedCode = code.toLowerCase()
  const baseCode = normalizedCode.split('-')[0]
  const language = catalog.data?.find(
    (item) => item.code.toLowerCase() === normalizedCode || item.code.toLowerCase() === baseCode,
  )

  const label = language ? (isEnglishUi ? language.name_en : language.name_fa) : code.toUpperCase()

  return (
    <span
      className="content-language-badge"
      title={language ? language.native_name : undefined}
      aria-label={t('idea.contentLanguage', { language: label })}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M3.7 9h16.6M3.7 15h16.6M12 3.5c2.1 2.3 3.2 5.1 3.2 8.5S14.1 18.2 12 20.5M12 3.5C9.9 5.8 8.8 8.6 8.8 12s1.1 6.2 3.2 8.5" />
      </svg>
      {label}
    </span>
  )
}
