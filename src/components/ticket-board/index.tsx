"use client"

import { TicketBoardDesktop, TicketBoardProps } from './TicketBoardDesktop'
import { TicketBoardMobile } from './TicketBoardMobile'
import { useIsMobile } from '@/lib/hooks'

export function TicketBoard(props: TicketBoardProps) {
  const isMobile = useIsMobile()

  // During SSR/hydration, default to desktop view
  // This avoids layout shift and desktop is a safe fallback
  if (isMobile === undefined) {
    return <TicketBoardDesktop {...props} />
  }

  if (isMobile) {
    return <TicketBoardMobile {...props} />
  }

  return <TicketBoardDesktop {...props} />
}

export { TicketBoardDesktop, TicketBoardMobile }
export type { TicketBoardProps }
