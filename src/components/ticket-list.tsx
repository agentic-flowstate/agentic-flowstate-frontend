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
      <div className="flex items-center justify-center py-16 border border-dashed rounded-lg">
        <div className="text-center px-4">
          <p className="text-muted-foreground">
            No tickets yet
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            This slice has no tickets
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {tickets.map((ticket) => (
        <TicketCard key={ticket.ticket_id} ticket={ticket} epicId={epicId} sliceId={sliceId} />
      ))}
    </div>
  )
}
