import { useTranslation } from 'react-i18next'

import type { SourceType } from '../../api/types'

type FormatBadgeProps = {
  type: SourceType
}

function SourceIcon({ type }: FormatBadgeProps) {
  if (type === 'book') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21z" />
        <path d="M4 5.5v15" />
      </svg>
    )
  }

  if (type === 'podcast') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
        <rect x="2" y="14" width="5" height="7" rx="2" />
        <rect x="17" y="14" width="5" height="7" rx="2" />
      </svg>
    )
  }

  if (type === 'movie') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M7 4v16M17 4v16M3 9h4M17 9h4M3 15h4M17 15h4" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M7 3h7l5 5v13H7z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </svg>
  )
}

export function FormatBadge({ type }: FormatBadgeProps) {
  const { t } = useTranslation()

  return (
    <span className={`format-badge format-badge--${type}`}>
      <SourceIcon type={type} />
      {t(`idea.format.${type}`)}
    </span>
  )
}
