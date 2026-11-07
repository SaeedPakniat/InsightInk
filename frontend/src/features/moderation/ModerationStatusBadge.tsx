import { useTranslation } from 'react-i18next'

import type { ReportStatus } from '../../api/types'

type ModerationStatusBadgeProps = {
  status: ReportStatus
}

export function ModerationStatusBadge({ status }: ModerationStatusBadgeProps) {
  const { t } = useTranslation()

  return (
    <span className={`moderation-status moderation-status--${status}`}>
      {t(`moderation.status.${status}`)}
    </span>
  )
}
