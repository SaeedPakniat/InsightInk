import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { HiddenModerationIdea } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { formatUiNumber } from '../ideas/presentation'
import {
  flattenHiddenModerationIdeas,
  useHiddenModerationIdeas,
  useRestoreHiddenIdea,
} from './moderationQueries'
import { ModerationWorkspaceNav } from './ModerationWorkspaceNav'

export function HiddenIdeasPage() {
  const { i18n, t } = useTranslation()
  const isEnglishUi = i18n.language.startsWith('en')
  const hiddenIdeasQuery = useHiddenModerationIdeas()
  const ideas = hiddenIdeasQuery.data
    ? flattenHiddenModerationIdeas(hiddenIdeasQuery.data.pages)
    : []
  const [restoredTitle, setRestoredTitle] = useState<string | null>(null)

  return (
    <section className="moderation-page">
      <div className="moderation-page__rail">
        <header className="moderation-page__header">
          <div>
            <p className="eyebrow">{t('moderation.eyebrow')}</p>
            <h1>{t('moderation.hiddenIdeasTitle')}</h1>
            <p>{t('moderation.hiddenIdeasBody')}</p>
          </div>
        </header>

        <ModerationWorkspaceNav />

        {restoredTitle && (
          <p className="moderation-hidden-success" role="status" aria-live="polite">
            {t('moderation.hiddenIdeaRestored', { title: restoredTitle })}
          </p>
        )}

        {hiddenIdeasQuery.isPending && (
          <div className="moderation-hidden-grid" role="status" aria-live="polite">
            <span className="sr-only">{t('moderation.loadingHiddenIdeas')}</span>
            <HiddenIdeaSkeleton />
            <HiddenIdeaSkeleton />
            <HiddenIdeaSkeleton />
          </div>
        )}

        {hiddenIdeasQuery.isError && (
          <div className="personalized-feed__state" role="alert">
            <strong>{t('moderation.hiddenIdeasErrorTitle')}</strong>
            <p>{t('moderation.hiddenIdeasErrorBody')}</p>
            <Button variant="secondary" onClick={() => void hiddenIdeasQuery.refetch()}>
              {t('common.retry')}
            </Button>
          </div>
        )}

        {!hiddenIdeasQuery.isPending && !hiddenIdeasQuery.isError && ideas.length === 0 && (
          <div className="personalized-feed__state moderation-page__empty">
            <span aria-hidden="true">✓</span>
            <strong>{t('moderation.hiddenIdeasEmptyTitle')}</strong>
            <p>{t('moderation.hiddenIdeasEmptyBody')}</p>
          </div>
        )}

        {ideas.length > 0 && (
          <>
            <div className="moderation-hidden-grid">
              {ideas.map((idea) => (
                <HiddenIdeaCard
                  key={idea.id}
                  idea={idea}
                  isEnglishUi={isEnglishUi}
                  onRestored={() => setRestoredTitle(idea.title)}
                />
              ))}
            </div>

            <div className="latest-feed-page__pagination">
              {hiddenIdeasQuery.hasNextPage ? (
                <>
                  <Button
                    variant="secondary"
                    disabled={hiddenIdeasQuery.isFetchingNextPage}
                    onClick={() => void hiddenIdeasQuery.fetchNextPage()}
                  >
                    {hiddenIdeasQuery.isFetchingNextPage
                      ? t('moderation.loadingMore')
                      : t('moderation.loadMoreHiddenIdeas')}
                  </Button>
                  <p>{t('moderation.hiddenIdeasPaginationHint')}</p>
                </>
              ) : (
                <div className="latest-feed-page__end">
                  <span aria-hidden="true">◆</span>
                  <strong>{t('moderation.hiddenIdeasEndTitle')}</strong>
                  <p>{t('moderation.hiddenIdeasEndBody')}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function HiddenIdeaCard({
  idea,
  isEnglishUi,
  onRestored,
}: {
  idea: HiddenModerationIdea
  isEnglishUi: boolean
  onRestored: () => void
}) {
  const { t } = useTranslation()
  const restoreMutation = useRestoreHiddenIdea()
  const [confirming, setConfirming] = useState(false)
  const [note, setNote] = useState('')

  const updatedDate = new Intl.DateTimeFormat(isEnglishUi ? 'en' : 'fa', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(idea.updated_at))

  const submitRestore = () => {
    restoreMutation.mutate(
      {
        ideaId: idea.id,
        payload: note.trim() ? { note: note.trim() } : {},
      },
      { onSuccess: onRestored },
    )
  }

  return (
    <article className="moderation-hidden-card">
      <div className="moderation-hidden-card__top">
        <span className="moderation-report-card__id">
          {t('moderation.ideaNumber', {
            id: formatUiNumber(idea.id, isEnglishUi),
          })}
        </span>
        <span className="moderation-hidden-status">{t('moderation.ideaStatus.hidden')}</span>
      </div>

      <div className="moderation-hidden-card__content">
        <h2 dir="auto">{idea.title}</h2>
        <p dir="auto">{idea.body_excerpt}</p>
      </div>

      <dl className="moderation-hidden-card__facts">
        <div>
          <dt>{t('moderation.hiddenIdeaCreator')}</dt>
          <dd dir="auto">{idea.creator.display_name || t('moderation.unknownUser')}</dd>
        </div>
        <div>
          <dt>{t('moderation.hiddenIdeaSource')}</dt>
          <dd dir="auto">{idea.source.title}</dd>
        </div>
        <div>
          <dt>{t('moderation.hiddenIdeaLanguage')}</dt>
          <dd>{idea.language.toUpperCase()}</dd>
        </div>
        <div>
          <dt>{t('moderation.hiddenIdeaUpdated')}</dt>
          <dd>
            <time dateTime={idea.updated_at}>{updatedDate}</time>
          </dd>
        </div>
      </dl>

      {confirming ? (
        <div className="moderation-hidden-card__restore">
          <p>{t('moderation.restoreHiddenIdeaWarning')}</p>
          <label htmlFor={`restore-note-${idea.id}`}>
            <span>{t('moderation.noteLabel')}</span>
          </label>
          <textarea
            id={`restore-note-${idea.id}`}
            value={note}
            rows={3}
            maxLength={2000}
            disabled={restoreMutation.isPending}
            placeholder={t('moderation.notePlaceholder')}
            aria-describedby={`restore-note-count-${idea.id}`}
            onChange={(event) => {
              setNote(event.target.value)
              restoreMutation.reset()
            }}
          />
          <small id={`restore-note-count-${idea.id}`}>
            {t('moderation.noteCount', {
              count: formatUiNumber(note.length, isEnglishUi),
              max: formatUiNumber(2000, isEnglishUi),
            })}
          </small>

          <div className="idea-moderation-controls__actions">
            <Button disabled={restoreMutation.isPending} onClick={submitRestore}>
              {restoreMutation.isPending
                ? t('moderation.updating')
                : t('moderation.confirmRestoreHiddenIdea')}
            </Button>
            <Button
              variant="ghost"
              disabled={restoreMutation.isPending}
              onClick={() => {
                setConfirming(false)
                setNote('')
                restoreMutation.reset()
              }}
            >
              {t('common.cancel')}
            </Button>
          </div>

          {restoreMutation.isError && (
            <p className="form-error" role="alert">
              {t('moderation.ideaActionError')}
            </p>
          )}
        </div>
      ) : (
        <Button
          variant="secondary"
          onClick={() => {
            setConfirming(true)
            restoreMutation.reset()
          }}
        >
          {t('moderation.restoreIdeaDirectly')}
        </Button>
      )}
    </article>
  )
}

function HiddenIdeaSkeleton() {
  return (
    <div className="moderation-hidden-card moderation-hidden-card--skeleton" aria-hidden="true">
      <span className="idea-skeleton moderation-report-skeleton__short" />
      <span className="idea-skeleton moderation-report-skeleton__title" />
      <span className="idea-skeleton moderation-report-skeleton__line" />
      <span className="idea-skeleton moderation-report-skeleton__line" />
    </div>
  )
}
