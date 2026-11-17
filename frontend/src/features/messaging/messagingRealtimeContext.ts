import { createContext, useContext } from 'react'

import type { MessagingSocketStatus } from '../../api/types'

export type MessagingRealtimeValue = {
  status: MessagingSocketStatus
}

export const MessagingRealtimeContext = createContext<MessagingRealtimeValue>({
  status: 'disconnected',
})

export function useMessagingRealtimeStatus() {
  return useContext(MessagingRealtimeContext)
}
