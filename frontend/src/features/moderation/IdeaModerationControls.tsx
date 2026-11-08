import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { moderateIdeaDirectly } from '../../api/moderation'
import type { CreatorIdeaStatus } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { useSession } from '../auth/session'

export function IdeaModerationControls({
  ideaId,
  initialStatus = 'published',
}: {
  ideaId: number
  initialStatus?: CreatorIdeaStatus
}) {
  const { t } = useTranslation()
  const session = useSession()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<CreatorIdeaStatus>(initialStatus)
  const [note, setNote] = useState('')
  const [confirming, setConfirming] = useState<'hide' | 'restore' | null>(null)

  const mutation = useMutation({
    mutationFn: (action: 'hide' | 'restore') =>
      moderateIdeaDirectly(ideaId, action, note.trim() ? { note: note.trim() } : {}),
    onSuccess: (data) => {
      setStatus(data.status)
      setConfirming(null)
      setNote('')

      void queryClient.invalidateQueries({
        queryKey: ['idea', ideaId],
        refetchType: 'none',
      })
      void queryClient.invalidateQueries({ queryKey: ['feed'] })
      void queryClient.invalidateQueries({ queryKey: ['recommendations'] })
      void queryClient.invalidateQueries({ queryKey: ['search'] })
      void queryClient.invalidateQueries({ queryKey: ['creator'] })
      void queryClient.invalidateQueries({ queryKey: ['library'] })
    },
  })

  if (!session.data?.capabilities.can_moderate) return null

  if (status !== 'published' && status !== 'hidden') return null

  const action = status === 'hidden' ? 'restore' : 'hide'

  return (
    <section className="idea-moderation-controls" aria-label={t('moderation.ideaControls')}>
      <div>
        <span className="eyebrow">{t('moderation.ideaControls')}</span>
        <strong>
          {status === 'hidden'
            ? t('moderation.ideaHiddenState')
            : t('moderation.ideaPublishedState')}
        </strong>
      </div>

      {confirming ? (
        <div className="idea-moderation-controls__confirm">
          <label>
            <span>{t('moderation.noteLabel')}</span>
            <textarea
              value={note}
              rows={3}
              maxLength={2000}
              disabled={mutation.isPending}
              placeholder={t('moderation.notePlaceholder')}
              onChange={(event) => {
                setNote(event.target.value)
                mutation.reset()
              }}
            />
          </label>

          <div className="idea-moderation-controls__actions">
            <Button
              variant={action === 'hide' ? 'secondary' : 'primary'}
              disabled={mutation.isPending}
              onClick={() => mutation.mutate(action)}
            >
              {mutation.isPending
                ? t('moderation.updating')
                : action === 'hide'
                  ? t('moderation.hideIdeaDirectly')
                  : t('moderation.restoreIdeaDirectly')}
            </Button>
            <Button
              variant="ghost"
              disabled={mutation.isPending}
              onClick={() => setConfirming(null)}
            >
              {t('common.cancel')}
            </Button>
          </div>

          {mutation.isError && (
            <p className="form-error" role="alert">
              {t('moderation.ideaActionError')}
            </p>
          )}
        </div>
      ) : (
        <Button variant="secondary" onClick={() => setConfirming(action)}>
          {action === 'hide'
            ? t('moderation.hideIdeaDirectly')
            : t('moderation.restoreIdeaDirectly')}
        </Button>
      )}
    </section>
  )
}
