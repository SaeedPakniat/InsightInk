import { useTranslation } from 'react-i18next'

import type { CreatorIdeaStatus } from '../../api/types'

export function StudioStatusBadge({ status }: { status: CreatorIdeaStatus }) {
  const { t } = useTranslation()

  return (
    <span className={`studio-status studio-status--${status}`}>{t(`studio.status.${status}`)}</span>
  )
}
