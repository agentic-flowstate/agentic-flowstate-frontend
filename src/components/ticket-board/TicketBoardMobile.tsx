"use client"

import React, { useState } from 'react'
import { Ticket } from '@/lib/types'
import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle, Clock, Circle, ChevronDown, ChevronRight, GripVertical } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { TicketBoardProps } from './TicketBoardDesktop'
import { useAgentState } from '@/contexts/agent-state-context'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'

// Define status lanes
const STATUS_LANES = [
  { status: 'open', label: 'OPEN', icon: Circle, color: 'text-muted-foreground', bgColor: 'bg-muted/20' },
  { status: 'in_progress', label: 'IN PROGRESS', icon: Clock, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  { status: 'blocked', label: 'BLOCKED', icon: AlertCircle, color: 'text-destructive', bgColor: 'bg-destructive/10' },
  { status: 'completed', label: 'COMPLETED', icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-500/10' },
] as const

// Droppable section component
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
  const { setNodeRef } = useDroppable({
    id: status,
  })

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

// Draggable ticket card component for mobile
function DraggableTicketCard({
  ticket,
  focusedTicket,
  isProcessing,
  onTicketClick,
  isDragging,
}: {
  ticket: Ticket
  focusedTicket: string | null
  isProcessing: boolean
  onTicketClick: (ticket: Ticket) => void
  isDragging?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: ticket.ticket_id,
    data: { ticket },
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 1000,
      }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "w-full p-3 bg-card border rounded-lg transition-all",
        isDragging && "opacity-50 shadow-lg",
        isProcessing && "rgb-processing-border",
        !isProcessing && focusedTicket === ticket.ticket_id
          ? "border-primary ring-1 ring-primary/20"
          : !isProcessing ? "border-border" : "",
        !isProcessing && (
          (ticket.blocks_tickets && ticket.blocks_tickets.length > 0) ||
          (ticket.blocked_by_tickets && ticket.blocked_by_tickets.length > 0) ||
          (ticket.caused_by_tickets && ticket.caused_by_tickets.length > 0)
        )
          ? "border-yellow-600/30"
          : ""
      )}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground mt-0.5 p-1 -ml-1"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <button
          onClick={() => onTicketClick(ticket)}
          className="flex-1 text-left min-w-0 active:scale-[0.98]"
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
      </div>
    </div>
  )
}

// Ticket card for drag overlay
function TicketCardOverlay({ ticket }: { ticket: Ticket }) {
  return (
    <div className="w-[calc(100vw-3rem)] max-w-md p-3 bg-card border border-primary rounded-lg shadow-xl">
      <div className="flex items-start gap-2">
        <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-mono text-muted-foreground mb-1">
            {ticket.ticket_id}
          </div>
          <div className="text-sm text-card-foreground font-medium">
            {ticket.title}
          </div>
        </div>
      </div>
    </div>
  )
}

export function TicketBoardMobile({ tickets, focusedTicket, onTicketClick, onTicketStatusChange }: TicketBoardProps) {
  const { isAgentRunning } = useAgentState()
  const [expandedLanes, setExpandedLanes] = useState<Set<string>>(new Set(['open', 'in_progress', 'blocked']))
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null)
  const [overLane, setOverLane] = useState<string | null>(null)

  // Use touch sensor with delay to differentiate from scroll
  const sensors = useSensors(
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  )

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

  const handleDragStart = (event: DragStartEvent) => {
    const ticket = event.active.data.current?.ticket as Ticket | undefined
    if (ticket) {
      setActiveTicket(ticket)
      // Auto-expand all lanes when dragging starts
      setExpandedLanes(new Set(STATUS_LANES.map(l => l.status)))
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    setOverLane(event.over?.id as string | null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTicket(null)
    setOverLane(null)

    if (!over) return

    const ticket = active.data.current?.ticket as Ticket | undefined
    const newStatus = over.id as string

    if (ticket && newStatus && ticket.status !== newStatus && onTicketStatusChange) {
      onTicketStatusChange(ticket, newStatus)
    }
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
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full overflow-y-auto pb-4">
        <div className="space-y-2 px-3">
          {STATUS_LANES.map((lane) => {
            const laneTickets = ticketsByStatus[lane.status] || []
            const Icon = lane.icon
            const isExpanded = expandedLanes.has(lane.status)
            const isOver = overLane === lane.status

            return (
              <Collapsible
                key={lane.status}
                open={isExpanded}
                onOpenChange={() => toggleLane(lane.status)}
              >
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
                        laneTickets.map((ticket) => {
                          const isProcessing = isAgentRunning(ticket.ticket_id)
                          const isDragging = activeTicket?.ticket_id === ticket.ticket_id
                          return (
                            <DraggableTicketCard
                              key={ticket.ticket_id}
                              ticket={ticket}
                              focusedTicket={focusedTicket}
                              isProcessing={isProcessing}
                              onTicketClick={onTicketClick}
                              isDragging={isDragging}
                            />
                          )
                        })
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
        {activeTicket ? <TicketCardOverlay ticket={activeTicket} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
