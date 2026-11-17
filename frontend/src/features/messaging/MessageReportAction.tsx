import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { firstFieldError } from '../../api/client'
import { reportMessage } from '../../api/reporting'
import type { ReportReason } from '../../api/types'
import { Button } from '../../components/ui/Button'

const REPORT_REASONS: ReportReason[] = ['harassment', 'spam', 'inappropriate_content', 'other']

export function MessageReportAction({ messageId }: { messageId: number }) {
  const { i18n, t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason | ''>('')
  const [details, setDetails] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const mutation = useMutation({
    mutationFn: () =>
      reportMessage(messageId, {
        reason: reason as ReportReason,
        ...(details.trim() ? { details: details.trim() } : {}),
      }),
    onSuccess: () => setSubmitted(true),
  })

  if (submitted) {
    return (
      <span className="message-report__submitted" role="status">
        <span aria-hidden="true">✓</span>
        {t('messaging.reportSubmitted')}
      </span>
    )
  }

  if (!open) {
    return (
      <button className="message-report__trigger" type="button" onClick={() => setOpen(true)}>
        {t('messaging.reportMessage')}
      </button>
    )
  }

  const reasonError = firstFieldError(mutation.error, 'reason')
  const detailsError = firstFieldError(mutation.error, 'details')
  const genericError =
    mutation.isError && !reasonError && !detailsError ? t('messaging.reportError') : ''
  const isEnglishUi = i18n.language.startsWith('en')
  const numberFormatter = new Intl.NumberFormat(isEnglishUi ? 'en' : 'fa')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!reason || mutation.isPending) return
    mutation.mutate()
  }

  return (
    <form className="message-report__form" onSubmit={handleSubmit}>
      <strong>{t('messaging.reportTitle')}</strong>
      <p>{t('messaging.reportBody')}</p>

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
        <span className="message-report__error" role="alert">
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

      <div className="message-report__meta">
        <span>
          {t('reporting.detailsCount', {
            count: numberFormatter.format(details.length),
            max: numberFormatter.format(2000),
          })}
        </span>
        {detailsError && (
          <span className="message-report__error" role="alert">
            {detailsError}
          </span>
        )}
        {genericError && (
          <span className="message-report__error" role="alert">
            {genericError}
          </span>
        )}
      </div>

      <div className="message-report__actions">
        <Button type="submit" disabled={!reason || mutation.isPending}>
          {mutation.isPending ? t('reporting.submitting') : t('reporting.submit')}
        </Button>
        <button
          className="message-report__cancel"
          type="button"
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
