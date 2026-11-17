import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PublicReport } from '../../api/types'
import { changeUiLanguage } from '../../i18n'
import { MessageReportAction } from './MessageReportAction'

const { reportMessageMock } = vi.hoisted(() => ({
  reportMessageMock: vi.fn(),
}))

vi.mock('../../api/reporting', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../api/reporting')>()
  return {
    ...original,
    reportMessage: reportMessageMock,
  }
})

const report: PublicReport = {
  id: 22,
  reason: 'harassment',
  details: 'Please review this.',
  status: 'open',
  created_at: '2026-11-17T12:00:00Z',
}

function renderAction() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MessageReportAction messageId={91} />
    </QueryClientProvider>,
  )
}

beforeEach(async () => {
  vi.clearAllMocks()
  reportMessageMock.mockResolvedValue(report)
  await changeUiLanguage('en')
})

afterEach(() => {
  cleanup()
})

describe('MessageReportAction', () => {
  it('reuses moderation report reasons and submits trimmed details', async () => {
    const pointer = userEvent.setup()
    renderAction()

    await pointer.click(screen.getByRole('button', { name: 'Report message' }))
    await pointer.selectOptions(screen.getByLabelText('Reason'), 'harassment')
    await pointer.type(
      screen.getByLabelText('Additional details (optional)'),
      '  Please review this.  ',
    )
    await pointer.click(screen.getByRole('button', { name: 'Submit report' }))

    await waitFor(() =>
      expect(reportMessageMock).toHaveBeenCalledWith(91, {
        reason: 'harassment',
        details: 'Please review this.',
      }),
    )
    expect(await screen.findByText('Message report submitted')).toBeInTheDocument()
  })

  it('renders Persian reporting copy when the interface is RTL', async () => {
    await changeUiLanguage('fa')
    const pointer = userEvent.setup()
    renderAction()

    await pointer.click(screen.getByRole('button', { name: 'گزارش پیام' }))

    expect(screen.getByText('گزارش این پیام')).toBeInTheDocument()
    expect(document.documentElement.dir).toBe('rtl')
  })
})
