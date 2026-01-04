"use client"

import * as React from "react"
import { Ticket } from "@/lib/types"
import { TicketCard } from "@/components/ticket-card"

interface TicketListProps {
  tickets: Ticket[]
  epicId: string
  sliceId: string
}

export function TicketList({ tickets, epicId, sliceId }: TicketListProps) {
  if (tickets.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground text-lg">
          No tickets found for this slice
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {tickets.map((ticket) => (
        <TicketCard key={ticket.id} ticket={ticket} epicId={epicId} sliceId={sliceId} />
      ))}
    </div>
  )
}
