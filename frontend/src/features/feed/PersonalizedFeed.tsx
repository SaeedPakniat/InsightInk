import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { Button } from '../../components/ui/Button'
import { IdeaCardSkeleton } from '../ideas/IdeaCardSkeleton'
import { RecommendedIdea } from './RecommendedIdea'
import { useRecommendations } from './recommendations'

export function PersonalizedFeed() {
  const { i18n, t } = useTranslation()
  const recommendations = useRecommendations()
  const isEnglishUi = i18n.language.startsWith('en')

  if (recommendations.isPending) {
    return (
      <section className="personalized-feed" aria-labelledby="for-you-title">
        <FeedHeading count={null} />
        <div className="personalized-feed__list" role="status" aria-live="polite">
          <span className="sr-only">{t('recommendations.loading')}</span>
          <IdeaCardSkeleton />
          <IdeaCardSkeleton />
          <IdeaCardSkeleton />
        </div>
      </section>
    )
  }

  if (recommendations.isError) {
    return (
      <section className="personalized-feed" aria-labelledby="for-you-title">
        <FeedHeading count={null} />
        <div className="personalized-feed__state" role="alert">
          <strong>{t('recommendations.loadErrorTitle')}</strong>
          <p>{t('recommendations.loadErrorBody')}</p>
          <Button variant="secondary" onClick={() => void recommendations.refetch()}>
            {t('common.retry')}
          </Button>
        </div>
      </section>
    )
  }

  const items = recommendations.data
  const formattedCount = new Intl.NumberFormat(isEnglishUi ? 'en' : 'fa').format(items.length)

  return (
    <section className="personalized-feed" aria-labelledby="for-you-title">
      <FeedHeading count={formattedCount} />

      {items.length === 0 ? (
        <div className="personalized-feed__state">
          <strong>{t('recommendations.emptyTitle')}</strong>
          <p>{t('recommendations.emptyBody')}</p>
          <Link className="button button--secondary" to="/onboarding/interests">
            {t('home.interestsAction')}
          </Link>
        </div>
      ) : (
        <>
          <div className="personalized-feed__list">
            {items.map((item) => (
              <RecommendedIdea item={item} key={item.idea.id} />
            ))}
          </div>

          <div className="personalized-feed__end">
            <span className="personalized-feed__end-mark" aria-hidden="true">
              ✦
            </span>
            <strong>{t('recommendations.endTitle')}</strong>
            <p>{t('recommendations.endBody')}</p>
            <Link className="button button--ghost" to="/onboarding/interests">
              {t('recommendations.adjustInterests')}
            </Link>
          </div>
        </>
      )}
    </section>
  )
}

function FeedHeading({ count }: { count: string | null }) {
  const { t } = useTranslation()

  return (
    <header className="personalized-feed__header">
      <div>
        <p className="eyebrow">{t('recommendations.eyebrow')}</p>
        <h2 id="for-you-title">{t('recommendations.title')}</h2>
        <p>{t('recommendations.body')}</p>
      </div>

      {count !== null && (
        <span className="personalized-feed__count">
          {t('recommendations.count', { total: count })}
        </span>
      )}
    </header>
  )
}
