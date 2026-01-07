"use client"

import React, { useState } from 'react'
import { Ticket } from '@/lib/types'
import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle, Clock, Circle, ChevronDown, ChevronRight } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { TicketBoardProps } from './TicketBoardDesktop'

// Define status lanes
const STATUS_LANES = [
  { status: 'open', label: 'OPEN', icon: Circle, color: 'text-muted-foreground', bgColor: 'bg-muted/20' },
  { status: 'in_progress', label: 'IN PROGRESS', icon: Clock, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  { status: 'blocked', label: 'BLOCKED', icon: AlertCircle, color: 'text-destructive', bgColor: 'bg-destructive/10' },
  { status: 'completed', label: 'COMPLETED', icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-500/10' },
] as const

export function TicketBoardMobile({ tickets, focusedTicket, onTicketClick }: TicketBoardProps) {
  // Track which lanes are expanded
  const [expandedLanes, setExpandedLanes] = useState<Set<string>>(new Set(['open', 'in_progress', 'blocked']))

  // Group tickets by status
  const ticketsByStatus = tickets.reduce((acc, ticket) => {
    const status = ticket.status || 'open'
    if (!acc[status]) {
      acc[status] = []
    }
    acc[status].push(ticket)
    return acc
  }, {} as Record<string, Ticket[]>)

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
    <div className="h-full overflow-y-auto pb-4">
      <div className="space-y-2 px-3">
        {STATUS_LANES.map((lane) => {
          const laneTickets = ticketsByStatus[lane.status] || []
          const Icon = lane.icon
          const isExpanded = expandedLanes.has(lane.status)

          return (
            <Collapsible
              key={lane.status}
              open={isExpanded}
              onOpenChange={() => toggleLane(lane.status)}
            >
              <div className={cn("rounded-lg border border-border overflow-hidden", lane.bgColor)}>
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
                        No tickets
                      </div>
                    ) : (
                      laneTickets.map((ticket) => (
                        <button
                          key={ticket.ticket_id}
                          onClick={() => onTicketClick(ticket)}
                          className={cn(
                            "w-full p-3 bg-card border rounded-lg transition-all text-left",
                            "active:scale-[0.98]",
                            focusedTicket === ticket.ticket_id
                              ? "border-primary ring-1 ring-primary/20"
                              : "border-border",
                            (ticket.blocks_tickets && ticket.blocks_tickets.length > 0) ||
                            (ticket.blocked_by_tickets && ticket.blocked_by_tickets.length > 0) ||
                            (ticket.caused_by_tickets && ticket.caused_by_tickets.length > 0)
                              ? "border-yellow-600/30"
                              : ""
                          )}
                        >
                          {/* Ticket ID */}
                          <div className="text-[10px] font-mono text-muted-foreground mb-1">
                            {ticket.ticket_id}
                          </div>

                          {/* Title */}
                          <div className="text-sm text-card-foreground font-medium mb-2">
                            {ticket.title}
                          </div>

                          {/* Relationship indicators */}
                          {((ticket.blocks_tickets && ticket.blocks_tickets.length > 0) ||
                            (ticket.blocked_by_tickets && ticket.blocked_by_tickets.length > 0) ||
                            (ticket.caused_by_tickets && ticket.caused_by_tickets.length > 0)) && (
                            <div className="flex flex-wrap gap-2 text-[10px] mb-2">
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
                          )}

                          {/* Badges */}
                          <div className="flex flex-wrap gap-1">
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
                        </button>
                      ))
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )
        })}
      </div>
    </div>
  )
}
