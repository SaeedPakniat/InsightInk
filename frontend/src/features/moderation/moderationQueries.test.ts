import { describe, expect, it } from 'vitest'

import type {
  HiddenModerationIdea,
  HiddenModerationIdeaPage,
  ModerationReportListItem,
  ModerationReportPage,
} from '../../api/types'
import {
  flattenHiddenModerationIdeas,
  flattenModerationReports,
  HIDDEN_MODERATION_IDEAS_QUERY_KEY,
  moderationReportQueryKey,
  moderationReportsQueryKey,
} from './moderationQueries'

function hiddenIdea(id: number): HiddenModerationIdea {
  return {
    id,
    title: `Hidden ${id}`,
    body_excerpt: 'Excerpt',
    language: 'en',
    status: 'hidden',
    creator: { id: 4, display_name: 'Creator' },
    source: { id: 7, type: 'article', title: 'Source' },
    published_at: null,
    updated_at: '2026-11-15T09:00:00Z',
  }
}

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
    expect(HIDDEN_MODERATION_IDEAS_QUERY_KEY).toEqual(['moderation', 'ideas', 'hidden'])
  })

  it('flattens hidden-Idea cursor pages without duplicate IDs', () => {
    const pages: HiddenModerationIdeaPage[] = [
      { next: 'next', previous: null, results: [hiddenIdea(3), hiddenIdea(2)] },
      { next: null, previous: 'prev', results: [hiddenIdea(2), hiddenIdea(1)] },
    ]

    expect(flattenHiddenModerationIdeas(pages).map((item) => item.id)).toEqual([3, 2, 1])
  })

  it('flattens cursor pages without duplicate report IDs', () => {
    const pages: ModerationReportPage[] = [
      { next: 'next', previous: null, results: [report(3), report(2)] },
      { next: null, previous: 'prev', results: [report(2), report(1)] },
    ]

    expect(flattenModerationReports(pages).map((item) => item.id)).toEqual([3, 2, 1])
  })
})
