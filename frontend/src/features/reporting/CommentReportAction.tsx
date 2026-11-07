import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { firstFieldError } from '../../api/client'
import { reportComment } from '../../api/reporting'
import type { ReportReason } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { useSession } from '../auth/session'

const REPORT_REASONS: ReportReason[] = ['harassment', 'spam', 'inappropriate_content', 'other']

type CommentReportActionProps = {
  commentId: number
}

export function CommentReportAction({ commentId }: CommentReportActionProps) {
  const { i18n, t } = useTranslation()
  const location = useLocation()
  const session = useSession()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason | ''>('')
  const [details, setDetails] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const mutation = useMutation({
    mutationFn: () =>
      reportComment(commentId, {
        reason: reason as ReportReason,
        ...(details.trim() ? { details: details.trim() } : {}),
      }),
    onSuccess: () => {
      setSubmitted(true)
    },
  })

  if (submitted) {
    return (
      <span className="comment-report-action__submitted" role="status">
        <span aria-hidden="true">✓</span>
        {t('reporting.submitted')}
      </span>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        className="comment-report-action__trigger"
        onClick={() => setOpen(true)}
      >
        {t('reporting.report')}
      </button>
    )
  }

  if (session.isPending) {
    return (
      <span className="comment-report-action__loading" role="status">
        {t('reporting.checkingSession')}
      </span>
    )
  }

  if (!session.data) {
    return (
      <div className="comment-report-action__signin">
        <p>{t('reporting.signInBody')}</p>
        <div className="comment-report-action__signin-actions">
          <Link
            className="button button--secondary"
            to="/login"
            state={{ from: location.pathname }}
          >
            {t('reporting.signIn')}
          </Link>
          <button
            type="button"
            className="comment-report-action__cancel"
            onClick={() => setOpen(false)}
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    )
  }

  const isEnglishUi = i18n.language.startsWith('en')
  const numberFormatter = new Intl.NumberFormat(isEnglishUi ? 'en' : 'fa')
  const reasonError = firstFieldError(mutation.error, 'reason')
  const detailsError = firstFieldError(mutation.error, 'details')
  const genericError =
    mutation.isError && !reasonError && !detailsError ? t('reporting.submitError') : ''

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!reason || mutation.isPending) return
    mutation.mutate()
  }

  return (
    <form className="comment-report-form" onSubmit={handleSubmit}>
      <div className="comment-report-form__heading">
        <strong>{t('reporting.formTitle')}</strong>
        <p>{t('reporting.formBody')}</p>
      </div>

      <label>
        <span>{t('reporting.reasonLabel')}</span>
        <select
          value={reason}
          aria-invalid={Boolean(reasonError)}
          disabled={mutation.isPending}
          onChange={(event) => {
            setReason(event.target.value as ReportReason | '')
            mutation.reset()
          }}
        >
          <option value="">{t('reporting.reasonPlaceholder')}</option>
          {REPORT_REASONS.map((item) => (
            <option value={item} key={item}>
              {t(`reporting.reason.${item}`)}
            </option>
          ))}
        </select>
      </label>

      {reasonError && (
        <span className="comment-report-form__error" role="alert">
          {reasonError}
        </span>
      )}

      <label>
        <span>{t('reporting.detailsLabel')}</span>
        <textarea
          value={details}
          rows={3}
          maxLength={2000}
          disabled={mutation.isPending}
          aria-invalid={Boolean(detailsError)}
          placeholder={t('reporting.detailsPlaceholder')}
          onChange={(event) => {
            setDetails(event.target.value)
            mutation.reset()
          }}
        />
      </label>

      <div className="comment-report-form__meta">
        <span>
          {t('reporting.detailsCount', {
            count: numberFormatter.format(details.length),
            max: numberFormatter.format(2000),
          })}
        </span>
        {detailsError && (
          <span className="comment-report-form__error" role="alert">
            {detailsError}
          </span>
        )}
        {genericError && (
          <span className="comment-report-form__error" role="alert">
            {genericError}
          </span>
        )}
      </div>

      <div className="comment-report-form__actions">
        <Button type="submit" disabled={!reason || mutation.isPending}>
          {mutation.isPending ? t('reporting.submitting') : t('reporting.submit')}
        </Button>
        <button
          type="button"
          className="comment-report-action__cancel"
          disabled={mutation.isPending}
          onClick={() => {
            mutation.reset()
            setOpen(false)
          }}
        >
          {t('common.cancel')}
        </button>
      </div>
    </form>
  )
}
