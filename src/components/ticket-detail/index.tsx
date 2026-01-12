"use client"

import { TicketDrawer, TicketDetailProps } from './TicketDrawer'
import { TicketDetailMobile } from './TicketDetailMobile'
import { useIsMobile } from '@/lib/hooks'

export function TicketDetail(props: TicketDetailProps) {
  const isMobile = useIsMobile()

  // During SSR/hydration, render nothing to avoid layout mismatch
  // This is a modal/drawer so it's fine to delay rendering
  if (isMobile === undefined) {
    return null
  }

  if (isMobile) {
    return <TicketDetailMobile {...props} />
  }

  return <TicketDrawer {...props} />
}

// Also export TicketDrawer for backwards compatibility in imports
export { TicketDrawer, TicketDetailMobile }
export type { TicketDetailProps }
