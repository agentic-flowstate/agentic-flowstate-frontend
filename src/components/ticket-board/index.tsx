"use client"

import { TicketBoardDesktop, TicketBoardProps } from './TicketBoardDesktop'
import { TicketBoardMobile } from './TicketBoardMobile'
import { useIsMobile } from '@/lib/hooks'

export function TicketBoard(props: TicketBoardProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <TicketBoardMobile {...props} />
  }

  return <TicketBoardDesktop {...props} />
}

export type { TicketBoardProps }
