"use client"

import React, { useEffect, useState, useMemo, useCallback, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Menu } from 'lucide-react'
import { Sidebar } from '@/components/sidebar'
import { TicketBoard } from '@/components/ticket-board'
import { TicketDetail } from '@/components/ticket-detail'
import { AssigneeFilter } from '@/components/assignee-filter'
import { Button } from '@/components/ui/button'
import { getEpics, getSlices, getTickets } from '@/lib/api/tickets'
import { Epic, Slice, Ticket } from '@/lib/types'
import { useOrganization } from '@/contexts/organization-context'
import { useAgentState } from '@/contexts/agent-state-context'
import { useIsMobile } from '@/lib/hooks'

// Helper to parse comma-separated URL params into a Set
function parseSetParam(param: string | null): Set<string> {
  if (!param) return new Set()
  return new Set(param.split(',').filter(Boolean))
}

// Helper to serialize a Set to comma-separated string
function serializeSet(set: Set<string>): string {
  return Array.from(set).join(',')
}

// Wrapper component to handle Suspense for useSearchParams
export default function WorkspacePage() {
  return (
    <Suspense fallback={<WorkspaceLoading />}>
      <WorkspaceContent />
    </Suspense>
  )
}

function WorkspaceLoading() {
  return (
    <div className="h-screen bg-background flex items-center justify-center">
      <div className="text-muted-foreground text-sm">Loading workspace...</div>
    </div>
  )
}

function WorkspaceContent() {
  const { selectedOrg } = useOrganization()
  const { refreshRunningAgents } = useAgentState()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isInitialized = useRef(false)
  const isMobile = useIsMobile()

  // Data state
  const [epics, setEpics] = useState<Epic[]>([])
  const [slicesByEpic, setSlicesByEpic] = useState<Record<string, Slice[]>>({})
  const [ticketsBySlice, setTicketsBySlice] = useState<Record<string, Ticket[]>>({})

  // Multi-selection state using Sets - initialize from URL
  const [selectedEpicIds, setSelectedEpicIds] = useState<Set<string>>(() =>
    parseSetParam(searchParams.get('epics'))
  )
  const [selectedSliceIds, setSelectedSliceIds] = useState<Set<string>>(() =>
    parseSetParam(searchParams.get('slices'))
  )

  // UI state - initialize from URL
  const [focusedTicket, setFocusedTicket] = useState<string | null>(
    searchParams.get('ticket')
  )
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(
    searchParams.get('assignee')
  )

  // Mobile sidebar state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  // Loading state
  const [isLoadingEpics, setIsLoadingEpics] = useState(false)
  const [isLoadingSlices, setIsLoadingSlices] = useState(false)
  const [isLoadingTickets, setIsLoadingTickets] = useState(false)

  // Sync state to URL (debounced to avoid excessive updates)
  useEffect(() => {
    // Skip initial render to avoid overwriting URL params before data loads
    if (!isInitialized.current) return

    const params = new URLSearchParams()

    if (selectedEpicIds.size > 0) {
      params.set('epics', serializeSet(selectedEpicIds))
    }
    if (selectedSliceIds.size > 0) {
      params.set('slices', serializeSet(selectedSliceIds))
    }
    if (focusedTicket) {
      params.set('ticket', focusedTicket)
    }
    if (selectedAssignee) {
      params.set('assignee', selectedAssignee)
    }

    const newUrl = params.toString() ? `?${params.toString()}` : '/workspace'
    router.replace(newUrl, { scroll: false })
  }, [selectedEpicIds, selectedSliceIds, focusedTicket, selectedAssignee, router])

  // Load epics when organization changes
  useEffect(() => {
    async function loadEpics() {
      if (!selectedOrg) return

      // Only reset selections if this isn't the initial load with URL params
      if (isInitialized.current) {
        setSelectedEpicIds(new Set())
        setSelectedSliceIds(new Set())
        setSlicesByEpic({})
        setTicketsBySlice({})
        setFocusedTicket(null)
        setSelectedTicket(null)
      }

      try {
        setIsLoadingEpics(true)
        const epicsList = await getEpics()
        setEpics(epicsList)
        // Mark as initialized after first load
        isInitialized.current = true
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

  // Check for running agents when tickets are loaded
  // This ensures the RGB border shows on page reload
  useEffect(() => {
    const allTickets = Object.values(ticketsBySlice).flat()
    if (allTickets.length === 0) return

    // Check all loaded tickets for running agents
    refreshRunningAgents(
      allTickets.map(t => ({
        epicId: t.epic_id,
        sliceId: t.slice_id,
        ticketId: t.ticket_id,
      }))
    )
  }, [ticketsBySlice, refreshRunningAgents])

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
        isMobileSidebarOpen={isMobileSidebarOpen}
        onMobileSidebarClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main workspace area */}
      <div className="flex-1 flex flex-col mt-12 min-w-0">
        {/* Top bar with filters */}
        <div className="h-10 bg-background border-b flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            {/* Mobile hamburger menu */}
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 md:hidden"
                onClick={() => setIsMobileSidebarOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </Button>
            )}
            <div className="text-xs text-muted-foreground">
              {selectedEpicIds.size} epic{selectedEpicIds.size !== 1 ? 's' : ''} · {selectedSliceIds.size} slice{selectedSliceIds.size !== 1 ? 's' : ''} · {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''}
              {selectedAssignee && ` for ${selectedAssignee}`}
            </div>
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
                  {isMobile
                    ? "Tap the menu icon to select epics and slices"
                    : "Select one or more epics from the sidebar to view their slices and tickets"
                  }
                </p>
                {isLoadingEpics && (
                  <div className="text-xs text-muted-foreground font-mono mt-4">Loading epics...</div>
                )}
              </div>
            </div>
          )}

          {/* State B/C: Epic(s) selected - unified layout with persistent ticket board */}
          {selectedEpicIds.size > 0 && (
            <div className="h-full flex flex-col">
              {/* Context bar - always present when epics selected */}
              <div className="h-10 bg-muted/50 border-b border-border/30 flex items-center px-4 flex-shrink-0">
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
                    {isLoadingSlices ? 'Loading slices...' : isLoadingTickets ? 'Loading tickets...' : `${filteredTickets.length} tickets`}
                  </div>
                </div>
              </div>

              {/* Ticket board - always rendered, shows empty state when no slices selected */}
              <div className="flex-1 p-2 md:p-6 min-h-0">
                <TicketBoard
                  tickets={filteredTickets}
                  focusedTicket={focusedTicket}
                  onTicketClick={handleTicketClick}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ticket Detail (Drawer on desktop, Full-screen on mobile) */}
      <TicketDetail
        ticket={selectedTicket}
        isOpen={!!selectedTicket}
        onClose={handleCloseDrawer}
      />
    </div>
  )
}
