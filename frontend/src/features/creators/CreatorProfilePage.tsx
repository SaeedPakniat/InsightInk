import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { ApiError } from '../../api/client'
import { Button } from '../../components/ui/Button'
import { ErrorState } from '../../components/ui/Feedback'
import { useSession } from '../auth/session'
import { useHydrateViewerEngagement } from '../engagement/viewerEngagement'
import { IdeaCard } from '../ideas/IdeaCard'
import { IdeaCardSkeleton } from '../ideas/IdeaCardSkeleton'
import { formatUiNumber, getInitials } from '../ideas/presentation'
import { CreatorFollowAction } from './CreatorFollowAction'
import { flattenCreatorIdeas, useCreator, useCreatorIdeas } from './creatorQueries'

export function CreatorProfilePage() {
  const { creatorId: creatorIdParam } = useParams()
  const { i18n, t } = useTranslation()
  const session = useSession()
  const isEnglishUi = i18n.language.startsWith('en')
  const creatorId = Number(creatorIdParam)
  const validCreatorId = Number.isInteger(creatorId) && creatorId > 0

  const creatorQuery = useCreator(validCreatorId ? creatorId : 0, validCreatorId)
  const ideasQuery = useCreatorIdeas(validCreatorId ? creatorId : 0, validCreatorId)
  const ideas = ideasQuery.data ? flattenCreatorIdeas(ideasQuery.data.pages) : []

  useHydrateViewerEngagement(
    ideas.map((idea) => idea.id),
    Boolean(session.data && ideas.length > 0),
  )

  if (!validCreatorId) return <CreatorNotFound />

  if (creatorQuery.isPending) {
    return <CreatorProfileSkeleton />
  }

  if (creatorQuery.isError) {
    if (creatorQuery.error instanceof ApiError && creatorQuery.error.status === 404) {
      return <CreatorNotFound />
    }

    return (
      <section className="creator-profile-page">
        <div className="creator-profile-page__rail">
          <ErrorState
            title={t('creator.loadErrorTitle')}
            body={t('creator.loadErrorBody')}
            onRetry={() => void creatorQuery.refetch()}
          />
        </div>
      </section>
    )
  }

  const creator = creatorQuery.data
  const preferredBio = isEnglishUi ? creator.bio_en.trim() : creator.bio_fa.trim()
  const fallbackBio = isEnglishUi ? creator.bio_fa.trim() : creator.bio_en.trim()
  const bio = preferredBio || fallbackBio
  const bioLanguage = preferredBio
    ? isEnglishUi
      ? 'en'
      : 'fa'
    : fallbackBio
      ? isEnglishUi
        ? 'fa'
        : 'en'
      : null
  const bioDirection = bioLanguage === 'fa' ? 'rtl' : 'ltr'

  const ideaCount = formatUiNumber(creator.idea_count, isEnglishUi)
  const followerCount = formatUiNumber(creator.follower_count, isEnglishUi)
  const sparkCount = formatUiNumber(creator.spark_count, isEnglishUi)

  return (
    <section className="creator-profile-page">
      <div className="creator-profile-page__rail">
        <nav className="creator-profile-page__back" aria-label={t('creator.navigation')}>
          <Link to="/search">{t('creator.backToDiscovery')}</Link>
        </nav>

        <header className="creator-profile-page__hero">
          <div className="creator-profile-page__identity">
            {creator.avatar ? (
              <img
                className="creator-profile-page__avatar"
                src={creator.avatar}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span
                className="creator-profile-page__avatar creator-profile-page__avatar--fallback"
                aria-hidden="true"
              >
                {getInitials(creator.display_name)}
              </span>
            )}

            <div className="creator-profile-page__identity-copy">
              <p className="eyebrow">{t('creator.eyebrow')}</p>
              <div className="creator-profile-page__name-row">
                <h1 dir="auto">{creator.display_name}</h1>
                {creator.is_verified && (
                  <span className="creator-profile-page__verified">
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="m7.5 12.5 3 3 6-7" />
                    </svg>
                    {t('creator.verified')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {bio ? (
            <p
              className="creator-profile-page__bio"
              lang={bioLanguage ?? undefined}
              dir={bioDirection}
            >
              {bio}
            </p>
          ) : (
            <p className="creator-profile-page__bio creator-profile-page__bio--empty">
              {t('creator.noBio')}
            </p>
          )}

          <CreatorFollowAction creatorId={creator.id} />

          <dl className="creator-profile-page__stats">
            <div>
              <dt>{t('creator.ideas')}</dt>
              <dd>{ideaCount}</dd>
            </div>
            <div>
              <dt>{t('creator.followers')}</dt>
              <dd>{followerCount}</dd>
            </div>
            <div>
              <dt>{t('creator.sparks')}</dt>
              <dd>{sparkCount}</dd>
            </div>
          </dl>
        </header>

        <section className="creator-profile-page__ideas" aria-labelledby="creator-ideas-title">
          <header className="creator-profile-page__ideas-header">
            <div>
              <p className="eyebrow">{t('creator.publishedEyebrow')}</p>
              <h2 id="creator-ideas-title">{t('creator.publishedTitle')}</h2>
              <p>{t('creator.publishedBody')}</p>
            </div>
          </header>

          {ideasQuery.isPending && (
            <div className="creator-profile-page__list" role="status" aria-live="polite">
              <span className="sr-only">{t('creator.loadingIdeas')}</span>
              <IdeaCardSkeleton />
              <IdeaCardSkeleton />
            </div>
          )}

          {ideasQuery.isError && (
            <div className="personalized-feed__state" role="alert">
              <strong>{t('creator.ideasErrorTitle')}</strong>
              <p>{t('creator.ideasErrorBody')}</p>
              <Button variant="secondary" onClick={() => void ideasQuery.refetch()}>
                {t('common.retry')}
              </Button>
            </div>
          )}

          {!ideasQuery.isPending && !ideasQuery.isError && ideas.length === 0 && (
            <div className="personalized-feed__state creator-profile-page__empty">
              <span aria-hidden="true">◇</span>
              <strong>{t('creator.emptyIdeasTitle')}</strong>
              <p>{t('creator.emptyIdeasBody')}</p>
            </div>
          )}

          {ideas.length > 0 && (
            <>
              <div className="creator-profile-page__list">
                {ideas.map((idea) => (
                  <IdeaCard idea={idea} key={idea.id} />
                ))}
              </div>

              <div className="latest-feed-page__pagination">
                {ideasQuery.hasNextPage ? (
                  <>
                    <Button
                      variant="secondary"
                      disabled={ideasQuery.isFetchingNextPage}
                      onClick={() => void ideasQuery.fetchNextPage()}
                    >
                      {ideasQuery.isFetchingNextPage
                        ? t('creator.loadingMore')
                        : t('creator.loadMore')}
                    </Button>
                    <p>{t('creator.loadMoreHint')}</p>
                  </>
                ) : (
                  <div className="latest-feed-page__end">
                    <span aria-hidden="true">✦</span>
                    <strong>{t('creator.endTitle')}</strong>
                    <p>{t('creator.endBody')}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </section>
  )
}

function CreatorNotFound() {
  const { t } = useTranslation()

  return (
    <section className="creator-profile-page">
      <div className="creator-profile-page__rail">
        <div className="idea-detail-page__not-found">
          <span aria-hidden="true">404</span>
          <h1>{t('creator.notFoundTitle')}</h1>
          <p>{t('creator.notFoundBody')}</p>
          <Link className="button button--secondary" to="/search">
            {t('creator.backToDiscovery')}
          </Link>
        </div>
      </div>
    </section>
  )
}

function CreatorProfileSkeleton() {
  const { t } = useTranslation()

  return (
    <section className="creator-profile-page" role="status" aria-live="polite">
      <span className="sr-only">{t('creator.loading')}</span>
      <div className="creator-profile-page__rail" aria-hidden="true">
        <div className="creator-profile-skeleton">
          <span className="idea-skeleton creator-profile-skeleton__avatar" />
          <span className="idea-skeleton creator-profile-skeleton__title" />
          <span className="idea-skeleton creator-profile-skeleton__line" />
          <span className="idea-skeleton creator-profile-skeleton__line creator-profile-skeleton__line--short" />
        </div>
      </div>
    </section>
  )
}
