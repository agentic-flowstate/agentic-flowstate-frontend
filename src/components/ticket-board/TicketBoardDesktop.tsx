"use client"

import React, { useRef } from 'react'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAgentState } from '@/contexts/agent-state-context'
import { DndContext, DragOverlay, useDroppable } from '@dnd-kit/core'
import {
  STATUS_LANES,
  TicketBoardProps,
  useTicketDragDrop,
  DraggableTicketCard,
  TicketCardOverlay,
} from './shared'

export type { TicketBoardProps }

function DroppableLane({
  status,
  children,
  isOver,
}: {
  status: string
  children: React.ReactNode
  isOver: boolean
}) {
  const { setNodeRef } = useDroppable({ id: status })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 min-w-0 relative group h-full transition-colors duration-200",
        isOver && "bg-primary/10"
      )}
    >
      {children}
    </div>
  )
}

function ScrollableLane({ children, hasTickets }: { children: React.ReactNode; hasTickets: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -200 : 200,
      behavior: 'smooth',
    })
  }

  if (!hasTickets) {
    return (
      <div className="flex-1 p-4 flex items-center">
        <div className="text-xs text-muted-foreground italic">No tickets - drop here</div>
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => scroll('left')}
        className="absolute left-0 z-10 h-full px-1 bg-gradient-to-r from-background/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Scroll left"
      >
        <ChevronLeft className="h-4 w-4 text-muted-foreground" />
      </button>

      <div ref={scrollRef} className="h-full w-full p-4 flex items-center gap-3 overflow-x-auto scrollbar-thin">
        {children}
      </div>

      <button
        onClick={() => scroll('right')}
        className="absolute right-0 z-10 h-full px-1 bg-gradient-to-l from-background/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Scroll right"
      >
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
    </>
  )
}

export function TicketBoardDesktop({ tickets, focusedTicket, onTicketClick, onTicketStatusChange }: TicketBoardProps) {
  const { isAgentRunning } = useAgentState()
  const { activeTicket, overLane, sensors, handleDragStart, handleDragOver, handleDragEnd } =
    useTicketDragDrop(onTicketStatusChange, 'desktop')

  const ticketsByStatus = tickets.reduce((acc, ticket) => {
    const status = ticket.status || 'open'
    if (!acc[status]) acc[status] = []
    acc[status].push(ticket)
    return acc
  }, {} as Record<string, import('@/lib/types').Ticket[]>)

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className="h-full flex flex-col">
        <div className="flex-1 grid grid-rows-4 gap-0 border border-border rounded-lg overflow-hidden">
          {STATUS_LANES.map((lane, index) => {
            const laneTickets = ticketsByStatus[lane.status] || []
            const Icon = lane.icon
            const isOver = overLane === lane.status

            return (
              <div
                key={lane.status}
                className={cn(
                  "flex min-w-0 border-border",
                  index < STATUS_LANES.length - 1 && "border-b"
                )}
              >
                <div className="w-32 bg-muted/30 border-r border-border p-4 flex items-center flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", lane.color)} />
                    <span className="text-xs font-medium text-muted-foreground">{lane.label}</span>
                    {laneTickets.length > 0 && (
                      <span className="ml-2 text-xs text-muted-foreground">({laneTickets.length})</span>
                    )}
                  </div>
                </div>

                <DroppableLane status={lane.status} isOver={isOver}>
                  <ScrollableLane hasTickets={laneTickets.length > 0}>
                    {laneTickets.map((ticket) => (
                      <DraggableTicketCard
                        key={ticket.ticket_id}
                        ticket={ticket}
                        focusedTicket={focusedTicket}
                        isProcessing={isAgentRunning(ticket.ticket_id)}
                        onTicketClick={onTicketClick}
                        isDragging={activeTicket?.ticket_id === ticket.ticket_id}
                        variant="desktop"
                      />
                    ))}
                  </ScrollableLane>
                </DroppableLane>
              </div>
            )
          })}
        </div>
      </div>

      <DragOverlay>
        {activeTicket ? <TicketCardOverlay ticket={activeTicket} variant="desktop" /> : null}
      </DragOverlay>
    </DndContext>
  )
}
