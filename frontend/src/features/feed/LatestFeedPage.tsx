import { useTranslation } from 'react-i18next'

import { Button } from '../../components/ui/Button'
import { FeedModeNav } from './FeedModeNav'
import { flattenUniqueIdeas, useLatestFeed } from './latestFeed'
import { IdeaCard } from '../ideas/IdeaCard'
import { IdeaCardSkeleton } from '../ideas/IdeaCardSkeleton'

export function LatestFeedPage() {
  const { i18n, t } = useTranslation()
  const feed = useLatestFeed()
  const isEnglishUi = i18n.language.startsWith('en')

  const ideas = feed.data ? flattenUniqueIdeas(feed.data.pages) : []
  const formattedCount = new Intl.NumberFormat(isEnglishUi ? 'en' : 'fa').format(ideas.length)

  return (
    <section className="latest-feed-page">
      <div className="latest-feed-page__rail">
        <FeedModeNav />

        <header className="latest-feed-page__header">
          <p className="eyebrow">{t('feed.latestEyebrow')}</p>
          <h1>{t('feed.latestTitle')}</h1>
          <p>{t('feed.latestBody')}</p>

          {ideas.length > 0 && (
            <span className="personalized-feed__count">
              {t('feed.loadedCount', { total: formattedCount })}
            </span>
          )}
        </header>

        {feed.isPending && (
          <div className="latest-feed-page__list" role="status" aria-live="polite">
            <span className="sr-only">{t('feed.loading')}</span>
            <IdeaCardSkeleton />
            <IdeaCardSkeleton />
            <IdeaCardSkeleton />
          </div>
        )}

        {feed.isError && (
          <div className="personalized-feed__state" role="alert">
            <strong>{t('feed.loadErrorTitle')}</strong>
            <p>{t('feed.loadErrorBody')}</p>
            <Button variant="secondary" onClick={() => void feed.refetch()}>
              {t('common.retry')}
            </Button>
          </div>
        )}

        {!feed.isPending && !feed.isError && ideas.length === 0 && (
          <div className="personalized-feed__state">
            <strong>{t('feed.emptyTitle')}</strong>
            <p>{t('feed.emptyBody')}</p>
          </div>
        )}

        {ideas.length > 0 && (
          <>
            <div className="latest-feed-page__list">
              {ideas.map((idea) => (
                <IdeaCard idea={idea} key={idea.id} />
              ))}
            </div>

            <div className="latest-feed-page__pagination">
              {feed.hasNextPage ? (
                <>
                  <Button
                    variant="secondary"
                    disabled={feed.isFetchingNextPage}
                    onClick={() => void feed.fetchNextPage()}
                  >
                    {feed.isFetchingNextPage ? t('feed.loadingMore') : t('feed.loadMore')}
                  </Button>
                  <p>{t('feed.loadMoreHint')}</p>
                </>
              ) : (
                <div className="latest-feed-page__end">
                  <span aria-hidden="true">✦</span>
                  <strong>{t('feed.endTitle')}</strong>
                  <p>{t('feed.endBody')}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
