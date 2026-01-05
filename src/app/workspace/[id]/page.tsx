"use client"

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { WorkspaceView } from '@/components/workspace-view'
import { getEpic, getSlices, getTickets } from '@/lib/api/tickets'
import { Epic, Slice, Ticket } from '@/lib/types'
import { useOrganization } from '@/contexts/organization-context'

export default function WorkspacePage() {
  const params = useParams()
  const epicId = params.id as string
  const { selectedOrg } = useOrganization()

  const [epic, setEpic] = useState<Epic | null>(null)
  const [slices, setSlices] = useState<Slice[]>([])
  const [tickets, setTickets] = useState<Record<string, Ticket[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [focusedTicket, setFocusedTicket] = useState<string | null>(null)

  useEffect(() => {
    async function loadWorkspaceData() {
      if (!epicId) return

      try {
        setIsLoading(true)

        // Load epic
        const epicData = await getEpic(epicId)
        if (!epicData) {
          console.error('Epic not found')
          return
        }
        setEpic(epicData)

        // Load slices
        const slicesData = await getSlices(epicId)
        setSlices(slicesData)

        // Load tickets for each slice
        const ticketsMap: Record<string, Ticket[]> = {}
        await Promise.all(
          slicesData.map(async (slice) => {
            const sliceTickets = await getTickets(epicId, slice.slice_id)
            ticketsMap[slice.slice_id] = sliceTickets
          })
        )
        setTickets(ticketsMap)
      } catch (error) {
        console.error('Failed to load workspace data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadWorkspaceData()
  }, [epicId, selectedOrg])

  const handleTicketClick = (ticket: Ticket) => {
    setFocusedTicket(ticket.ticket_id === focusedTicket ? null : ticket.ticket_id)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950">
        <div className="text-zinc-500 font-mono text-xs">
          Loading workspace...
        </div>
      </div>
    )
  }

  if (!epic) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950">
        <div className="text-zinc-500 font-mono text-xs">
          Epic not found
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-zinc-950 overflow-hidden">
      {/* Epic context bar */}
      <div className="h-8 bg-zinc-900/50 border-b border-zinc-800/30 flex items-center px-4">
        <div className="flex items-center gap-4 text-xs">
          <span className="text-zinc-600 font-mono">EPIC</span>
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-blue-500/60" />
            <span className="text-zinc-400 font-medium">{epic.title}</span>
          </div>
          {epic.notes && (
            <>
              <span className="text-zinc-700">|</span>
              <span className="text-zinc-600 text-[10px]">{epic.notes}</span>
            </>
          )}
          <div className="ml-auto flex items-center gap-3 text-zinc-600">
            <span>{slices.length} slices</span>
            <span>•</span>
            <span>
              {Object.values(tickets).reduce((acc, t) => acc + t.length, 0)} tickets
            </span>
          </div>
        </div>
      </div>

      {/* Workspace view */}
      <WorkspaceView
        epic={epic}
        slices={slices}
        tickets={tickets}
        focusedTicket={focusedTicket}
        onTicketClick={handleTicketClick}
      />
    </div>
  )
}