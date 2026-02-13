"use client"

import React from 'react'
import { Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Ticket } from '@/lib/types'

export interface TicketRelationshipsProps {
  ticket: Ticket
  variant?: 'desktop' | 'mobile'
}

export function TicketRelationships({ ticket, variant = 'desktop' }: TicketRelationshipsProps) {
  const hasRelationships =
    (ticket.blocks && ticket.blocks.length > 0) ||
    (ticket.blocked_by && ticket.blocked_by.length > 0) ||
    (ticket.caused_by && ticket.caused_by.length > 0)

  if (!hasRelationships) return null

  const isMobile = variant === 'mobile'
  const iconSize = isMobile ? 'h-4 w-4' : 'h-3 w-3'
  const textSize = isMobile ? 'text-sm' : 'text-xs'
  const spacing = isMobile ? 'space-y-4' : 'space-y-3'
  const itemSpacing = isMobile ? 'space-y-2' : 'space-y-1'
  const itemPadding = isMobile ? 'px-3 py-2' : 'px-2 py-1'

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Link2 className={cn(iconSize, "text-muted-foreground")} />
        <span className={cn(textSize, "font-medium text-muted-foreground")}>RELATIONSHIPS</span>
      </div>

      <div className={spacing}>
        {/* Blocks */}
        {ticket.blocks && ticket.blocks.length > 0 && (
          <div>
            <div className={cn(textSize, "text-destructive mb-1", isMobile && "mb-2")}>Blocks</div>
            <div className={itemSpacing}>
              {ticket.blocks.map((id) => (
                <div
                  key={id}
                  className={cn(
                    itemPadding,
                    "bg-muted/50 border border-border font-mono text-muted-foreground",
                    isMobile ? "rounded-md text-sm" : "rounded text-xs"
                  )}
                >
                  {id}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Blocked by */}
        {ticket.blocked_by && ticket.blocked_by.length > 0 && (
          <div>
            <div className={cn(textSize, "text-orange-500 mb-1", isMobile && "mb-2")}>Blocked by</div>
            <div className={itemSpacing}>
              {ticket.blocked_by.map((id) => (
                <div
                  key={id}
                  className={cn(
                    itemPadding,
                    "bg-muted/50 border border-border font-mono text-muted-foreground",
                    isMobile ? "rounded-md text-sm" : "rounded text-xs"
                  )}
                >
                  {id}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Caused by */}
        {ticket.caused_by && ticket.caused_by.length > 0 && (
          <div>
            <div className={cn(textSize, "text-yellow-500 mb-1", isMobile && "mb-2")}>Caused by</div>
            <div className={itemSpacing}>
              {ticket.caused_by.map((id) => (
                <div
                  key={id}
                  className={cn(
                    itemPadding,
                    "bg-muted/50 border border-border font-mono text-muted-foreground",
                    isMobile ? "rounded-md text-sm" : "rounded text-xs"
                  )}
                >
                  {id}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
