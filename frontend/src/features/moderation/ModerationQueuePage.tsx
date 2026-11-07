import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import type { ReportStatus } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { formatUiNumber } from '../ideas/presentation'
import { ModerationStatusBadge } from './ModerationStatusBadge'
import { flattenModerationReports, useModerationReports } from './moderationQueries'

const FILTERS: Array<ReportStatus | 'all'> = ['open', 'reviewing', 'resolved', 'rejected', 'all']

function parseStatus(value: string | null): ReportStatus | 'all' {
  return FILTERS.includes(value as ReportStatus | 'all') ? (value as ReportStatus | 'all') : 'open'
}

export function ModerationQueuePage() {
  const { i18n, t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const isEnglishUi = i18n.language.startsWith('en')
  const selected = parseStatus(searchParams.get('status'))
  const status = selected === 'all' ? null : selected
  const reportsQuery = useModerationReports(status)
  const reports = reportsQuery.data ? flattenModerationReports(reportsQuery.data.pages) : []

  const setFilter = (next: ReportStatus | 'all') => {
    const params = new URLSearchParams()
    if (next !== 'open') params.set('status', next)
    setSearchParams(params)
  }

  return (
    <section className="moderation-page">
      <div className="moderation-page__rail">
        <header className="moderation-page__header">
          <div>
            <p className="eyebrow">{t('moderation.eyebrow')}</p>
            <h1>{t('moderation.queueTitle')}</h1>
            <p>{t('moderation.queueBody')}</p>
          </div>
          <Link className="button button--secondary" to="/app">
            {t('moderation.backToFeed')}
          </Link>
        </header>

        <nav className="moderation-filters" aria-label={t('moderation.filterNavigation')}>
          {FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              aria-pressed={selected === filter}
              onClick={() => setFilter(filter)}
            >
              {t(`moderation.filter.${filter}`)}
            </button>
          ))}
        </nav>

        {reportsQuery.isPending && (
          <div className="moderation-queue" role="status" aria-live="polite">
            <span className="sr-only">{t('moderation.loadingQueue')}</span>
            <ModerationQueueSkeleton />
            <ModerationQueueSkeleton />
            <ModerationQueueSkeleton />
          </div>
        )}

        {reportsQuery.isError && (
          <div className="personalized-feed__state" role="alert">
            <strong>{t('moderation.queueErrorTitle')}</strong>
            <p>{t('moderation.queueErrorBody')}</p>
            <Button variant="secondary" onClick={() => void reportsQuery.refetch()}>
              {t('common.retry')}
            </Button>
          </div>
        )}

        {!reportsQuery.isPending && !reportsQuery.isError && reports.length === 0 && (
          <div className="personalized-feed__state moderation-page__empty">
            <span aria-hidden="true">✓</span>
            <strong>{t('moderation.emptyTitle')}</strong>
            <p>{t('moderation.emptyBody')}</p>
          </div>
        )}

        {reports.length > 0 && (
          <>
            <div className="moderation-queue">
              {reports.map((report) => {
                const date = new Intl.DateTimeFormat(isEnglishUi ? 'en' : 'fa', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(report.created_at))

                return (
                  <Link
                    className="moderation-report-card"
                    to={`/moderation/reports/${report.id}`}
                    key={report.id}
                  >
                    <div className="moderation-report-card__top">
                      <span className="moderation-report-card__id">
                        {t('moderation.reportNumber', {
                          id: formatUiNumber(report.id, isEnglishUi),
                        })}
                      </span>
                      <ModerationStatusBadge status={report.status} />
                    </div>

                    <div className="moderation-report-card__body">
                      <strong>{t(`reporting.reason.${report.reason}`)}</strong>
                      <p>
                        {t('moderation.reportedBy')}{' '}
                        <span dir="auto">
                          {report.reporter.display_name || t('moderation.unknownUser')}
                        </span>
                      </p>
                    </div>

                    <div className="moderation-report-card__meta">
                      <span>
                        {t('moderation.target', {
                          type: t(`moderation.targetType.${report.target_type}`),
                          id: formatUiNumber(report.target_id, isEnglishUi),
                        })}
                      </span>
                      <time dateTime={report.created_at}>{date}</time>
                    </div>
                  </Link>
                )
              })}
            </div>

            <div className="latest-feed-page__pagination">
              {reportsQuery.hasNextPage ? (
                <>
                  <Button
                    variant="secondary"
                    disabled={reportsQuery.isFetchingNextPage}
                    onClick={() => void reportsQuery.fetchNextPage()}
                  >
                    {reportsQuery.isFetchingNextPage
                      ? t('moderation.loadingMore')
                      : t('moderation.loadMore')}
                  </Button>
                  <p>{t('moderation.paginationHint')}</p>
                </>
              ) : (
                <div className="latest-feed-page__end">
                  <span aria-hidden="true">◆</span>
                  <strong>{t('moderation.queueEndTitle')}</strong>
                  <p>{t('moderation.queueEndBody')}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function ModerationQueueSkeleton() {
  return (
    <div className="moderation-report-card moderation-report-card--skeleton">
      <span className="idea-skeleton moderation-report-skeleton__short" />
      <span className="idea-skeleton moderation-report-skeleton__title" />
      <span className="idea-skeleton moderation-report-skeleton__line" />
    </div>
  )
}
