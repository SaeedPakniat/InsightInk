import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import type { Idea } from '../../api/types'
import { IdeaEngagementActions } from '../engagement/IdeaEngagementActions'
import { ContentLanguageBadge } from '../languages/ContentLanguageBadge'
import { FormatBadge } from './FormatBadge'
import { formatUiNumber, getContentDirection, getInitials, getReadMinutes } from './presentation'

type IdeaCardProps = {
  idea: Idea
}

export function IdeaCard({ idea }: IdeaCardProps) {
  const { i18n, t } = useTranslation()
  const isEnglishUi = i18n.language.startsWith('en')
  const contentDirection = getContentDirection(idea.language)
  const readMinutes = getReadMinutes(idea.estimated_read_seconds)
  const formattedReadMinutes = formatUiNumber(readMinutes, isEnglishUi)

  return (
    <article className="idea-card">
      <div className="idea-card__meta">
        <div className="idea-card__meta-primary">
          <FormatBadge type={idea.source.type} />
          <ContentLanguageBadge code={idea.language} />
        </div>

        <span className="idea-card__read-time">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7.5v5l3 1.8" />
          </svg>
          {t('idea.readTime', { minutes: formattedReadMinutes })}
        </span>
      </div>

      <div
        className="idea-card__content"
        lang={idea.language}
        dir={contentDirection}
        data-content-direction={contentDirection}
      >
        <h2>
          <Link className="idea-card__title-link" to={`/ideas/${idea.id}`}>
            {idea.title}
          </Link>
        </h2>
        <p>{idea.body}</p>
      </div>

      {idea.topics.length > 0 && (
        <div className="idea-card__topics" aria-label={t('idea.topicsLabel')}>
          {idea.topics.map((topic) => (
            <span className="idea-topic" key={topic.id}>
              {isEnglishUi ? topic.name_en : topic.name_fa}
            </span>
          ))}
        </div>
      )}

      <footer className="idea-card__footer">
        <div className="idea-card__creator">
          {idea.creator.avatar ? (
            <img
              className="idea-card__avatar"
              src={idea.creator.avatar}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="idea-card__avatar idea-card__avatar--fallback" aria-hidden="true">
              {getInitials(idea.creator.display_name)}
            </span>
          )}

          <div className="idea-card__attribution">
            <span className="idea-card__curator">
              {t('idea.curatedBy')}{' '}
              <Link
                className="idea-card__creator-link"
                to={`/creators/${idea.creator.id}`}
                dir="auto"
              >
                {idea.creator.display_name}
              </Link>
              {idea.creator.is_verified && (
                <span className="idea-card__verified" title={t('idea.verifiedCreator')}>
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="m7.5 12.5 3 3 6-7" />
                  </svg>
                  <span className="sr-only">{t('idea.verifiedCreator')}</span>
                </span>
              )}
            </span>

            <span className="idea-card__source">
              {t('idea.sourceLabel')}{' '}
              {idea.source.external_url ? (
                <a
                  href={idea.source.external_url}
                  target="_blank"
                  rel="noreferrer"
                  dir="auto"
                  aria-label={t('idea.openSource', { title: idea.source.title })}
                >
                  {idea.source.title}
                </a>
              ) : (
                <strong dir="auto">{idea.source.title}</strong>
              )}
              {idea.source.original_creator_text && (
                <>
                  <span aria-hidden="true"> · </span>
                  <span dir="auto">{idea.source.original_creator_text}</span>
                </>
              )}
            </span>
          </div>
        </div>

        <div className="idea-card__footer-actions">
          <IdeaEngagementActions ideaId={idea.id} />
          <Link className="idea-card__read-link" to={`/ideas/${idea.id}`}>
            {t('idea.readFull')}
            <span aria-hidden="true">{isEnglishUi ? '→' : '←'}</span>
          </Link>
        </div>
      </footer>
    </article>
  )
}
