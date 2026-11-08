import { apiRequest } from './client'
import type {
  IdeaModerationState,
  ModerationNotePayload,
  ModerationReportDetail,
  ModerationReportPage,
  ReportStatus,
} from './types'

export type ModerationReportAction = 'start-review' | 'hide-comment' | 'resolve' | 'reject'

export function getModerationReportsPage(
  status: ReportStatus | null,
  cursor: string | null = null,
): Promise<ModerationReportPage> {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (cursor) params.set('cursor', cursor)
  const suffix = params.toString()

  return apiRequest<ModerationReportPage>(`/moderation/reports/${suffix ? `?${suffix}` : ''}`)
}

export function getModerationReport(reportId: number): Promise<ModerationReportDetail> {
  return apiRequest<ModerationReportDetail>(`/moderation/reports/${reportId}/`)
}

export function actOnModerationReport(
  reportId: number,
  action: ModerationReportAction,
  payload: ModerationNotePayload,
): Promise<ModerationReportDetail | void> {
  return apiRequest<ModerationReportDetail | void>(`/moderation/reports/${reportId}/${action}/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function moderateIdeaDirectly(
  ideaId: number,
  action: 'hide' | 'restore',
  payload: ModerationNotePayload = {},
): Promise<IdeaModerationState> {
  return apiRequest<IdeaModerationState>(`/moderation/ideas/${ideaId}/${action}/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function cursorFromModerationUrl(url: string | null): string | null {
  if (!url) return null

  try {
    return new URL(url, window.location.origin).searchParams.get('cursor')
  } catch {
    return null
  }
}
