import { describe, expect, it } from 'vitest'

import type { ModerationReportListItem, ModerationReportPage } from '../../api/types'
import {
  flattenModerationReports,
  moderationReportQueryKey,
  moderationReportsQueryKey,
} from './moderationQueries'

function report(id: number): ModerationReportListItem {
  return {
    id,
    reporter: { id: 1, display_name: 'Reader' },
    target_type: 'comment',
    target_id: id,
    reason: 'spam',
    status: 'open',
    created_at: '2026-11-07T06:00:00Z',
    resolved_at: null,
  }
}

describe('moderationQueries', () => {
  it('keeps queue and detail keys stable', () => {
    expect(moderationReportsQueryKey('open')).toEqual(['moderation', 'reports', 'open'])
    expect(moderationReportsQueryKey(null)).toEqual(['moderation', 'reports', 'all'])
    expect(moderationReportQueryKey(9)).toEqual(['moderation', 'report', 9])
  })

  it('flattens cursor pages without duplicate report IDs', () => {
    const pages: ModerationReportPage[] = [
      { next: 'next', previous: null, results: [report(3), report(2)] },
      { next: null, previous: 'prev', results: [report(2), report(1)] },
    ]

    expect(flattenModerationReports(pages).map((item) => item.id)).toEqual([3, 2, 1])
  })
})
