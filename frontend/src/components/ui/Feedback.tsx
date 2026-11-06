import { useTranslation } from 'react-i18next'

import { Button } from './Button'

export function LoadingScreen() {
  const { t } = useTranslation()

  return (
    <div className="feedback feedback--center" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p>{t('common.loadingSession')}</p>
    </div>
  )
}

type ErrorStateProps = {
  title: string
  body: string
  onRetry?: () => void
}

export function ErrorState({ title, body, onRetry }: ErrorStateProps) {
  const { t } = useTranslation()

  return (
    <div className="feedback" role="alert">
      <strong>{title}</strong>
      <p>{body}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  )
}
