"use client"

import React, { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useAgentState } from '@/contexts/agent-state-context'
import { DndContext, DragOverlay, useDroppable } from '@dnd-kit/core'
import {
  STATUS_LANES,
  TicketBoardProps,
  useTicketDragDrop,
  DraggableTicketCard,
  TicketCardOverlay,
} from './shared'

function DroppableSection({
  status,
  children,
  isOver,
  className,
}: {
  status: string
  children: React.ReactNode
  isOver: boolean
  className?: string
}) {
  const { setNodeRef } = useDroppable({ id: status })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "transition-colors duration-200",
        isOver && "bg-primary/20 ring-2 ring-primary/50 ring-inset",
        className
      )}
    >
      {children}
    </div>
  )
}

export function TicketBoardMobile({ tickets, focusedTicket, onTicketClick, onTicketStatusChange }: TicketBoardProps) {
  const { isAgentRunning } = useAgentState()
  const [expandedLanes, setExpandedLanes] = useState<Set<string>>(new Set(['open', 'in_progress', 'blocked']))

  const expandAllLanes = useCallback(() => {
    setExpandedLanes(new Set(STATUS_LANES.map(l => l.status)))
  }, [])

  const { activeTicket, overLane, sensors, handleDragStart, handleDragOver, handleDragEnd } =
    useTicketDragDrop(onTicketStatusChange, 'mobile', expandAllLanes)

  const ticketsByStatus = tickets.reduce((acc, ticket) => {
    const status = ticket.status || 'open'
    if (!acc[status]) acc[status] = []
    acc[status].push(ticket)
    return acc
  }, {} as Record<string, import('@/lib/types').Ticket[]>)

  const toggleLane = (status: string) => {
    setExpandedLanes(prev => {
      const next = new Set(prev)
      if (next.has(status)) {
        next.delete(status)
      } else {
        next.add(status)
      }
      return next
    })
  }

  if (tickets.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <div className="text-muted-foreground text-sm">No tickets to display</div>
          <div className="text-muted-foreground text-xs">Select slices from the menu to view tickets</div>
        </div>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className="h-full overflow-y-auto pb-4">
        <div className="space-y-2 px-3">
          {STATUS_LANES.map((lane) => {
            const laneTickets = ticketsByStatus[lane.status] || []
            const Icon = lane.icon
            const isExpanded = expandedLanes.has(lane.status)
            const isOver = overLane === lane.status

            return (
              <Collapsible key={lane.status} open={isExpanded} onOpenChange={() => toggleLane(lane.status)}>
                <DroppableSection
                  status={lane.status}
                  isOver={isOver}
                  className={cn("rounded-lg border border-border overflow-hidden", lane.bgColor)}
                >
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between p-3 hover:bg-accent/30 transition-colors">
                      <div className="flex items-center gap-2">
                        <Icon className={cn("h-4 w-4", lane.color)} />
                        <span className="text-sm font-medium">{lane.label}</span>
                        <span className="text-xs text-muted-foreground bg-background/50 px-1.5 py-0.5 rounded">
                          {laneTickets.length}
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-2 pb-2 space-y-2">
                      {laneTickets.length === 0 ? (
                        <div className="text-xs text-muted-foreground italic py-2 px-2">
                          No tickets - drop here
                        </div>
                      ) : (
                        laneTickets.map((ticket) => (
                          <DraggableTicketCard
                            key={ticket.ticket_id}
                            ticket={ticket}
                            focusedTicket={focusedTicket}
                            isProcessing={isAgentRunning(ticket.ticket_id)}
                            onTicketClick={onTicketClick}
                            isDragging={activeTicket?.ticket_id === ticket.ticket_id}
                            variant="mobile"
                          />
                        ))
                      )}
                    </div>
                  </CollapsibleContent>
                </DroppableSection>
              </Collapsible>
            )
          })}
        </div>
      </div>

      <DragOverlay>
        {activeTicket ? <TicketCardOverlay ticket={activeTicket} variant="mobile" /> : null}
      </DragOverlay>
    </DndContext>
  )
}
