"use client"

import React, { useRef } from 'react'
import { Ticket } from '@/lib/types'
import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle, Clock, Circle, ChevronLeft, ChevronRight } from 'lucide-react'

export interface TicketBoardProps {
  tickets: Ticket[]
  focusedTicket: string | null
  onTicketClick: (ticket: Ticket) => void
}

// Define status lanes
const STATUS_LANES = [
  { status: 'open', label: 'OPEN', icon: Circle, color: 'text-muted-foreground' },
  { status: 'in_progress', label: 'IN PROGRESS', icon: Clock, color: 'text-blue-500' },
  { status: 'blocked', label: 'BLOCKED', icon: AlertCircle, color: 'text-destructive' },
  { status: 'completed', label: 'COMPLETED', icon: CheckCircle, color: 'text-green-500' },
] as const

// Scrollable lane component with navigation arrows
function ScrollableLane({
  children,
  hasTickets
}: {
  children: React.ReactNode
  hasTickets: boolean
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    const scrollAmount = 200
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    })
  }

  if (!hasTickets) {
    return (
      <div className="flex-1 p-4 flex items-center">
        <div className="text-xs text-muted-foreground italic">No tickets</div>
      </div>
    )
  }

  return (
    <div className="flex-1 min-w-0 relative group h-full">
      {/* Left scroll button */}
      <button
        onClick={() => scroll('left')}
        className="absolute left-0 z-10 h-full px-1 bg-gradient-to-r from-background/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Scroll left"
      >
        <ChevronLeft className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Scrollable ticket area - full height of lane */}
      <div
        ref={scrollRef}
        className="h-full w-full p-4 flex items-center gap-3 overflow-x-auto scrollbar-thin"
      >
        {children}
      </div>

      {/* Right scroll button */}
      <button
        onClick={() => scroll('right')}
        className="absolute right-0 z-10 h-full px-1 bg-gradient-to-l from-background/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Scroll right"
      >
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  )
}

export function TicketBoardDesktop({ tickets, focusedTicket, onTicketClick }: TicketBoardProps) {
  // Group tickets by status
  const ticketsByStatus = tickets.reduce((acc, ticket) => {
    const status = ticket.status || 'open'
    if (!acc[status]) {
      acc[status] = []
    }
    acc[status].push(ticket)
    return acc
  }, {} as Record<string, Ticket[]>)

  return (
    <div className="h-full flex flex-col">
      {/* Lane grid - always render the structure for stable layout */}
      <div className="flex-1 grid grid-rows-4 gap-0 border border-border rounded-lg overflow-hidden">
        {STATUS_LANES.map((lane, index) => {
          const laneTickets = ticketsByStatus[lane.status] || []
          const Icon = lane.icon

          return (
            <div
              key={lane.status}
              className={cn(
                "flex min-w-0 border-border",
                index < STATUS_LANES.length - 1 && "border-b"
              )}
            >
              {/* Lane header - sticky */}
              <div className="w-32 bg-muted/30 border-r border-border p-4 flex items-center flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-4 w-4", lane.color)} />
                  <span className="text-xs font-medium text-muted-foreground">{lane.label}</span>
                  {laneTickets.length > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground">({laneTickets.length})</span>
                  )}
                </div>
              </div>

              {/* Lane tickets with scroll controls */}
              <ScrollableLane hasTickets={laneTickets.length > 0}>
                {laneTickets.map((ticket) => (
                    <button
                      key={ticket.ticket_id}
                      onClick={() => onTicketClick(ticket)}
                      className={cn(
                        "flex-shrink-0 w-48 p-3 bg-card/50 border rounded-md transition-all",
                        "hover:bg-card hover:border-border",
                        focusedTicket === ticket.ticket_id
                          ? "border-primary/50 ring-1 ring-primary/20"
                          : "border-border",
                        // Show cross-slice relationships with yellow border
                        (ticket.blocks_tickets && ticket.blocks_tickets.length > 0) ||
                        (ticket.blocked_by_tickets && ticket.blocked_by_tickets.length > 0) ||
                        (ticket.caused_by_tickets && ticket.caused_by_tickets.length > 0)
                          ? "border-yellow-600/30"
                          : ""
                      )}
                    >
                      <div className="text-left">
                        {/* Ticket ID */}
                        <div className="text-[10px] font-mono text-muted-foreground mb-1">
                          {ticket.ticket_id}
                        </div>

                        {/* Title */}
                        <div className="text-sm text-card-foreground font-medium line-clamp-2 mb-2">
                          {ticket.title}
                        </div>

                        {/* Relationship indicators */}
                        <div className="flex gap-2 text-[10px] text-muted-foreground">
                          {ticket.blocks_tickets && ticket.blocks_tickets.length > 0 && (
                            <span className="text-destructive">
                              blocks {ticket.blocks_tickets.length}
                            </span>
                          )}
                          {ticket.blocked_by_tickets && ticket.blocked_by_tickets.length > 0 && (
                            <span className="text-orange-500">
                              blocked by {ticket.blocked_by_tickets.length}
                            </span>
                          )}
                          {ticket.caused_by_tickets && ticket.caused_by_tickets.length > 0 && (
                            <span className="text-yellow-500">
                              caused by {ticket.caused_by_tickets.length}
                            </span>
                          )}
                        </div>

                        {/* Badges */}
                        <div className="mt-2 flex gap-1">
                          {ticket.type && ticket.type !== 'task' && (
                            <div className="inline-block px-1.5 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">
                              {ticket.type}
                            </div>
                          )}
                          {ticket.assignee && (
                            <div className="inline-block px-1.5 py-0.5 bg-blue-500/10 text-blue-500 rounded text-[10px]">
                              {ticket.assignee}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
              </ScrollableLane>
            </div>
          )
        })}
      </div>
    </div>
  )
}