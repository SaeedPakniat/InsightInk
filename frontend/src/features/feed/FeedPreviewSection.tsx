import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { getFeedPage } from '../../api/feed'
import { Button } from '../../components/ui/Button'
import { IdeaCard } from '../ideas/IdeaCard'
import { IdeaCardSkeleton } from '../ideas/IdeaCardSkeleton'

const FEED_PREVIEW_QUERY_KEY = ['feed', 'preview'] as const

export function FeedPreviewSection() {
  const { t } = useTranslation()
  const feedQuery = useQuery({
    queryKey: FEED_PREVIEW_QUERY_KEY,
    queryFn: getFeedPage,
    staleTime: 60_000,
  })

  return (
    <section className="feed-preview" aria-labelledby="feed-preview-title">
      <div className="feed-preview__header">
        <div>
          <p className="eyebrow">{t('feed.previewEyebrow')}</p>
          <h2 id="feed-preview-title">{t('feed.previewTitle')}</h2>
          <p>{t('feed.previewBody')}</p>
        </div>
      </div>

      {feedQuery.isPending && (
        <div
          className="feed-preview__list"
          role="status"
          aria-live="polite"
          aria-label={t('feed.loading')}
        >
          <IdeaCardSkeleton />
          <IdeaCardSkeleton />
        </div>
      )}

      {feedQuery.isError && (
        <div className="feed-preview__state" role="alert">
          <strong>{t('feed.loadErrorTitle')}</strong>
          <p>{t('feed.loadErrorBody')}</p>
          <Button variant="secondary" onClick={() => void feedQuery.refetch()}>
            {t('common.retry')}
          </Button>
        </div>
      )}

      {feedQuery.data && feedQuery.data.results.length === 0 && (
        <div className="feed-preview__state">
          <strong>{t('feed.emptyTitle')}</strong>
          <p>{t('feed.emptyBody')}</p>
        </div>
      )}

      {feedQuery.data && feedQuery.data.results.length > 0 && (
        <div className="feed-preview__list">
          {feedQuery.data.results.slice(0, 2).map((idea) => (
            <IdeaCard idea={idea} key={idea.id} />
          ))}
        </div>
      )}
    </section>
  )
}
