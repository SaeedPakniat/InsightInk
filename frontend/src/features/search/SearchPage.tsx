import { useRef, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import type { SearchFilters, SourceType } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { useSession } from '../auth/session'
import { useHydrateViewerEngagement } from '../engagement/viewerEngagement'
import { IdeaCard } from '../ideas/IdeaCard'
import { IdeaCardSkeleton } from '../ideas/IdeaCardSkeleton'
import { useTopics } from '../onboarding/interests'
import { flattenUniqueSearchResults, useSearchResults } from './searchResults'

const SOURCE_TYPES: SourceType[] = ['book', 'article', 'movie', 'podcast']

function parseSourceType(value: string | null): SourceType | undefined {
  return SOURCE_TYPES.find((type) => type === value)
}

export function SearchPage() {
  const { i18n, t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const session = useSession()
  const topics = useTopics()
  const isEnglishUi = i18n.language.startsWith('en')

  const query = searchParams.get('q') ?? ''
  const sourceType = parseSourceType(searchParams.get('type'))
  const topic = searchParams.get('topic') ?? ''
  const formRef = useRef<HTMLFormElement>(null)

  const filters: SearchFilters = {
    ...(query ? { q: query } : {}),
    ...(sourceType ? { type: sourceType } : {}),
    ...(topic ? { topic } : {}),
  }

  const resultsQuery = useSearchResults(filters)
  const ideas = resultsQuery.data ? flattenUniqueSearchResults(resultsQuery.data.pages) : []

  useHydrateViewerEngagement(
    ideas.map((idea) => idea.id),
    Boolean(session.data),
  )

  const formattedCount = new Intl.NumberFormat(isEnglishUi ? 'en' : 'fa').format(ideas.length)

  const updateParams = (updates: {
    q?: string | null
    type?: string | null
    topic?: string | null
  }) => {
    const next = new URLSearchParams(searchParams)

    for (const [key, value] of Object.entries(updates)) {
      const normalized = value?.trim()
      if (normalized) next.set(key, normalized)
      else next.delete(key)
    }

    setSearchParams(next)
  }

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    updateParams({ q: String(formData.get('q') ?? '') })
  }

  const clearSearch = () => {
    formRef.current?.reset()
    setSearchParams(new URLSearchParams())
  }

  const hasFilters = Boolean(query || sourceType || topic)

  return (
    <section className="search-page">
      <div className="search-page__rail">
        <nav className="search-page__back" aria-label={t('search.navigation')}>
          <Link to={session.data ? '/app' : '/'}>
            <span aria-hidden="true">{isEnglishUi ? '←' : '→'}</span>
            {session.data ? t('search.backToFeed') : t('search.backHome')}
          </Link>
        </nav>

        <header className="search-page__header">
          <p className="eyebrow">{t('search.eyebrow')}</p>
          <h1>{t('search.title')}</h1>
          <p>{t('search.body')}</p>
        </header>

        <form ref={formRef} className="search-form" role="search" onSubmit={submitSearch}>
          <label className="search-form__label" htmlFor="idea-search-query">
            {t('search.queryLabel')}
          </label>

          <div className="search-form__query-row">
            <div className="search-form__input-wrap">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <circle cx="10.5" cy="10.5" r="6.5" />
                <path d="m15.5 15.5 5 5" />
              </svg>
              <input
                key={query}
                id="idea-search-query"
                name="q"
                className="search-form__input"
                type="search"
                defaultValue={query}
                maxLength={200}
                placeholder={t('search.placeholder')}
                autoComplete="off"
              />
            </div>
            <Button type="submit">{t('search.submit')}</Button>
          </div>

          <div className="search-form__filters">
            <label>
              <span>{t('search.sourceType')}</span>
              <select
                value={sourceType ?? ''}
                onChange={(event) => updateParams({ type: event.target.value })}
              >
                <option value="">{t('search.allFormats')}</option>
                {SOURCE_TYPES.map((type) => (
                  <option value={type} key={type}>
                    {t(`idea.format.${type}`)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>{t('search.topic')}</span>
              <select
                value={topic}
                disabled={topics.isPending || topics.isError}
                onChange={(event) => updateParams({ topic: event.target.value })}
              >
                <option value="">
                  {topics.isError ? t('search.topicsUnavailable') : t('search.allTopics')}
                </option>
                {topics.data?.map((item) => (
                  <option value={item.slug} key={item.id}>
                    {isEnglishUi ? item.name_en : item.name_fa}
                  </option>
                ))}
              </select>
            </label>

            {hasFilters && (
              <button className="search-form__clear" type="button" onClick={clearSearch}>
                {t('search.clear')}
              </button>
            )}
          </div>
        </form>

        <div className="search-page__language-note">
          <span aria-hidden="true">◎</span>
          {session.data ? (
            <p>
              {t('search.languageSignedIn')}{' '}
              <Link to="/onboarding/languages">{t('search.editLanguages')}</Link>
            </p>
          ) : (
            <p>{t('search.languageAnonymous')}</p>
          )}
        </div>

        <header className="search-results__header">
          <div>
            <p className="eyebrow">{t('search.resultsEyebrow')}</p>
            <h2>{query ? t('search.resultsFor', { query }) : t('search.browseTitle')}</h2>
          </div>

          {!resultsQuery.isPending && !resultsQuery.isError && ideas.length > 0 && (
            <span className="personalized-feed__count">
              {t('search.loadedCount', { total: formattedCount })}
            </span>
          )}
        </header>

        {resultsQuery.isPending && (
          <div className="search-results__list" role="status" aria-live="polite">
            <span className="sr-only">{t('search.loading')}</span>
            <IdeaCardSkeleton />
            <IdeaCardSkeleton />
            <IdeaCardSkeleton />
          </div>
        )}

        {resultsQuery.isError && (
          <div className="personalized-feed__state" role="alert">
            <strong>{t('search.loadErrorTitle')}</strong>
            <p>{t('search.loadErrorBody')}</p>
            <Button variant="secondary" onClick={() => void resultsQuery.refetch()}>
              {t('common.retry')}
            </Button>
          </div>
        )}

        {!resultsQuery.isPending && !resultsQuery.isError && ideas.length === 0 && (
          <div className="personalized-feed__state search-results__empty">
            <span aria-hidden="true">∅</span>
            <strong>{query ? t('search.emptyQueryTitle') : t('search.emptyTitle')}</strong>
            <p>{query ? t('search.emptyQueryBody', { query }) : t('search.emptyBody')}</p>
            {hasFilters && (
              <Button variant="secondary" onClick={clearSearch}>
                {t('search.clear')}
              </Button>
            )}
          </div>
        )}

        {ideas.length > 0 && (
          <>
            <div className="search-results__list">
              {ideas.map((idea) => (
                <IdeaCard idea={idea} key={idea.id} />
              ))}
            </div>

            <div className="latest-feed-page__pagination">
              {resultsQuery.hasNextPage ? (
                <>
                  <Button
                    variant="secondary"
                    disabled={resultsQuery.isFetchingNextPage}
                    onClick={() => void resultsQuery.fetchNextPage()}
                  >
                    {resultsQuery.isFetchingNextPage
                      ? t('search.loadingMore')
                      : t('search.loadMore')}
                  </Button>
                  <p>{t('search.loadMoreHint')}</p>
                </>
              ) : (
                <div className="latest-feed-page__end">
                  <span aria-hidden="true">✦</span>
                  <strong>{t('search.endTitle')}</strong>
                  <p>{t('search.endBody')}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
