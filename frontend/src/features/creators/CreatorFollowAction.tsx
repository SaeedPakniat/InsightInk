import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { Button } from '../../components/ui/Button'
import { useSession } from '../auth/session'
import { useCreatorFollowMutation, useCreatorFollowState } from './creatorFollowState'

type CreatorFollowActionProps = {
  creatorId: number
}

export function CreatorFollowAction({ creatorId }: CreatorFollowActionProps) {
  const { t } = useTranslation()
  const session = useSession()
  const followState = useCreatorFollowState(creatorId, Boolean(session.data))
  const mutation = useCreatorFollowMutation(creatorId)

  if (session.isPending) {
    return (
      <div className="creator-follow-action">
        <Button variant="secondary" disabled>
          {t('creator.followChecking')}
        </Button>
      </div>
    )
  }

  if (!session.data) {
    return (
      <div className="creator-follow-action">
        <Link
          className="button button--secondary"
          to="/login"
          state={{ from: `/creators/${creatorId}` }}
        >
          {t('creator.signInToFollow')}
        </Link>
      </div>
    )
  }

  if (followState.isPending) {
    return (
      <div className="creator-follow-action" role="status" aria-live="polite">
        <Button variant="secondary" disabled>
          {t('creator.followChecking')}
        </Button>
      </div>
    )
  }

  if (followState.isError) {
    return (
      <div className="creator-follow-action creator-follow-action--error">
        <span role="alert">{t('creator.followStateError')}</span>
        <Button variant="ghost" onClick={() => void followState.refetch()}>
          {t('common.retry')}
        </Button>
      </div>
    )
  }

  if (!followState.data.can_follow) {
    return (
      <div className="creator-follow-action creator-follow-action--self">
        <span aria-hidden="true">◆</span>
        <span>{t('creator.ownProfile')}</span>
      </div>
    )
  }

  const following = followState.data.following

  return (
    <div className="creator-follow-action">
      <Button
        variant={following ? 'secondary' : 'primary'}
        aria-pressed={following}
        disabled={mutation.isPending}
        onClick={() => mutation.mutate(!following)}
      >
        {mutation.isPending
          ? t('creator.followUpdating')
          : following
            ? t('creator.following')
            : t('creator.follow')}
      </Button>

      {mutation.isError && (
        <span className="creator-follow-action__error" role="alert">
          {t('creator.followUpdateError')}
        </span>
      )}
    </div>
  )
}
