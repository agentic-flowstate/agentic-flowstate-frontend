"use client"

import React, { useEffect, useState, useMemo, useCallback } from 'react'
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
  const [slicesByEpic, setSlicesByEpic] = useState<Record<string, Slice[]>>({})
  const [ticketsBySlice, setTicketsBySlice] = useState<Record<string, Ticket[]>>({})

  // Multi-selection state using Sets
  const [selectedEpicIds, setSelectedEpicIds] = useState<Set<string>>(new Set())
  const [selectedSliceIds, setSelectedSliceIds] = useState<Set<string>>(new Set())

  // UI state
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
      setSelectedEpicIds(new Set())
      setSelectedSliceIds(new Set())
      setSlicesByEpic({})
      setTicketsBySlice({})
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

  // Load slices when selected epics change
  useEffect(() => {
    async function loadSlicesForEpics() {
      if (selectedEpicIds.size === 0) {
        setSlicesByEpic({})
        setSelectedSliceIds(new Set())
        return
      }

      setIsLoadingSlices(true)

      try {
        // Load slices for each selected epic - always fetch fresh
        const results = await Promise.all(
          Array.from(selectedEpicIds).map(async (epicId) => {
            try {
              const slices = await getSlices(epicId)
              return { epicId, slices }
            } catch (error) {
              console.error(`Failed to load slices for epic ${epicId}:`, error)
              return { epicId, slices: [] as Slice[] }
            }
          })
        )

        // Build fresh state from results
        const newSlicesByEpic: Record<string, Slice[]> = {}
        results.forEach(({ epicId, slices }) => {
          newSlicesByEpic[epicId] = slices
        })

        setSlicesByEpic(newSlicesByEpic)

        // Remove slice selections for epics that are no longer selected
        setSelectedSliceIds(prev => {
          const allSliceIds = new Set(
            Object.values(newSlicesByEpic).flat().map(s => s.slice_id)
          )
          const filtered = new Set<string>()
          prev.forEach(id => {
            if (allSliceIds.has(id)) filtered.add(id)
          })
          return filtered
        })
      } finally {
        setIsLoadingSlices(false)
      }
    }

    loadSlicesForEpics()
  }, [selectedEpicIds])

  // Load tickets when selected slices change
  useEffect(() => {
    async function loadTicketsForSlices() {
      if (selectedSliceIds.size === 0) {
        setTicketsBySlice({})
        return
      }

      setIsLoadingTickets(true)
      const newTicketsBySlice: Record<string, Ticket[]> = {}

      // Get epic ID for each slice
      const allSlices = Object.values(slicesByEpic).flat()

      try {
        await Promise.all(
          Array.from(selectedSliceIds).map(async (sliceId) => {
            // Skip if already loaded
            if (ticketsBySlice[sliceId]) {
              newTicketsBySlice[sliceId] = ticketsBySlice[sliceId]
              return
            }

            const slice = allSlices.find(s => s.slice_id === sliceId)
            if (!slice) return

            try {
              const tickets = await getTickets(slice.epic_id, sliceId)
              newTicketsBySlice[sliceId] = tickets
            } catch (error) {
              console.error(`Failed to load tickets for slice ${sliceId}:`, error)
              newTicketsBySlice[sliceId] = []
            }
          })
        )

        setTicketsBySlice(newTicketsBySlice)
      } finally {
        setIsLoadingTickets(false)
      }
    }

    loadTicketsForSlices()
  }, [selectedSliceIds, slicesByEpic])

  // Toggle epic selection
  const handleEpicToggle = useCallback((epicId: string) => {
    setSelectedEpicIds(prev => {
      const next = new Set(prev)
      if (next.has(epicId)) {
        next.delete(epicId)
      } else {
        next.add(epicId)
      }
      return next
    })
  }, [])

  // Toggle slice selection
  const handleSliceToggle = useCallback((sliceId: string) => {
    setSelectedSliceIds(prev => {
      const next = new Set(prev)
      if (next.has(sliceId)) {
        next.delete(sliceId)
      } else {
        next.add(sliceId)
      }
      return next
    })
  }, [])

  const handleTicketClick = (ticket: Ticket) => {
    setFocusedTicket(ticket.ticket_id === focusedTicket ? null : ticket.ticket_id)
    setSelectedTicket(ticket)
  }

  const handleCloseDrawer = () => {
    setSelectedTicket(null)
    setFocusedTicket(null)
  }

  const handleEpicCreated = (newEpic: Epic) => {
    setEpics(prev => [...prev, newEpic])
    // Optionally auto-select the new epic
    setSelectedEpicIds(prev => new Set(prev).add(newEpic.epic_id))
  }

  // Flatten all slices for sidebar
  const allSlices = useMemo(() => {
    return Object.values(slicesByEpic).flat()
  }, [slicesByEpic])

  // Get all tickets for display (from selected slices)
  const displayTickets = useMemo(() => {
    return Object.entries(ticketsBySlice)
      .filter(([sliceId]) => selectedSliceIds.has(sliceId))
      .flatMap(([, tickets]) => tickets)
  }, [ticketsBySlice, selectedSliceIds])

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

  // Filter displayed tickets by selected assignee
  const filteredTickets = useMemo(() => {
    if (!selectedAssignee) return displayTickets
    return displayTickets.filter(ticket =>
      ticket.assignee === selectedAssignee
    )
  }, [displayTickets, selectedAssignee])

  // Get selected epics data for display
  const selectedEpics = useMemo(() => {
    return epics.filter(e => selectedEpicIds.has(e.epic_id))
  }, [epics, selectedEpicIds])

  // Get selected slices data for display
  const selectedSlices = useMemo(() => {
    return allSlices.filter(s => selectedSliceIds.has(s.slice_id))
  }, [allSlices, selectedSliceIds])

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <Sidebar
        epics={filteredEpics}
        slices={allSlices}
        selectedEpicIds={selectedEpicIds}
        selectedSliceIds={selectedSliceIds}
        onEpicToggle={handleEpicToggle}
        onSliceToggle={handleSliceToggle}
        onEpicCreated={handleEpicCreated}
      />

      {/* Main workspace area */}
      <div className="flex-1 flex flex-col mt-12 min-w-0">
        {/* Top bar with filters */}
        <div className="h-10 bg-background border-b flex items-center justify-between px-4 flex-shrink-0">
          <div className="text-xs text-muted-foreground">
            {selectedEpicIds.size} epic{selectedEpicIds.size !== 1 ? 's' : ''} · {selectedSliceIds.size} slice{selectedSliceIds.size !== 1 ? 's' : ''} · {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''}
            {selectedAssignee && ` for ${selectedAssignee}`}
          </div>
          <AssigneeFilter
            availableAssignees={availableAssignees}
            selectedAssignee={selectedAssignee}
            onAssigneeChange={setSelectedAssignee}
          />
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-auto">
          {/* State A: No epic selected */}
          {selectedEpicIds.size === 0 && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-3 max-w-md">
                <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                  <span className="text-2xl text-muted-foreground">📋</span>
                </div>
                <h2 className="text-xl font-semibold text-muted-foreground">No Epics Selected</h2>
                <p className="text-sm text-muted-foreground">
                  Select one or more epics from the sidebar to view their slices and tickets
                </p>
                {isLoadingEpics && (
                  <div className="text-xs text-muted-foreground font-mono mt-4">Loading epics...</div>
                )}
              </div>
            </div>
          )}

          {/* State B: Epic(s) selected but no slice selected */}
          {selectedEpicIds.size > 0 && selectedSliceIds.size === 0 && (
            <div className="h-full p-8">
              {/* Selected epics summary */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                  <span className="text-xs font-mono text-muted-foreground">
                    {selectedEpics.length} EPIC{selectedEpics.length !== 1 ? 'S' : ''} SELECTED
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedEpics.map(epic => (
                    <span key={epic.epic_id} className="text-sm px-2 py-1 bg-primary/10 text-primary rounded">
                      {epic.title}
                    </span>
                  ))}
                </div>
              </div>

              {/* Slice grid */}
              <div>
                <h2 className="text-sm font-medium text-muted-foreground mb-4">
                  {isLoadingSlices ? 'Loading slices...' : `Select slices to view tickets (${allSlices.length} available)`}
                </h2>
                {allSlices.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {allSlices.map((slice) => (
                      <button
                        key={slice.slice_id}
                        onClick={() => handleSliceToggle(slice.slice_id)}
                        className="p-4 bg-card/50 border border-border/50 rounded-lg hover:bg-card hover:border-border transition-colors text-left"
                      >
                        <div className="font-medium text-card-foreground mb-1">{slice.title}</div>
                        <div className="text-[10px] text-muted-foreground mb-1">{slice.epic_id}</div>
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
                      No slices available in selected epics
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* State C: Slices selected (working state) */}
          {selectedSliceIds.size > 0 && (
            <div className="h-full flex flex-col">
              {/* Context bar */}
              <div className="h-10 bg-muted/50 border-b border-border/30 flex items-center px-4">
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-primary/60" />
                    <span className="text-muted-foreground font-mono">
                      {selectedEpics.length} EPIC{selectedEpics.length !== 1 ? 'S' : ''}
                    </span>
                  </div>
                  <span className="text-muted-foreground">→</span>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-green-500/60" />
                    <span className="text-muted-foreground font-mono">
                      {selectedSlices.length} SLICE{selectedSlices.length !== 1 ? 'S' : ''}
                    </span>
                  </div>
                  <div className="ml-auto text-muted-foreground">
                    {isLoadingTickets ? 'Loading tickets...' : `${filteredTickets.length} tickets`}
                  </div>
                </div>
              </div>

              {/* Ticket board */}
              <div className="flex-1 p-6">
                {isLoadingTickets ? (
                  <div className="text-center text-muted-foreground text-sm">Loading tickets...</div>
                ) : (
                  <TicketBoard
                    tickets={filteredTickets}
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
