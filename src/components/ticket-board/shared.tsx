"use client"

import React, { useState, useCallback } from 'react'
import { Ticket } from '@/lib/types'
import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle, Clock, Circle, GripVertical } from 'lucide-react'
import { CopyTicketId } from '@/components/copy-ticket-id'
import {
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
} from '@dnd-kit/core'

export const STATUS_LANES = [
  { status: 'open', label: 'OPEN', icon: Circle, color: 'text-muted-foreground', bgColor: 'bg-muted/20' },
  { status: 'in_progress', label: 'IN PROGRESS', icon: Clock, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  { status: 'blocked', label: 'BLOCKED', icon: AlertCircle, color: 'text-destructive', bgColor: 'bg-destructive/10' },
  { status: 'completed', label: 'COMPLETED', icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-500/10' },
] as const

export interface TicketBoardProps {
  tickets: Ticket[]
  focusedTicket: string | null
  onTicketClick: (ticket: Ticket) => void
  onTicketStatusChange?: (ticket: Ticket, newStatus: string) => void
}

export function useTicketDragDrop(
  onTicketStatusChange: ((ticket: Ticket, newStatus: string) => void) | undefined,
  variant: 'desktop' | 'mobile',
  onDragStartExtra?: () => void,
) {
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null)
  const [overLane, setOverLane] = useState<string | null>(null)

  const sensors = useSensors(
    variant === 'desktop'
      ? useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
      : useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const ticket = event.active.data.current?.ticket as Ticket | undefined
    if (ticket) {
      setActiveTicket(ticket)
      onDragStartExtra?.()
    }
  }, [onDragStartExtra])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setOverLane(event.over?.id as string | null)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveTicket(null)
    setOverLane(null)

    if (!over) return

    const ticket = active.data.current?.ticket as Ticket | undefined
    const newStatus = over.id as string

    if (ticket && newStatus && ticket.status !== newStatus && onTicketStatusChange) {
      onTicketStatusChange(ticket, newStatus)
    }
  }, [onTicketStatusChange])

  return { activeTicket, overLane, sensors, handleDragStart, handleDragOver, handleDragEnd }
}

export function DraggableTicketCard({
  ticket,
  focusedTicket,
  isProcessing,
  onTicketClick,
  isDragging,
  variant = 'desktop',
}: {
  ticket: Ticket
  focusedTicket: string | null
  isProcessing: boolean
  onTicketClick: (ticket: Ticket) => void
  isDragging?: boolean
  variant?: 'desktop' | 'mobile'
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: ticket.ticket_id,
    data: { ticket },
  })

  const mobile = variant === 'mobile'

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        ...(mobile && { zIndex: 1000 }),
      }
    : undefined

  const hasRelationships =
    (ticket.blocks && ticket.blocks.length > 0) ||
    (ticket.blocked_by && ticket.blocked_by.length > 0) ||
    (ticket.caused_by && ticket.caused_by.length > 0)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex-shrink-0 p-3 bg-card/50 border transition-all",
        mobile ? "w-full rounded-lg" : "w-48 rounded-md",
        isDragging && (mobile ? "opacity-50 shadow-lg" : "opacity-50"),
        isProcessing && "rgb-processing-border",
        !isProcessing && focusedTicket === ticket.ticket_id
          ? mobile ? "border-primary ring-1 ring-primary/20" : "border-primary/50 ring-1 ring-primary/20"
          : !isProcessing ? "border-border" : "",
        !isProcessing && hasRelationships ? "border-yellow-600/30" : "",
        !mobile && "hover:bg-card hover:border-border",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className={cn(
            "flex-shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground mt-0.5",
            mobile && "p-1 -ml-1",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className={mobile ? "h-5 w-5" : "h-4 w-4"} />
        </button>

        <div className="flex-1 min-w-0">
          <CopyTicketId ticketId={ticket.ticket_id} className="text-[10px] mb-1" iconClassName="h-2 w-2" />

          <button
            onClick={() => onTicketClick(ticket)}
            className={cn("w-full text-left", mobile && "active:scale-[0.98]")}
          >
            <div className={cn(
              "text-sm text-card-foreground font-medium mb-2",
              !mobile && "line-clamp-2",
            )}>
              {ticket.title}
            </div>

            {mobile ? (
              hasRelationships && (
                <div className="flex flex-wrap gap-2 text-[10px] mb-2">
                  {ticket.blocks && ticket.blocks.length > 0 && (
                    <span className="text-destructive">blocks {ticket.blocks.length}</span>
                  )}
                  {ticket.blocked_by && ticket.blocked_by.length > 0 && (
                    <span className="text-orange-500">blocked by {ticket.blocked_by.length}</span>
                  )}
                  {ticket.caused_by && ticket.caused_by.length > 0 && (
                    <span className="text-yellow-500">caused by {ticket.caused_by.length}</span>
                  )}
                </div>
              )
            ) : (
              <div className="flex gap-2 text-[10px] text-muted-foreground">
                {ticket.blocks && ticket.blocks.length > 0 && (
                  <span className="text-destructive">blocks {ticket.blocks.length}</span>
                )}
                {ticket.blocked_by && ticket.blocked_by.length > 0 && (
                  <span className="text-orange-500">blocked by {ticket.blocked_by.length}</span>
                )}
                {ticket.caused_by && ticket.caused_by.length > 0 && (
                  <span className="text-yellow-500">caused by {ticket.caused_by.length}</span>
                )}
              </div>
            )}

            <div className={cn("mt-2 flex gap-1", mobile && "flex-wrap")}>
              {ticket.assignee && (
                <div className="inline-block px-1.5 py-0.5 bg-blue-500/10 text-blue-500 rounded text-[10px]">
                  {ticket.assignee}
                </div>
              )}
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

export function TicketCardOverlay({ ticket, variant = 'desktop' }: { ticket: Ticket; variant?: 'desktop' | 'mobile' }) {
  const mobile = variant === 'mobile'
  return (
    <div className={cn(
      "p-3 bg-card border border-primary",
      mobile ? "w-[calc(100vw-3rem)] max-w-md rounded-lg shadow-xl" : "w-48 rounded-md shadow-lg",
    )}>
      <div className="flex items-start gap-2">
        <GripVertical className={cn("text-muted-foreground flex-shrink-0 mt-0.5", mobile ? "h-5 w-5" : "h-4 w-4")} />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-mono text-muted-foreground mb-1">
            {ticket.ticket_id}
          </div>
          <div className={cn("text-sm text-card-foreground font-medium", !mobile && "line-clamp-2")}>
            {ticket.title}
          </div>
        </div>
      </div>
    </div>
  )
}
