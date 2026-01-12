"use client"

import React, { useRef, useState } from 'react'
import { Ticket } from '@/lib/types'
import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle, Clock, Circle, ChevronLeft, ChevronRight, GripVertical } from 'lucide-react'
import { useAgentState } from '@/contexts/agent-state-context'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'

export interface TicketBoardProps {
  tickets: Ticket[]
  focusedTicket: string | null
  onTicketClick: (ticket: Ticket) => void
  onTicketStatusChange?: (ticket: Ticket, newStatus: string) => void
}

// Define status lanes
const STATUS_LANES = [
  { status: 'open', label: 'OPEN', icon: Circle, color: 'text-muted-foreground' },
  { status: 'in_progress', label: 'IN PROGRESS', icon: Clock, color: 'text-blue-500' },
  { status: 'blocked', label: 'BLOCKED', icon: AlertCircle, color: 'text-destructive' },
  { status: 'completed', label: 'COMPLETED', icon: CheckCircle, color: 'text-green-500' },
] as const

// Droppable lane component
function DroppableLane({
  status,
  children,
  isOver,
}: {
  status: string
  children: React.ReactNode
  isOver: boolean
}) {
  const { setNodeRef } = useDroppable({
    id: status,
  })

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

// Draggable ticket card component
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
      }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex-shrink-0 w-48 p-3 bg-card/50 border rounded-md transition-all",
        "hover:bg-card hover:border-border",
        isDragging && "opacity-50",
        isProcessing && "rgb-processing-border",
        !isProcessing && focusedTicket === ticket.ticket_id
          ? "border-primary/50 ring-1 ring-primary/20"
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
          className="flex-shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground mt-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <button
          onClick={() => onTicketClick(ticket)}
          className="flex-1 text-left min-w-0"
        >
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
        </button>
      </div>
    </div>
  )
}

// Ticket card for drag overlay (no drag handlers)
function TicketCardOverlay({ ticket }: { ticket: Ticket }) {
  return (
    <div className="w-48 p-3 bg-card border border-primary rounded-md shadow-lg">
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-mono text-muted-foreground mb-1">
            {ticket.ticket_id}
          </div>
          <div className="text-sm text-card-foreground font-medium line-clamp-2">
            {ticket.title}
          </div>
        </div>
      </div>
    </div>
  )
}

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
        <div className="text-xs text-muted-foreground italic">No tickets - drop here</div>
      </div>
    )
  }

  return (
    <>
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
    </>
  )
}

export function TicketBoardDesktop({ tickets, focusedTicket, onTicketClick, onTicketStatusChange }: TicketBoardProps) {
  const { isAgentRunning } = useAgentState()
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null)
  const [overLane, setOverLane] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
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

  const handleDragStart = (event: DragStartEvent) => {
    const ticket = event.active.data.current?.ticket as Ticket | undefined
    if (ticket) {
      setActiveTicket(ticket)
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

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full flex flex-col">
        {/* Lane grid - always render the structure for stable layout */}
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
                <DroppableLane status={lane.status} isOver={isOver}>
                  <ScrollableLane hasTickets={laneTickets.length > 0}>
                    {laneTickets.map((ticket) => {
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
                    })}
                  </ScrollableLane>
                </DroppableLane>
              </div>
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
