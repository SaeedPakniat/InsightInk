import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { ApiError, firstFieldError } from '../../api/client'
import type { ModerationAction, ReportStatus } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { formatUiNumber } from '../ideas/presentation'
import { IdeaModerationControls } from './IdeaModerationControls'
import { ModerationStatusBadge } from './ModerationStatusBadge'
import { useModerationAction, useModerationReport } from './moderationQueries'

export function ModerationReportPage() {
  const { reportId: reportIdParam } = useParams()
  const { i18n, t } = useTranslation()
  const [note, setNote] = useState('')
  const isEnglishUi = i18n.language.startsWith('en')
  const reportId = Number(reportIdParam)
  const validReportId = Number.isInteger(reportId) && reportId > 0
  const reportQuery = useModerationReport(validReportId ? reportId : 0, validReportId)
  const actionMutation = useModerationAction(validReportId ? reportId : 0)

  if (!validReportId) return <ModerationReportNotFound />

  if (reportQuery.isPending) {
    return <ModerationDetailSkeleton />
  }

  if (reportQuery.isError) {
    if (reportQuery.error instanceof ApiError && reportQuery.error.status === 404) {
      return <ModerationReportNotFound />
    }

    return (
      <section className="moderation-page">
        <div className="moderation-page__rail">
          <div className="personalized-feed__state" role="alert">
            <strong>{t('moderation.detailErrorTitle')}</strong>
            <p>{t('moderation.detailErrorBody')}</p>
            <Button variant="secondary" onClick={() => void reportQuery.refetch()}>
              {t('common.retry')}
            </Button>
          </div>
        </div>
      </section>
    )
  }

  const report = reportQuery.data
  const createdAt = new Intl.DateTimeFormat(isEnglishUi ? 'en' : 'fa', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(report.created_at))
  const resolvedAt = report.resolved_at
    ? new Intl.DateTimeFormat(isEnglishUi ? 'en' : 'fa', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(report.resolved_at))
    : null
  const noteError = firstFieldError(actionMutation.error, 'note')
  const genericActionError =
    actionMutation.isError && !noteError ? t('moderation.actionError') : null

  const submitAction = (action: 'start-review' | 'hide-comment' | 'resolve' | 'reject') => {
    if (actionMutation.isPending) return

    actionMutation.mutate(
      {
        action,
        payload: note.trim() ? { note: note.trim() } : {},
      },
      {
        onSuccess: () => setNote(''),
      },
    )
  }

  return (
    <section className="moderation-page">
      <div className="moderation-page__rail">
        <nav className="moderation-page__back">
          <Link to="/moderation">
            <span aria-hidden="true">{isEnglishUi ? '←' : '→'}</span>
            {t('moderation.backToQueue')}
          </Link>
        </nav>

        <header className="moderation-detail__header">
          <div>
            <p className="eyebrow">{t('moderation.detailEyebrow')}</p>
            <h1>
              {t('moderation.reportNumber', {
                id: formatUiNumber(report.id, isEnglishUi),
              })}
            </h1>
          </div>
          <ModerationStatusBadge status={report.status} />
        </header>

        <div className="moderation-detail__summary-grid">
          <section className="moderation-panel">
            <h2>{t('moderation.reportSummary')}</h2>
            <dl className="moderation-detail__facts">
              <div>
                <dt>{t('moderation.reason')}</dt>
                <dd>{t(`reporting.reason.${report.reason}`)}</dd>
              </div>
              <div>
                <dt>{t('moderation.reporter')}</dt>
                <dd dir="auto">{report.reporter.display_name || t('moderation.unknownUser')}</dd>
              </div>
              <div>
                <dt>{t('moderation.targetLabel')}</dt>
                <dd>
                  {t('moderation.target', {
                    type: t(`moderation.targetType.${report.target_type}`),
                    id: formatUiNumber(report.target_id, isEnglishUi),
                  })}
                </dd>
              </div>
              <div>
                <dt>{t('moderation.createdAt')}</dt>
                <dd>
                  <time dateTime={report.created_at}>{createdAt}</time>
                </dd>
              </div>
              {resolvedAt && report.resolved_at && (
                <div>
                  <dt>{t('moderation.resolvedAt')}</dt>
                  <dd>
                    <time dateTime={report.resolved_at}>{resolvedAt}</time>
                  </dd>
                </div>
              )}
            </dl>

            <div className="moderation-detail__details">
              <h3>{t('moderation.reportDetails')}</h3>
              <p>{report.details || t('moderation.noReportDetails')}</p>
            </div>
          </section>

          <section className="moderation-panel">
            <h2>{t('moderation.reportedContent')}</h2>
            {report.target_comment ? (
              <article className="moderation-target-comment">
                <div className="moderation-target-comment__meta">
                  <strong dir="auto">
                    {report.target_comment.author.display_name || t('moderation.unknownUser')}
                  </strong>
                  <span
                    className={`moderation-comment-status moderation-comment-status--${report.target_comment.status}`}
                  >
                    {t(`moderation.commentStatus.${report.target_comment.status}`)}
                  </span>
                </div>
                <p dir="auto">{report.target_comment.body}</p>
              </article>
            ) : report.target_idea ? (
              <article className="moderation-target-idea">
                <div className="moderation-target-idea__meta">
                  <div>
                    <strong dir="auto">{report.target_idea.creator.display_name}</strong>
                    <span>{t(`moderation.ideaStatus.${report.target_idea.status}`)}</span>
                  </div>
                  <span>{t(`idea.format.${report.target_idea.source.type}`)}</span>
                </div>

                <h3 dir="auto">{report.target_idea.title}</h3>
                <p dir="auto">{report.target_idea.body}</p>

                <div className="moderation-target-idea__source">
                  <span>{t('idea.sourceContext')}</span>
                  <strong dir="auto">{report.target_idea.source.title}</strong>
                </div>

                <IdeaModerationControls
                  ideaId={report.target_idea.id}
                  initialStatus={report.target_idea.status}
                />
              </article>
            ) : (
              <div className="moderation-target-missing">
                <span aria-hidden="true">∅</span>
                <p>{t('moderation.targetUnavailable')}</p>
              </div>
            )}
          </section>
        </div>

        <section className="moderation-panel moderation-actions-panel">
          <header>
            <p className="eyebrow">{t('moderation.workflowEyebrow')}</p>
            <h2>{t('moderation.workflowTitle')}</h2>
            <p>{workflowDescription(report.status, report.target_type, t)}</p>
          </header>

          {report.status === 'open' || report.status === 'reviewing' ? (
            <form className="moderation-action-form">
              <label htmlFor="moderation-note">
                <span>{t('moderation.noteLabel')}</span>
                <textarea
                  id="moderation-note"
                  value={note}
                  maxLength={2000}
                  rows={4}
                  disabled={actionMutation.isPending}
                  placeholder={t('moderation.notePlaceholder')}
                  onChange={(event) => {
                    setNote(event.target.value)
                    actionMutation.reset()
                  }}
                />
              </label>

              <div className="moderation-action-form__meta">
                <span>
                  {t('moderation.noteCount', {
                    count: new Intl.NumberFormat(isEnglishUi ? 'en' : 'fa').format(note.length),
                    max: new Intl.NumberFormat(isEnglishUi ? 'en' : 'fa').format(2000),
                  })}
                </span>
                {noteError && (
                  <span className="form-error" role="alert">
                    {noteError}
                  </span>
                )}
                {genericActionError && !noteError && (
                  <span className="form-error" role="alert">
                    {genericActionError}
                  </span>
                )}
              </div>

              <div className="moderation-action-form__actions">
                {report.status === 'open' && (
                  <Button
                    type="button"
                    disabled={actionMutation.isPending}
                    onClick={() => submitAction('start-review')}
                  >
                    {actionMutation.isPending
                      ? t('moderation.updating')
                      : t('moderation.startReview')}
                  </Button>
                )}

                {report.status === 'reviewing' && (
                  <>
                    {report.target_comment?.status === 'visible' && (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={actionMutation.isPending}
                        onClick={() => submitAction('hide-comment')}
                      >
                        {t('moderation.hideComment')}
                      </Button>
                    )}

                    <Button
                      type="button"
                      disabled={actionMutation.isPending}
                      onClick={() => submitAction('resolve')}
                    >
                      {t('moderation.resolve')}
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      disabled={actionMutation.isPending}
                      onClick={() => submitAction('reject')}
                    >
                      {t('moderation.reject')}
                    </Button>
                  </>
                )}
              </div>
            </form>
          ) : (
            <div className="moderation-workflow-complete">
              <span aria-hidden="true">✓</span>
              <strong>{t('moderation.workflowComplete')}</strong>
              <p>{t('moderation.workflowCompleteBody')}</p>
            </div>
          )}
        </section>

        <section className="moderation-panel moderation-audit">
          <header>
            <p className="eyebrow">{t('moderation.auditEyebrow')}</p>
            <h2>{t('moderation.auditTitle')}</h2>
            <p>{t('moderation.auditBody')}</p>
          </header>

          {report.actions.length > 0 ? (
            <ol className="moderation-audit__list">
              {report.actions.map((action) => (
                <AuditItem key={action.id} action={action} isEnglishUi={isEnglishUi} />
              ))}
            </ol>
          ) : (
            <div className="moderation-audit__empty">
              <span aria-hidden="true">◇</span>
              <p>{t('moderation.auditEmpty')}</p>
            </div>
          )}
        </section>
      </div>
    </section>
  )
}

function workflowDescription(
  status: ReportStatus,
  targetType: 'comment' | 'user' | 'idea' | 'message',
  t: ReturnType<typeof useTranslation>['t'],
) {
  if (status === 'reviewing' && targetType === 'idea') {
    return t('moderation.workflowDescription.ideaReviewing')
  }

  return t(`moderation.workflowDescription.${status}`)
}

function AuditItem({ action, isEnglishUi }: { action: ModerationAction; isEnglishUi: boolean }) {
  const { t } = useTranslation()
  const date = new Intl.DateTimeFormat(isEnglishUi ? 'en' : 'fa', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(action.created_at))

  return (
    <li>
      <div className="moderation-audit__marker" aria-hidden="true" />
      <div className="moderation-audit__content">
        <div className="moderation-audit__heading">
          <strong>{t(`moderation.actionType.${action.action_type}`)}</strong>
          <time dateTime={action.created_at}>{date}</time>
        </div>
        <p>
          {t('moderation.actionBy')}{' '}
          <span dir="auto">{action.moderator.display_name || t('moderation.unknownUser')}</span>
        </p>
        {action.note && <blockquote>{action.note}</blockquote>}
      </div>
    </li>
  )
}

function ModerationReportNotFound() {
  const { t } = useTranslation()

  return (
    <section className="moderation-page">
      <div className="moderation-page__rail">
        <div className="idea-detail-page__not-found">
          <span aria-hidden="true">404</span>
          <h1>{t('moderation.notFoundTitle')}</h1>
          <p>{t('moderation.notFoundBody')}</p>
          <Link className="button button--secondary" to="/moderation">
            {t('moderation.backToQueue')}
          </Link>
        </div>
      </div>
    </section>
  )
}

function ModerationDetailSkeleton() {
  const { t } = useTranslation()

  return (
    <section className="moderation-page" role="status" aria-live="polite">
      <span className="sr-only">{t('moderation.loadingDetail')}</span>
      <div className="moderation-page__rail" aria-hidden="true">
        <div className="moderation-detail-skeleton">
          <span className="idea-skeleton moderation-detail-skeleton__title" />
          <span className="idea-skeleton moderation-detail-skeleton__panel" />
          <span className="idea-skeleton moderation-detail-skeleton__panel" />
        </div>
      </div>
    </section>
  )
}
