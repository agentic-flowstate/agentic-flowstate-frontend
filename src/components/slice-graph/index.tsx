"use client"

import { useState, useCallback } from 'react'
import type { Slice, GraphTicket, PipelineStep } from '@/lib/types'
import { SliceGraph } from './SliceGraph'
import { ApprovalDrawer } from './ApprovalDrawer'

export { SliceGraph } from './SliceGraph'
export { OrgGraph } from './OrgGraph'
export { RoadmapGraph } from './RoadmapGraph'
export { TicketNode } from './TicketNode'
export { ExpandedTicketNode } from './ExpandedTicketNode'
export { ApprovalDrawer } from './ApprovalDrawer'
export * from './utils'

interface SliceGraphWithApprovalProps {
  slice: Slice
  tickets: GraphTicket[]
  allTickets: GraphTicket[]
  selectedTicketId?: string | null
  processingTicketIds?: Set<string>
  onTicketClick?: (ticket: GraphTicket) => void
  onPaneClick?: () => void
  onCrossSliceClick?: (ticketId: string, sliceId: string) => void
  onRefresh?: () => void
}

/**
 * Convenience wrapper that combines SliceGraph with ApprovalDrawer
 */
export function SliceGraphWithApproval({
  slice,
  tickets,
  allTickets,
  selectedTicketId,
  processingTicketIds,
  onTicketClick,
  onPaneClick,
  onCrossSliceClick,
  onRefresh,
}: SliceGraphWithApprovalProps) {
  const [approvalTicket, setApprovalTicket] = useState<GraphTicket | null>(null)
  const [approvalStep, setApprovalStep] = useState<PipelineStep | null>(null)

  const handleStepClick = useCallback((ticket: GraphTicket, step: PipelineStep) => {
    // Only open drawer for awaiting_approval steps
    if (step.status === 'awaiting_approval') {
      setApprovalTicket(ticket)
      setApprovalStep(step)
    }
  }, [])

  const handleDrawerClose = useCallback(() => {
    setApprovalTicket(null)
    setApprovalStep(null)
  }, [])

  const handleApprovalComplete = useCallback(() => {
    // Trigger refresh of data
    onRefresh?.()
  }, [onRefresh])

  return (
    <>
      <SliceGraph
        slice={slice}
        tickets={tickets}
        allTickets={allTickets}
        selectedTicketId={selectedTicketId}
        processingTicketIds={processingTicketIds}
        onTicketClick={onTicketClick}
        onPaneClick={onPaneClick}
        onStepClick={handleStepClick}
        onCrossSliceClick={onCrossSliceClick}
      />
      <ApprovalDrawer
        ticket={approvalTicket}
        step={approvalStep}
        isOpen={!!approvalTicket && !!approvalStep}
        onClose={handleDrawerClose}
        onApprovalComplete={handleApprovalComplete}
      />
    </>
  )
}
