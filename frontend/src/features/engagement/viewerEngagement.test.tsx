import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getViewerEngagement } from '../../api/engagement'
import { useHydrateViewerEngagement, viewerEngagementKey } from './viewerEngagement'

vi.mock('../../api/engagement', () => ({
  getViewerEngagement: vi.fn(),
  setSparked: vi.fn(),
  setSaved: vi.fn(),
}))

function Hydrator({ ideaIds = [40, 39, 40] }: { ideaIds?: number[] }) {
  useHydrateViewerEngagement(ideaIds, true)
  return null
}

describe('useHydrateViewerEngagement', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('hydrates multiple per-Idea cache entries from one batched request', async () => {
    vi.mocked(getViewerEngagement).mockResolvedValue({
      items: [
        { idea_id: 39, sparked: false, saved: true },
        { idea_id: 40, sparked: true, saved: false },
      ],
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <Hydrator />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(getViewerEngagement).toHaveBeenCalledTimes(1)
    })

    expect(getViewerEngagement).toHaveBeenCalledWith([39, 40])

    await waitFor(() => {
      expect(queryClient.getQueryData(viewerEngagementKey(40))).toEqual({
        idea_id: 40,
        sparked: true,
        saved: false,
      })
      expect(queryClient.getQueryData(viewerEngagementKey(39))).toEqual({
        idea_id: 39,
        sparked: false,
        saved: true,
      })
    })
  })

  it('chunks more than 100 visible Ideas into bounded batch requests', async () => {
    vi.mocked(getViewerEngagement).mockImplementation(async (ideaIds) => ({
      items: ideaIds.map((ideaId) => ({
        idea_id: ideaId,
        sparked: false,
        saved: false,
      })),
    }))

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const ideaIds = Array.from({ length: 101 }, (_, index) => index + 1)

    render(
      <QueryClientProvider client={queryClient}>
        <Hydrator ideaIds={ideaIds} />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(getViewerEngagement).toHaveBeenCalledTimes(2)
    })

    expect(vi.mocked(getViewerEngagement).mock.calls[0]?.[0]).toHaveLength(100)
    expect(vi.mocked(getViewerEngagement).mock.calls[1]?.[0]).toEqual([101])
  })
})
