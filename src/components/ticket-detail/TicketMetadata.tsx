"use client"

import React from 'react'
import { cn } from '@/lib/utils'
import { Ticket } from '@/lib/types'

export interface TicketMetadataProps {
  ticket: Ticket
  variant?: 'desktop' | 'mobile'
}

export function TicketMetadata({ ticket, variant = 'desktop' }: TicketMetadataProps) {
  const isMobile = variant === 'mobile'
  const textSize = isMobile ? 'text-sm' : 'text-xs'
  const spacing = isMobile ? 'space-y-3' : 'space-y-2'

  return (
    <div className="pt-4 border-t border-border">
      <div className={cn(spacing, textSize, "text-muted-foreground")}>
        <div className="flex justify-between">
          <span>Created</span>
          <span className="font-mono">
            {new Date(ticket.created_at_iso).toLocaleDateString()}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Updated</span>
          <span className="font-mono">
            {new Date(ticket.updated_at_iso).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  )
}
