import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { startConversation } from '../../api/messaging'
import { Button } from '../../components/ui/Button'
import { useSession } from '../auth/session'
import { useCreatorFollowState } from '../creators/creatorFollowState'
import { CONVERSATIONS_QUERY_KEY } from './messagingQueries'

export function StartConversationAction({ creatorId }: { creatorId: number }) {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const session = useSession()
  const followState = useCreatorFollowState(creatorId, Boolean(session.data))

  const mutation = useMutation({
    mutationFn: () => startConversation(creatorId),
    onSuccess: async (conversation) => {
      await queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY })
      navigate(`/messages/${conversation.id}`)
    },
  })

  if (session.isPending) {
    return (
      <div className="creator-message-action">
        <Button variant="secondary" disabled>
          {t('messaging.checkingAccount')}
        </Button>
      </div>
    )
  }

  if (!session.data) {
    return (
      <div className="creator-message-action">
        <Link
          className="button button--secondary"
          to="/login"
          state={{
            from: `${location.pathname}${location.search}${location.hash}`,
          }}
        >
          {t('messaging.signInToMessage')}
        </Link>
      </div>
    )
  }

  if (followState.isPending || followState.isError || !followState.data?.can_follow) {
    return null
  }

  return (
    <div className="creator-message-action">
      <Button variant="secondary" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
        {mutation.isPending ? t('messaging.startingConversation') : t('messaging.messageCreator')}
      </Button>
      {mutation.isError && (
        <span className="creator-message-action__error" role="alert">
          {t('messaging.startConversationError')}
        </span>
      )}
    </div>
  )
}
