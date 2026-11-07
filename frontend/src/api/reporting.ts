import { apiRequest } from './client'
import type { CreateCommentReportPayload, PublicReport } from './types'

export function reportComment(
  commentId: number,
  payload: CreateCommentReportPayload,
): Promise<PublicReport> {
  return apiRequest<PublicReport>(`/comments/${commentId}/report/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
