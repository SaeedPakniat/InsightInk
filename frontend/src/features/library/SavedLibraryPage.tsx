import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { Button } from '../../components/ui/Button'
import { useHydrateViewerEngagement } from '../engagement/viewerEngagement'
import { ReaderNav } from '../home/ReaderNav'
import { IdeaCard } from '../ideas/IdeaCard'
import { IdeaCardSkeleton } from '../ideas/IdeaCardSkeleton'
import { useSavedLibrary } from './savedLibrary'

export function SavedLibraryPage() {
  const { i18n, t } = useTranslation()
  const library = useSavedLibrary()
  const isEnglishUi = i18n.language.startsWith('en')
  const items = library.data ?? []

  useHydrateViewerEngagement(
    items.map((item) => item.idea.id),
    items.length > 0,
  )

  const formattedCount = new Intl.NumberFormat(isEnglishUi ? 'en' : 'fa').format(items.length)

  return (
    <section className="latest-feed-page saved-library-page">
      <div className="latest-feed-page__rail">
        <ReaderNav />

        <header className="latest-feed-page__header">
          <p className="eyebrow">{t('library.eyebrow')}</p>
          <h1>{t('library.title')}</h1>
          <p>{t('library.body')}</p>

          {!library.isPending && !library.isError && items.length > 0 && (
            <span className="personalized-feed__count">
              {t('library.count', { total: formattedCount })}
            </span>
          )}
        </header>

        {library.isPending && (
          <div className="latest-feed-page__list" role="status" aria-live="polite">
            <span className="sr-only">{t('library.loading')}</span>
            <IdeaCardSkeleton />
            <IdeaCardSkeleton />
            <IdeaCardSkeleton />
          </div>
        )}

        {library.isError && (
          <div className="personalized-feed__state" role="alert">
            <strong>{t('library.loadErrorTitle')}</strong>
            <p>{t('library.loadErrorBody')}</p>
            <Button variant="secondary" onClick={() => void library.refetch()}>
              {t('common.retry')}
            </Button>
          </div>
        )}

        {!library.isPending && !library.isError && items.length === 0 && (
          <div className="personalized-feed__state saved-library-page__empty">
            <span className="saved-library-page__empty-mark" aria-hidden="true">
              ◇
            </span>
            <strong>{t('library.emptyTitle')}</strong>
            <p>{t('library.emptyBody')}</p>
            <Link className="button button--secondary" to="/explore">
              {t('library.exploreAction')}
            </Link>
          </div>
        )}

        {items.length > 0 && (
          <div className="latest-feed-page__list">
            {items.map((item) => {
              const savedDate = new Intl.DateTimeFormat(isEnglishUi ? 'en' : 'fa', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              }).format(new Date(item.saved_at))

              return (
                <div className="saved-library-item" key={item.idea.id}>
                  <div className="saved-library-item__meta">
                    <span aria-hidden="true">◆</span>
                    <span>{t('library.savedOn', { date: savedDate })}</span>
                  </div>
                  <IdeaCard idea={item.idea} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
