import { useTranslation } from 'react-i18next'

import type { Idea, SourceType } from '../../api/types'

type IdeaCardProps = {
  idea: Idea
}

function SourceIcon({ type }: { type: SourceType }) {
  if (type === 'book') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21z" />
        <path d="M4 5.5v15" />
      </svg>
    )
  }

  if (type === 'podcast') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
        <rect x="2" y="14" width="5" height="7" rx="2" />
        <rect x="17" y="14" width="5" height="7" rx="2" />
      </svg>
    )
  }

  if (type === 'movie') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M7 4v16M17 4v16M3 9h4M17 9h4M3 15h4M17 15h4" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M7 3h7l5 5v13H7z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </svg>
  )
}

function getInitials(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'I'
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function getContentDirection(language: string): 'rtl' | 'ltr' {
  return language.toLowerCase().startsWith('fa') ? 'rtl' : 'ltr'
}

export function IdeaCard({ idea }: IdeaCardProps) {
  const { i18n, t } = useTranslation()
  const isEnglishUi = i18n.language.startsWith('en')
  const contentDirection = getContentDirection(idea.language)
  const readMinutes = Math.max(1, Math.ceil(idea.estimated_read_seconds / 60))
  const formattedReadMinutes = new Intl.NumberFormat(isEnglishUi ? 'en' : 'fa').format(readMinutes)

  return (
    <article className="idea-card">
      <div className="idea-card__meta">
        <span className={`format-badge format-badge--${idea.source.type}`}>
          <SourceIcon type={idea.source.type} />
          {t(`idea.format.${idea.source.type}`)}
        </span>

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
        <h2>{idea.title}</h2>
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
              {t('idea.curatedBy')} <strong dir="auto">{idea.creator.display_name}</strong>
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
      </footer>
    </article>
  )
}
