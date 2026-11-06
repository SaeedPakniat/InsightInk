import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useSession } from '../auth/session'
import { useSaveMutation, useSparkMutation, useViewerEngagementState } from './viewerEngagement'

type IdeaEngagementActionsProps = {
  ideaId: number
  variant?: 'card' | 'detail'
}

export function IdeaEngagementActions({ ideaId, variant = 'card' }: IdeaEngagementActionsProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const session = useSession()
  const engagement = useViewerEngagementState(ideaId)
  const sparkMutation = useSparkMutation(ideaId)
  const saveMutation = useSaveMutation(ideaId)

  if (session.isPending) {
    return <div className={`idea-engagement idea-engagement--${variant}`} aria-hidden="true" />
  }

  if (!session.data) {
    if (variant === 'card') return null

    return (
      <div className="idea-engagement idea-engagement--detail idea-engagement--anonymous">
        <Link className="button button--secondary" to="/login" state={{ from: location.pathname }}>
          {t('engagement.signIn')}
        </Link>
      </div>
    )
  }

  const state = engagement.data
  const isHydrated = Boolean(state)
  const sparked = state?.sparked ?? false
  const saved = state?.saved ?? false
  const isBusy = sparkMutation.isPending || saveMutation.isPending
  const hasError = sparkMutation.isError || saveMutation.isError

  return (
    <div className={`idea-engagement idea-engagement--${variant}`}>
      <div className="idea-engagement__buttons">
        <button
          className="idea-engagement__button idea-engagement__button--spark"
          type="button"
          aria-pressed={sparked}
          aria-label={sparked ? t('engagement.unspark') : t('engagement.spark')}
          title={sparked ? t('engagement.unspark') : t('engagement.spark')}
          disabled={!isHydrated || isBusy}
          onClick={() => sparkMutation.mutate(!sparked)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="m12 3 1.45 4.3L18 8.75l-4.05 2.5L14.6 16 12 13.55 9.4 16l.65-4.75L6 8.75l4.55-1.45z" />
          </svg>
          <span>{sparked ? t('engagement.sparked') : t('engagement.spark')}</span>
        </button>

        <button
          className="idea-engagement__button idea-engagement__button--save"
          type="button"
          aria-pressed={saved}
          aria-label={saved ? t('engagement.unsave') : t('engagement.save')}
          title={saved ? t('engagement.unsave') : t('engagement.save')}
          disabled={!isHydrated || isBusy}
          onClick={() => saveMutation.mutate(!saved)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6.5 4.5h11v15l-5.5-3.2-5.5 3.2z" />
          </svg>
          <span>{saved ? t('engagement.saved') : t('engagement.save')}</span>
        </button>
      </div>

      {isBusy && (
        <span className="sr-only" role="status">
          {t('engagement.updating')}
        </span>
      )}

      {hasError && (
        <p className="idea-engagement__error" role="alert">
          {t('engagement.updateError')}
        </p>
      )}
    </div>
  )
}
