import { useTranslation } from 'react-i18next'

import { Button } from './Button'

function LoadingFeedback({ label }: { label: string }) {
  return (
    <div className="feedback feedback--center" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  )
}

export function LoadingScreen() {
  const { t } = useTranslation()
  return <LoadingFeedback label={t('common.loadingSession')} />
}

export function RouteLoadingScreen() {
  const { t } = useTranslation()
  return <LoadingFeedback label={t('common.loadingPage')} />
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
