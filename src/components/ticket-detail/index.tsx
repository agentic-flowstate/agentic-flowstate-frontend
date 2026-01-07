"use client"

import { TicketDrawer, TicketDetailProps } from './TicketDrawer'
import { TicketDetailMobile } from './TicketDetailMobile'
import { useIsMobile } from '@/lib/hooks'

export function TicketDetail(props: TicketDetailProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <TicketDetailMobile {...props} />
  }

  return <TicketDrawer {...props} />
}

// Also export TicketDrawer for backwards compatibility in imports
export { TicketDrawer, TicketDetailMobile }
export type { TicketDetailProps }
