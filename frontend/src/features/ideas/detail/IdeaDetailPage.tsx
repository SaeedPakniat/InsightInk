import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { ApiError } from '../../../api/client'
import { ErrorState } from '../../../components/ui/Feedback'
import { useSession } from '../../auth/session'
import { CommentsSection } from '../../comments/CommentsSection'
import { IdeaEngagementActions } from '../../engagement/IdeaEngagementActions'
import { useHydrateViewerEngagement } from '../../engagement/viewerEngagement'
import { ContentLanguageBadge } from '../../languages/ContentLanguageBadge'
import { FormatBadge } from '../FormatBadge'
import { formatUiNumber, getContentDirection, getInitials, getReadMinutes } from '../presentation'
import { useIdea } from './ideaQuery'

export function IdeaDetailPage() {
  const { ideaId: ideaIdParam } = useParams()
  const { i18n, t } = useTranslation()
  const isEnglishUi = i18n.language.startsWith('en')
  const ideaId = Number(ideaIdParam)
  const validIdeaId = Number.isInteger(ideaId) && ideaId > 0
  const ideaQuery = useIdea(validIdeaId ? ideaId : 0)
  const session = useSession()

  useHydrateViewerEngagement(
    ideaQuery.data ? [ideaQuery.data.id] : [],
    Boolean(session.data && ideaQuery.data),
  )

  if (!validIdeaId) {
    return <IdeaNotFound />
  }

  if (ideaQuery.isPending) {
    return <IdeaDetailSkeleton />
  }

  if (ideaQuery.isError) {
    if (ideaQuery.error instanceof ApiError && ideaQuery.error.status === 404) {
      return <IdeaNotFound />
    }

    return (
      <section className="idea-detail-page">
        <div className="idea-detail-page__rail">
          <ErrorState
            title={t('idea.detailLoadErrorTitle')}
            body={t('idea.detailLoadErrorBody')}
            onRetry={() => void ideaQuery.refetch()}
          />
        </div>
      </section>
    )
  }

  const idea = ideaQuery.data
  const contentDirection = getContentDirection(idea.language)
  const readMinutes = getReadMinutes(idea.estimated_read_seconds)
  const formattedReadMinutes = formatUiNumber(readMinutes, isEnglishUi)
  const publishedDate = idea.published_at
    ? new Intl.DateTimeFormat(isEnglishUi ? 'en' : 'fa', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date(idea.published_at))
    : null

  return (
    <article className="idea-detail-page">
      <div className="idea-detail-page__rail">
        <nav className="idea-detail-page__back" aria-label={t('idea.detailNavigation')}>
          <Link to="/">{t('idea.backHome')}</Link>
        </nav>

        <header className="idea-detail-page__header">
          <div className="idea-detail-page__meta">
            <FormatBadge type={idea.source.type} />
            <ContentLanguageBadge code={idea.language} />
            <span className="idea-detail-page__read-time">
              {t('idea.readTime', { minutes: formattedReadMinutes })}
            </span>
            {publishedDate && (
              <span className="idea-detail-page__published">
                {t('idea.publishedOn', { date: publishedDate })}
              </span>
            )}
          </div>

          <p className="eyebrow idea-detail-page__eyebrow">{t('idea.detailEyebrow')}</p>
          <div className="idea-detail-page__heading" lang={idea.language} dir={contentDirection}>
            <h1>{idea.title}</h1>
          </div>

          {idea.topics.length > 0 && (
            <div className="idea-detail-page__topics" aria-label={t('idea.topicsLabel')}>
              {idea.topics.map((topic) => (
                <span className="idea-topic" key={topic.id}>
                  {isEnglishUi ? topic.name_en : topic.name_fa}
                </span>
              ))}
            </div>
          )}

          <IdeaEngagementActions ideaId={idea.id} variant="detail" />
        </header>

        <div
          className="idea-detail-page__body"
          lang={idea.language}
          dir={contentDirection}
          data-content-direction={contentDirection}
        >
          <p>{idea.body}</p>
        </div>

        <section className="idea-detail-page__context" aria-label={t('idea.contextLabel')}>
          <div className="idea-detail-page__creator">
            {idea.creator.avatar ? (
              <img
                className="idea-detail-page__avatar"
                src={idea.creator.avatar}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span
                className="idea-detail-page__avatar idea-detail-page__avatar--fallback"
                aria-hidden="true"
              >
                {getInitials(idea.creator.display_name)}
              </span>
            )}

            <div>
              <span>{t('idea.curatedBy')}</span>
              <strong dir="auto">{idea.creator.display_name}</strong>
              {idea.creator.is_verified && (
                <span className="idea-detail-page__verified">{t('idea.verifiedCreator')}</span>
              )}
            </div>
          </div>

          <div
            className={`idea-detail-page__source${idea.source.cover ? ' idea-detail-page__source--with-cover' : ''}`}
          >
            {idea.source.cover && (
              <img
                className="idea-detail-page__cover"
                src={idea.source.cover}
                alt=""
                loading="lazy"
              />
            )}

            <div className="idea-detail-page__source-copy">
              <span className="eyebrow">{t('idea.sourceContext')}</span>
              <h2 dir="auto">{idea.source.title}</h2>

              {idea.source.original_creator_text && (
                <p dir="auto">
                  {t('idea.sourceBy')} {idea.source.original_creator_text}
                </p>
              )}

              {idea.source.external_url && (
                <a
                  className="idea-detail-page__source-link"
                  href={idea.source.external_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('idea.openOriginalSource')}
                  <span aria-hidden="true">↗</span>
                </a>
              )}
            </div>
          </div>
        </section>

        <CommentsSection ideaId={idea.id} />
      </div>
    </article>
  )
}

function IdeaNotFound() {
  const { t } = useTranslation()

  return (
    <section className="idea-detail-page">
      <div className="idea-detail-page__rail">
        <div className="idea-detail-page__not-found">
          <span aria-hidden="true">404</span>
          <h1>{t('idea.notFoundTitle')}</h1>
          <p>{t('idea.notFoundBody')}</p>
          <Link className="button button--secondary" to="/">
            {t('idea.backHome')}
          </Link>
        </div>
      </div>
    </section>
  )
}

function IdeaDetailSkeleton() {
  const { t } = useTranslation()

  return (
    <section className="idea-detail-page" role="status" aria-live="polite">
      <span className="sr-only">{t('idea.loadingDetail')}</span>
      <div className="idea-detail-page__rail" aria-hidden="true">
        <div className="idea-detail-skeleton">
          <span className="idea-skeleton idea-skeleton--badge" />
          <span className="idea-skeleton idea-detail-skeleton__title" />
          <span className="idea-skeleton idea-detail-skeleton__line" />
          <span className="idea-skeleton idea-detail-skeleton__line" />
          <span className="idea-skeleton idea-detail-skeleton__line idea-detail-skeleton__line--short" />
          <span className="idea-skeleton idea-detail-skeleton__context" />
        </div>
      </div>
    </section>
  )
}
