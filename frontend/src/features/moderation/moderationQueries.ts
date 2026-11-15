import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  actOnModerationReport,
  cursorFromModerationUrl,
  getHiddenModerationIdeasPage,
  getModerationReport,
  moderateIdeaDirectly,
  getModerationReportsPage,
  type ModerationReportAction,
} from '../../api/moderation'
import type {
  HiddenModerationIdeaPage,
  ModerationNotePayload,
  ModerationReportPage,
  ReportStatus,
} from '../../api/types'

export const MODERATION_REPORTS_QUERY_PREFIX = ['moderation', 'reports'] as const
export const HIDDEN_MODERATION_IDEAS_QUERY_KEY = ['moderation', 'ideas', 'hidden'] as const

export function moderationReportsQueryKey(status: ReportStatus | null) {
  return [...MODERATION_REPORTS_QUERY_PREFIX, status ?? 'all'] as const
}

export function moderationReportQueryKey(reportId: number) {
  return ['moderation', 'report', reportId] as const
}

export function useModerationReports(status: ReportStatus | null) {
  return useInfiniteQuery({
    queryKey: moderationReportsQueryKey(status),
    queryFn: ({ pageParam }) => getModerationReportsPage(status, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => cursorFromModerationUrl(lastPage.next),
    staleTime: 15_000,
  })
}

export function useHiddenModerationIdeas() {
  return useInfiniteQuery({
    queryKey: HIDDEN_MODERATION_IDEAS_QUERY_KEY,
    queryFn: ({ pageParam }) => getHiddenModerationIdeasPage(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => cursorFromModerationUrl(lastPage.next),
    staleTime: 15_000,
  })
}

export function flattenHiddenModerationIdeas(pages: HiddenModerationIdeaPage[]) {
  const seen = new Set<number>()
  return pages.flatMap((page) =>
    page.results.filter((idea) => {
      if (seen.has(idea.id)) return false
      seen.add(idea.id)
      return true
    }),
  )
}

export function useRestoreHiddenIdea() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ ideaId, payload }: { ideaId: number; payload: ModerationNotePayload }) =>
      moderateIdeaDirectly(ideaId, 'restore', payload),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: HIDDEN_MODERATION_IDEAS_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: ['idea', data.idea_id] })
      void queryClient.invalidateQueries({ queryKey: ['feed'] })
      void queryClient.invalidateQueries({ queryKey: ['recommendations'] })
      void queryClient.invalidateQueries({ queryKey: ['search'] })
      void queryClient.invalidateQueries({ queryKey: ['creator'] })
      void queryClient.invalidateQueries({ queryKey: ['library'] })
    },
  })
}

export function useModerationReport(reportId: number, enabled = true) {
  return useQuery({
    queryKey: moderationReportQueryKey(reportId),
    queryFn: () => getModerationReport(reportId),
    enabled: enabled && reportId > 0,
    staleTime: 10_000,
  })
}

export function flattenModerationReports(pages: ModerationReportPage[]) {
  const seen = new Set<number>()
  return pages.flatMap((page) =>
    page.results.filter((report) => {
      if (seen.has(report.id)) return false
      seen.add(report.id)
      return true
    }),
  )
}

export function useModerationAction(reportId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      action,
      payload,
    }: {
      action: ModerationReportAction
      payload: ModerationNotePayload
    }) => actOnModerationReport(reportId, action, payload),

    onSuccess: (data) => {
      if (data) {
        queryClient.setQueryData(moderationReportQueryKey(reportId), data)
      }

      void queryClient.invalidateQueries({
        queryKey: moderationReportQueryKey(reportId),
      })
      void queryClient.invalidateQueries({
        queryKey: MODERATION_REPORTS_QUERY_PREFIX,
      })
    },
  })
}
