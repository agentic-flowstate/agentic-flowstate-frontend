"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Epic, Slice, Ticket } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Circle, GitBranch, AlertCircle, CheckCircle2, Clock, Zap } from 'lucide-react'

interface WorkspaceViewProps {
  epic: Epic
  slices: Slice[]
  tickets: Record<string, Ticket[]> // keyed by slice_id
  focusedTicket?: string | null
  onTicketClick?: (ticket: Ticket) => void
}

// Ticket status to icon and color
const statusConfig = {
  'todo': { icon: Circle, color: 'text-zinc-500' },
  'in_progress': { icon: Clock, color: 'text-blue-500' },
  'blocked': { icon: AlertCircle, color: 'text-orange-500' },
  'done': { icon: CheckCircle2, color: 'text-emerald-500' },
}

// Ticket type to icon
const typeConfig = {
  'task': { icon: Circle, label: 'T' },
  'bug': { icon: AlertCircle, label: 'B' },
  'feature': { icon: Zap, label: 'F' },
}

export function WorkspaceView({
  epic,
  slices,
  tickets,
  focusedTicket,
  onTicketClick
}: WorkspaceViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [connections, setConnections] = useState<any[]>([])
  const [hoveredTicket, setHoveredTicket] = useState<string | null>(null)
  const [activeSliceIndex, setActiveSliceIndex] = useState(0)

  // Calculate ticket connections across slices
  useEffect(() => {
    const allConnections: any[] = []

    slices.forEach((slice, sliceIndex) => {
      const sliceTickets = tickets[slice.slice_id] || []

      sliceTickets.forEach(ticket => {
        // Process blocks relationships
        if (ticket.blocks_tickets?.length) {
          ticket.blocks_tickets.forEach(blockedId => {
            allConnections.push({
              from: ticket.ticket_id,
              to: blockedId,
              type: 'blocks',
              fromSlice: sliceIndex,
              toSlice: findTicketSliceIndex(blockedId)
            })
          })
        }

        // Process blocked_by relationships
        if (ticket.blocked_by_tickets?.length) {
          ticket.blocked_by_tickets.forEach(blockerId => {
            allConnections.push({
              from: blockerId,
              to: ticket.ticket_id,
              type: 'blocks',
              fromSlice: findTicketSliceIndex(blockerId),
              toSlice: sliceIndex
            })
          })
        }
      })
    })

    setConnections(allConnections)
  }, [slices, tickets])

  const findTicketSliceIndex = (ticketId: string): number => {
    for (let i = 0; i < slices.length; i++) {
      const sliceTickets = tickets[slices[i].slice_id] || []
      if (sliceTickets.some(t => t.ticket_id === ticketId)) {
        return i
      }
    }
    return -1
  }

  const isTicketConnected = (ticketId: string): boolean => {
    if (!hoveredTicket && !focusedTicket) return false
    const referenceTicket = hoveredTicket || focusedTicket
    return connections.some(c =>
      (c.from === referenceTicket && c.to === ticketId) ||
      (c.to === referenceTicket && c.from === ticketId)
    )
  }

  return (
    <div className="relative w-full h-full min-h-[80vh] overflow-hidden bg-zinc-950">
      {/* Depth gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-950/95 to-zinc-900/80" />

      {/* Connection lines SVG layer */}
      <svg
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 10 }}
      >
        <defs>
          <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgb(59 130 246 / 0.5)" />
            <stop offset="100%" stopColor="rgb(59 130 246 / 0.1)" />
          </linearGradient>
        </defs>

        {connections.map((conn, idx) => {
          const fromEl = document.getElementById(`ticket-${conn.from}`)
          const toEl = document.getElementById(`ticket-${conn.to}`)

          if (!fromEl || !toEl) return null

          const fromRect = fromEl.getBoundingClientRect()
          const toRect = toEl.getBoundingClientRect()
          const containerRect = containerRef.current?.getBoundingClientRect()

          if (!containerRect) return null

          const fromX = fromRect.left + fromRect.width / 2 - containerRect.left
          const fromY = fromRect.top + fromRect.height / 2 - containerRect.top
          const toX = toRect.left + toRect.width / 2 - containerRect.left
          const toY = toRect.top + toRect.height / 2 - containerRect.top

          const opacity = hoveredTicket === conn.from || hoveredTicket === conn.to ? 0.6 : 0.2
          const strokeWidth = hoveredTicket === conn.from || hoveredTicket === conn.to ? 2 : 1

          return (
            <path
              key={idx}
              d={`M ${fromX} ${fromY} C ${fromX} ${fromY + 50}, ${toX} ${toY - 50}, ${toX} ${toY}`}
              stroke="url(#connectionGradient)"
              strokeWidth={strokeWidth}
              fill="none"
              opacity={opacity}
              className="transition-all duration-300"
            />
          )
        })}
      </svg>

      {/* Slices container */}
      <div
        ref={containerRef}
        className="relative h-full pt-8 pb-16 px-8 space-y-12"
        style={{ perspective: '2000px' }}
      >
        {slices.map((slice, sliceIndex) => {
          const depth = Math.abs(sliceIndex - activeSliceIndex)
          const isActive = sliceIndex === activeSliceIndex
          const zOffset = depth * -100
          const opacity = Math.max(0.4, 1 - depth * 0.2)
          const blur = depth > 0 ? `blur(${depth * 0.5}px)` : 'none'
          const scale = 1 - depth * 0.02

          return (
            <div
              key={slice.slice_id}
              className={cn(
                "relative transition-all duration-500 ease-out",
                isActive ? "z-20" : depth === 1 ? "z-10" : "z-0"
              )}
              style={{
                transform: `translateZ(${zOffset}px) translateY(${depth * 20}px) scale(${scale})`,
                opacity,
                filter: blur,
              }}
              onClick={() => setActiveSliceIndex(sliceIndex)}
            >
              {/* Slice plane */}
              <div className={cn(
                "relative rounded-lg border transition-all duration-300",
                isActive
                  ? "bg-zinc-900/90 border-zinc-700/50 shadow-2xl"
                  : "bg-zinc-900/60 border-zinc-800/30"
              )}>
                {/* Slice header */}
                <div className="px-6 py-3 border-b border-zinc-800/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        isActive ? "bg-blue-500" : "bg-zinc-600"
                      )} />
                      <h3 className={cn(
                        "font-medium transition-colors",
                        isActive ? "text-zinc-100" : "text-zinc-400"
                      )}>
                        {slice.title}
                      </h3>
                      <span className="text-xs text-zinc-500">
                        {(tickets[slice.slice_id] || []).length} tickets
                      </span>
                    </div>
                    {slice.notes && (
                      <span className="text-xs text-zinc-600">{slice.notes}</span>
                    )}
                  </div>
                </div>

                {/* Tickets grid */}
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {(tickets[slice.slice_id] || []).map(ticket => {
                      const isConnected = isTicketConnected(ticket.ticket_id)
                      const isHovered = hoveredTicket === ticket.ticket_id
                      const isFocused = focusedTicket === ticket.ticket_id

                      const StatusIcon = statusConfig[ticket.status as keyof typeof statusConfig]?.icon || Circle
                      const statusColor = statusConfig[ticket.status as keyof typeof statusConfig]?.color || 'text-zinc-500'
                      const typeInfo = typeConfig[ticket.type as keyof typeof typeConfig] || typeConfig.task

                      return (
                        <div
                          key={ticket.ticket_id}
                          id={`ticket-${ticket.ticket_id}`}
                          className={cn(
                            "relative group cursor-pointer transition-all duration-200",
                            "px-3 py-2 rounded border",
                            isActive ? "hover:scale-[1.02]" : "",
                            isFocused
                              ? "bg-blue-950/30 border-blue-500/50 shadow-lg shadow-blue-500/10"
                              : isConnected
                              ? "bg-zinc-800/40 border-zinc-600/40"
                              : isHovered
                              ? "bg-zinc-800/60 border-zinc-600/60"
                              : "bg-zinc-900/40 border-zinc-800/40 hover:bg-zinc-800/40"
                          )}
                          onMouseEnter={() => setHoveredTicket(ticket.ticket_id)}
                          onMouseLeave={() => setHoveredTicket(null)}
                          onClick={() => onTicketClick?.(ticket)}
                        >
                          {/* Status indicator */}
                          <div className="flex items-start justify-between mb-1">
                            <StatusIcon className={cn("w-3 h-3 mt-0.5", statusColor)} />
                            <span className="text-[10px] text-zinc-600 font-mono">
                              {typeInfo.label}
                            </span>
                          </div>

                          {/* Title */}
                          <h4 className={cn(
                            "text-xs font-medium line-clamp-2 transition-colors",
                            isFocused || isConnected
                              ? "text-zinc-100"
                              : "text-zinc-300 group-hover:text-zinc-100"
                          )}>
                            {ticket.title}
                          </h4>

                          {/* Connection indicator */}
                          {(ticket.blocks_tickets?.length || ticket.blocked_by_tickets?.length) ? (
                            <div className="absolute -right-1 -top-1">
                              <GitBranch className="w-3 h-3 text-blue-500/60" />
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Depth indicator */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2">
        {slices.map((_, idx) => (
          <button
            key={idx}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              idx === activeSliceIndex
                ? "bg-blue-500 w-8"
                : "bg-zinc-700 hover:bg-zinc-600"
            )}
            onClick={() => setActiveSliceIndex(idx)}
          />
        ))}
      </div>
    </div>
  )
}