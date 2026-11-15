import { useTranslation } from 'react-i18next'

import { Button } from '../../../components/ui/Button'
import { useSession } from '../../auth/session'
import { useHydrateViewerEngagement } from '../../engagement/viewerEngagement'
import { RecommendedIdea } from '../../feed/RecommendedIdea'
import { IdeaCardSkeleton } from '../IdeaCardSkeleton'
import { useRelatedIdeas } from './relatedIdeas'

export function RelatedIdeasSection({ ideaId }: { ideaId: number }) {
  const { t } = useTranslation()
  const session = useSession()
  const related = useRelatedIdeas(ideaId)
  const engagementIdeaIds = related.data?.map((item) => item.idea.id) ?? []

  useHydrateViewerEngagement(engagementIdeaIds, Boolean(session.data))

  return (
    <section className="related-ideas" aria-labelledby="related-ideas-title">
      <header className="related-ideas__header">
        <p className="eyebrow">{t('idea.relatedEyebrow')}</p>
        <h2 id="related-ideas-title">{t('idea.relatedTitle')}</h2>
        <p>{t('idea.relatedBody')}</p>
      </header>

      {related.isPending && (
        <div className="related-ideas__list" role="status" aria-live="polite">
          <span className="sr-only">{t('idea.relatedLoading')}</span>
          <IdeaCardSkeleton />
          <IdeaCardSkeleton />
        </div>
      )}

      {related.isError && (
        <div className="related-ideas__state" role="alert">
          <strong>{t('idea.relatedLoadErrorTitle')}</strong>
          <p>{t('idea.relatedLoadErrorBody')}</p>
          <Button variant="secondary" onClick={() => void related.refetch()}>
            {t('common.retry')}
          </Button>
        </div>
      )}

      {!related.isPending && !related.isError && related.data.length === 0 && (
        <div className="related-ideas__state">
          <strong>{t('idea.relatedEmptyTitle')}</strong>
          <p>{t('idea.relatedEmptyBody')}</p>
        </div>
      )}

      {related.data && related.data.length > 0 && (
        <div className="related-ideas__list">
          {related.data.map((item) => (
            <RecommendedIdea item={item} key={item.idea.id} />
          ))}
        </div>
      )}
    </section>
  )
}
