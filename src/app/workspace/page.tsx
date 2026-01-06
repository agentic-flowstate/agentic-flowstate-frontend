"use client"

import React, { useEffect, useState, useMemo } from 'react'
import { Sidebar } from '@/components/sidebar'
import { TicketBoard } from '@/components/ticket-board'
import { TicketDrawer } from '@/components/ticket-drawer'
import { AssigneeFilter } from '@/components/assignee-filter'
import { getEpics, getSlices, getTickets } from '@/lib/api/tickets'
import { Epic, Slice, Ticket } from '@/lib/types'
import { useOrganization } from '@/contexts/organization-context'

export default function WorkspacePage() {
  const { selectedOrg } = useOrganization()

  // Data state
  const [epics, setEpics] = useState<Epic[]>([])
  const [slices, setSlices] = useState<Slice[]>([])
  const [tickets, setTickets] = useState<Record<string, Ticket[]>>({})

  // Selection state
  const [selectedEpic, setSelectedEpic] = useState<Epic | null>(null)
  const [selectedSlice, setSelectedSlice] = useState<Slice | null>(null)
  const [focusedTicket, setFocusedTicket] = useState<string | null>(null)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null)

  // Loading state
  const [isLoadingEpics, setIsLoadingEpics] = useState(false)
  const [isLoadingSlices, setIsLoadingSlices] = useState(false)
  const [isLoadingTickets, setIsLoadingTickets] = useState(false)

  // Load epics when organization changes
  useEffect(() => {
    async function loadEpics() {
      if (!selectedOrg) return

      // Reset selections when org changes
      setSelectedEpic(null)
      setSelectedSlice(null)
      setFocusedTicket(null)
      setSelectedTicket(null)

      try {
        setIsLoadingEpics(true)
        const epicsList = await getEpics()
        setEpics(epicsList)
      } catch (error) {
        console.error('Failed to load epics:', error)
      } finally {
        setIsLoadingEpics(false)
      }
    }

    loadEpics()
  }, [selectedOrg])

  // Load slices when epic changes
  useEffect(() => {
    async function loadSlices() {
      if (!selectedEpic) {
        setSlices([])
        setSelectedSlice(null)
        return
      }

      try {
        setIsLoadingSlices(true)
        const slicesList = await getSlices(selectedEpic.epic_id)
        setSlices(slicesList)
      } catch (error) {
        console.error('Failed to load slices:', error)
      } finally {
        setIsLoadingSlices(false)
      }
    }

    loadSlices()
  }, [selectedEpic])

  // Load tickets when slice changes
  useEffect(() => {
    async function loadTickets() {
      if (!selectedEpic || !selectedSlice) {
        setTickets({})
        return
      }

      try {
        setIsLoadingTickets(true)
        const sliceTickets = await getTickets(selectedEpic.epic_id, selectedSlice.slice_id)
        setTickets({ [selectedSlice.slice_id]: sliceTickets })
      } catch (error) {
        console.error('Failed to load tickets:', error)
      } finally {
        setIsLoadingTickets(false)
      }
    }

    loadTickets()
  }, [selectedEpic, selectedSlice])

  const handleTicketClick = (ticket: Ticket) => {
    setFocusedTicket(ticket.ticket_id === focusedTicket ? null : ticket.ticket_id)
    setSelectedTicket(ticket)
  }

  const handleCloseDrawer = () => {
    setSelectedTicket(null)
    setFocusedTicket(null)
  }

  const handleEpicCreated = (newEpic: Epic) => {
    // Add the new epic to the list
    setEpics(prev => [...prev, newEpic])
    // Optionally select the new epic
    setSelectedEpic(newEpic)
  }

  // Compute available assignees from all epics
  const availableAssignees = useMemo(() => {
    const assigneeSet = new Set<string>()
    epics.forEach(epic => {
      if (epic.assignees) {
        epic.assignees.forEach(assignee => assigneeSet.add(assignee))
      }
    })
    return Array.from(assigneeSet).sort()
  }, [epics])

  // Filter epics by selected assignee
  const filteredEpics = useMemo(() => {
    if (!selectedAssignee) return epics
    return epics.filter(epic =>
      epic.assignees?.includes(selectedAssignee)
    )
  }, [epics, selectedAssignee])

  // Filter slices by selected assignee
  const filteredSlices = useMemo(() => {
    if (!selectedAssignee) return slices
    return slices.filter(slice =>
      slice.assignees?.includes(selectedAssignee)
    )
  }, [slices, selectedAssignee])

  // Filter tickets by selected assignee
  const filteredTickets = useMemo(() => {
    if (!selectedAssignee || !tickets[selectedSlice?.slice_id || '']) {
      return tickets
    }
    const sliceId = selectedSlice?.slice_id || ''
    const sliceTickets = tickets[sliceId] || []
    return {
      [sliceId]: sliceTickets.filter(ticket =>
        ticket.assignee === selectedAssignee
      )
    }
  }, [tickets, selectedAssignee, selectedSlice])

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <Sidebar
        epics={filteredEpics}
        slices={filteredSlices}
        selectedEpic={selectedEpic}
        selectedSlice={selectedSlice}
        onEpicSelect={setSelectedEpic}
        onSliceSelect={setSelectedSlice}
        onEpicCreated={handleEpicCreated}
      />

      {/* Main workspace area - uses flex instead of absolute positioning */}
      <div className="flex-1 flex flex-col mt-12 min-w-0">
        {/* Top bar with filters */}
        <div className="h-10 bg-background border-b flex items-center justify-between px-4 flex-shrink-0">
          <div className="text-xs text-muted-foreground">
            {filteredEpics.length} epics {selectedAssignee && `for ${selectedAssignee}`}
          </div>
          <AssigneeFilter
            availableAssignees={availableAssignees}
            selectedAssignee={selectedAssignee}
            onAssigneeChange={setSelectedAssignee}
          />
        </div>

        {/* Content area with proper overflow handling */}
        <div className="flex-1 overflow-auto">
        {/* State A: No epic selected */}
        {!selectedEpic && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-3 max-w-md">
              <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                <span className="text-2xl text-muted-foreground">📋</span>
              </div>
              <h2 className="text-xl font-semibold text-muted-foreground">No Epic Selected</h2>
              <p className="text-sm text-muted-foreground">
                Select an epic from the sidebar to view its slices and tickets
              </p>
              {isLoadingEpics && (
                <div className="text-xs text-muted-foreground font-mono mt-4">Loading epics...</div>
              )}
            </div>
          </div>
        )}

        {/* State B: Epic selected but no slice */}
        {selectedEpic && !selectedSlice && (
          <div className="h-full p-8">
            {/* Epic header */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                <span className="text-xs font-mono text-muted-foreground">EPIC</span>
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">{selectedEpic.title}</h1>
              {selectedEpic.assignees && selectedEpic.assignees.length > 0 && (
                <div className="flex gap-2 mb-2">
                  {selectedEpic.assignees.map((assignee) => (
                    <span key={assignee} className="text-xs px-2 py-1 bg-blue-500/10 text-blue-500 rounded">
                      {assignee}
                    </span>
                  ))}
                </div>
              )}
              {selectedEpic.notes && (
                <p className="text-sm text-muted-foreground">{selectedEpic.notes}</p>
              )}
            </div>

            {/* Slice grid */}
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-4">
                {isLoadingSlices ? 'Loading slices...' : 'Select a slice to view tickets'}
              </h2>
              {slices.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {slices.map((slice) => (
                    <button
                      key={slice.slice_id}
                      onClick={() => setSelectedSlice(slice)}
                      className="p-4 bg-card/50 border border-border/50 rounded-lg hover:bg-card hover:border-border transition-colors text-left"
                    >
                      <div className="font-medium text-card-foreground mb-1">{slice.title}</div>
                      {slice.assignees && slice.assignees.length > 0 && (
                        <div className="flex gap-1 mb-1">
                          {slice.assignees.map((assignee) => (
                            <span key={assignee} className="text-xs px-1.5 py-0.5 bg-blue-500/10 text-blue-500 rounded">
                              {assignee}
                            </span>
                          ))}
                        </div>
                      )}
                      {slice.notes && (
                        <div className="text-xs text-muted-foreground line-clamp-2">{slice.notes}</div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                !isLoadingSlices && (
                  <div className="text-sm text-muted-foreground">
                    No slices available in this epic
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* State C: Slice selected (working state) */}
        {selectedEpic && selectedSlice && (
          <div className="h-full flex flex-col">
            {/* Context bar */}
            <div className="h-10 bg-muted/50 border-b border-border/30 flex items-center px-4">
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-primary/60" />
                  <span className="text-muted-foreground font-mono">EPIC</span>
                  <span className="text-foreground">{selectedEpic.title}</span>
                </div>
                <span className="text-muted-foreground">→</span>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-accent-foreground/60" />
                  <span className="text-muted-foreground font-mono">SLICE</span>
                  <span className="text-foreground">{selectedSlice.title}</span>
                </div>
                <div className="ml-auto text-muted-foreground">
                  {isLoadingTickets ? 'Loading tickets...' :
                   `${tickets[selectedSlice.slice_id]?.length || 0} tickets`}
                </div>
              </div>
            </div>

            {/* Ticket board */}
            <div className="flex-1 p-6">
              {isLoadingTickets ? (
                <div className="text-center text-muted-foreground text-sm">Loading tickets...</div>
              ) : (
                <TicketBoard
                  tickets={filteredTickets[selectedSlice.slice_id] || []}
                  focusedTicket={focusedTicket}
                  onTicketClick={handleTicketClick}
                />
              )}
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Ticket Drawer */}
      <TicketDrawer
        ticket={selectedTicket}
        isOpen={!!selectedTicket}
        onClose={handleCloseDrawer}
      />
    </div>
  )
}