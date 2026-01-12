"use client"

import React, { useEffect, useState, useMemo, useCallback, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Menu, GitBranch } from 'lucide-react'
import { Sidebar } from '@/components/sidebar'
import { TicketDetail } from '@/components/ticket-detail'
import { AssigneeFilter } from '@/components/assignee-filter'
import { SliceGraphWithApproval } from '@/components/slice-graph'
import { Button } from '@/components/ui/button'
import { getEpics, getSlices, getTickets, getTicketById } from '@/lib/api/tickets'
import { getTicketPipelines } from '@/lib/api/pipelines'
import { Epic, Slice, Ticket, GraphTicket } from '@/lib/types'
import { useOrganization } from '@/contexts/organization-context'
import { useAgentState } from '@/contexts/agent-state-context'

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
  const [activeAgentRun, setActiveAgentRun] = useState<string | null>(
    searchParams.get('run')
  )

  // Pipeline data for graph view
  const [graphTickets, setGraphTickets] = useState<GraphTicket[]>([])

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
    if (activeAgentRun) {
      params.set('run', activeAgentRun)
    }

    const newUrl = params.toString() ? `?${params.toString()}` : '/workspace'
    router.replace(newUrl, { scroll: false })
  }, [selectedEpicIds, selectedSliceIds, focusedTicket, selectedAssignee, activeAgentRun, router])

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

  // Load pipelines when tickets change
  useEffect(() => {
    async function loadPipelines() {
      const allTickets = Object.values(ticketsBySlice).flat()
      if (allTickets.length === 0) {
        setGraphTickets([])
        return
      }

      try {
        const ticketIds = allTickets.map(t => t.ticket_id)
        const pipelines = await getTicketPipelines(ticketIds)

        // Merge pipelines into tickets
        const ticketsWithPipelines: GraphTicket[] = allTickets.map(ticket => ({
          ...ticket,
          pipeline: pipelines[ticket.ticket_id] || undefined,
        }))

        setGraphTickets(ticketsWithPipelines)
      } catch (error) {
        console.error('Failed to load pipelines:', error)
        // Still show tickets without pipelines
        setGraphTickets(allTickets as GraphTicket[])
      }
    }

    loadPipelines()
  }, [ticketsBySlice])

  // Track which tickets we've already checked for running agents
  const checkedTicketsRef = useRef<Set<string>>(new Set())

  // Check for running agents when tickets are loaded
  // This ensures the RGB border shows on page reload
  useEffect(() => {
    const allTickets = Object.values(ticketsBySlice).flat()
    if (allTickets.length === 0) return

    // Only check tickets we haven't checked yet
    const ticketsToCheck = allTickets.filter(t => !checkedTicketsRef.current.has(t.ticket_id))
    if (ticketsToCheck.length === 0) return

    // Mark these tickets as checked
    ticketsToCheck.forEach(t => checkedTicketsRef.current.add(t.ticket_id))

    // Check for running agents
    refreshRunningAgents(
      ticketsToCheck.map(t => ({
        epicId: t.epic_id,
        sliceId: t.slice_id,
        ticketId: t.ticket_id,
      }))
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketsBySlice])

  // Restore ticket from URL - fetch by ID if epic/slice not selected
  useEffect(() => {
    async function restoreTicketFromUrl() {
      if (!focusedTicket) return

      // If we already have the ticket loaded, just select it
      const allTickets = Object.values(ticketsBySlice).flat()
      const existingTicket = allTickets.find(t => t.ticket_id === focusedTicket)
      if (existingTicket) {
        if (!selectedTicket || selectedTicket.ticket_id !== existingTicket.ticket_id) {
          setSelectedTicket(existingTicket)
        }
        return
      }

      // If epics haven't loaded yet, wait
      if (epics.length === 0) return

      // If no epic/slice selected but we have a ticket ID, fetch the ticket to get its epic/slice
      if (selectedEpicIds.size === 0 && selectedSliceIds.size === 0) {
        try {
          const ticket = await getTicketById(focusedTicket)
          if (ticket) {
            // Auto-select the epic and slice
            setSelectedEpicIds(new Set([ticket.epic_id]))
            setSelectedSliceIds(new Set([ticket.slice_id]))
            setSelectedTicket(ticket)
          } else {
            // Ticket not found, clear from URL
            setFocusedTicket(null)
          }
        } catch (error) {
          console.error('Failed to restore ticket from URL:', error)
          setFocusedTicket(null)
        }
      }
    }

    restoreTicketFromUrl()
  }, [focusedTicket, ticketsBySlice, selectedTicket, epics, selectedEpicIds, selectedSliceIds])

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
    setActiveAgentRun(null)
  }

  // Handle cross-slice dependency click - navigate to that slice
  const handleCrossSliceClick = useCallback((ticketId: string, sliceId: string) => {
    // Add the slice to selection if not already selected
    setSelectedSliceIds(prev => {
      const next = new Set(prev)
      next.add(sliceId)
      return next
    })
    // Focus on the ticket
    setFocusedTicket(ticketId)
  }, [])

  // Refresh pipelines after approval
  const handlePipelineRefresh = useCallback(() => {
    // Trigger re-fetch by toggling a dummy state or just re-running the effect
    // We'll force a refetch by clearing and setting graph tickets
    setGraphTickets([])
    const allTickets = Object.values(ticketsBySlice).flat()
    if (allTickets.length > 0) {
      getTicketPipelines(allTickets.map(t => t.ticket_id)).then(pipelines => {
        const ticketsWithPipelines: GraphTicket[] = allTickets.map(ticket => ({
          ...ticket,
          pipeline: pipelines[ticket.ticket_id] || undefined,
        }))
        setGraphTickets(ticketsWithPipelines)
      })
    }
  }, [ticketsBySlice])

  // Handle graph ticket click - open ticket detail
  const handleGraphTicketClick = useCallback((ticket: GraphTicket) => {
    setFocusedTicket(ticket.ticket_id)
    setSelectedTicket(ticket)
  }, [])

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
            {/* Mobile hamburger menu - use CSS breakpoint for reliable hiding */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 md:hidden"
              onClick={() => setIsMobileSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div className="text-xs text-muted-foreground">
              {selectedEpicIds.size} epic{selectedEpicIds.size !== 1 ? 's' : ''} · {selectedSliceIds.size} slice{selectedSliceIds.size !== 1 ? 's' : ''} · {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''}
              {selectedAssignee && ` for ${selectedAssignee}`}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AssigneeFilter
              availableAssignees={availableAssignees}
              selectedAssignee={selectedAssignee}
              onAssigneeChange={setSelectedAssignee}
            />
          </div>
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
                  <span className="md:hidden">Tap the menu icon to select epics and slices</span>
                  <span className="hidden md:inline">Select one or more epics from the sidebar to view their slices and tickets</span>
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

              {/* Graph view - show per-slice graphs */}
              <div className="flex-1 min-h-0">
                <div className="h-full">
                  {selectedSlices.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center text-muted-foreground">
                          <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="text-sm">Select a slice to view its ticket graph</p>
                        </div>
                      </div>
                    ) : selectedSlices.length === 1 ? (
                      /* Single slice - full graph */
                      <SliceGraphWithApproval
                        slice={selectedSlices[0]}
                        tickets={graphTickets}
                        allTickets={graphTickets}
                        onTicketClick={handleGraphTicketClick}
                        onCrossSliceClick={handleCrossSliceClick}
                        onRefresh={handlePipelineRefresh}
                      />
                    ) : (
                      /* Multiple slices - grid of graphs */
                      <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 overflow-auto">
                        {selectedSlices.map(slice => (
                          <div key={slice.slice_id} className="h-[500px] bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden">
                            <div className="h-8 px-3 flex items-center bg-zinc-900 border-b border-zinc-800">
                              <span className="text-xs font-medium text-zinc-300 truncate">{slice.title}</span>
                            </div>
                            <div className="h-[calc(100%-32px)]">
                              <SliceGraphWithApproval
                                slice={slice}
                                tickets={graphTickets.filter(t => t.slice_id === slice.slice_id)}
                                allTickets={graphTickets}
                                onTicketClick={handleGraphTicketClick}
                                onCrossSliceClick={handleCrossSliceClick}
                                onRefresh={handlePipelineRefresh}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
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
        activeAgentRun={activeAgentRun}
        onAgentRunChange={setActiveAgentRun}
      />
    </div>
  )
}
