"use client"

import React, { useEffect, useState, useMemo, useCallback, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Menu, GitBranch, Network, Search, X } from 'lucide-react'
import { Sidebar } from '@/components/sidebar'
import { TicketDetail } from '@/components/ticket-detail'
import { AssigneeFilter } from '@/components/assignee-filter'
import { SliceGraphWithApproval, OrgGraph } from '@/components/slice-graph'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getEpics, getSlices, getTickets, getTicketById, getAllOrgTickets } from '@/lib/api/tickets'
import { getTicketPipelines } from '@/lib/api/pipelines'
import { Epic, Slice, Ticket, GraphTicket, TicketPipeline } from '@/lib/types'
import { useOrganization } from '@/contexts/organization-context'
import { useAgentState } from '@/contexts/agent-state-context'
import { useLiveData } from '@/hooks/useLiveData'

type ViewMode = 'slice' | 'org'

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
    <div className="h-full bg-background flex items-center justify-center overflow-hidden">
      <div className="text-muted-foreground text-sm">Loading workspace...</div>
    </div>
  )
}

function WorkspaceContent() {
  const { selectedOrg } = useOrganization()
  const { refreshRunningAgents, runningAgents, clearIfPipelineCompleted } = useAgentState()
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

  // Pipeline data fetched async, stored separately to avoid stale-closure races
  const [fetchedPipelines, setFetchedPipelines] = useState<Record<string, TicketPipeline>>({})
  const pipelineRunRef = useRef(0)

  // View mode: 'org' (default) or 'slice' (selected epics/slices)
  // Persist in URL to survive page reload
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const urlView = searchParams.get('view')
    if (urlView === 'slice' || urlView === 'org') return urlView
    // Fallback: if no view param but has epic/slice selections, use slice view
    const hasEpics = searchParams.get('epics')
    const hasSlices = searchParams.get('slices')
    return (hasEpics || hasSlices) ? 'slice' : 'org'
  })
  const [orgTickets, setOrgTickets] = useState<GraphTicket[]>([])
  const [isLoadingOrgTickets, setIsLoadingOrgTickets] = useState(false)

  // Mobile sidebar state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  // Loading state
  const [isLoadingEpics, setIsLoadingEpics] = useState(false)
  const [isLoadingSlices, setIsLoadingSlices] = useState(false)
  const [isLoadingTickets, setIsLoadingTickets] = useState(false)

  // Track when ticket was just clicked (to prevent effect from overwriting)
  const justClickedRef = useRef<boolean>(false)

  // Ticket search state
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [searchError, setSearchError] = useState<string | null>(null)
  const [centerOnTicketId, setCenterOnTicketId] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Live data updates via SSE
  const handleLiveEpicsUpdate = useCallback((newEpics: Epic[]) => {
    setEpics(newEpics)
  }, [])

  const handleLiveSlicesUpdate = useCallback((newSlices: Slice[]) => {
    // Group slices by epic_id
    const grouped: Record<string, Slice[]> = {}
    for (const slice of newSlices) {
      if (!grouped[slice.epic_id]) {
        grouped[slice.epic_id] = []
      }
      grouped[slice.epic_id].push(slice)
    }
    setSlicesByEpic(prev => {
      // Avoid new reference if data hasn't changed
      const prevAll = Object.values(prev).flat()
      if (prevAll.length === newSlices.length) {
        const prevIds = prevAll.map(s => s.slice_id).sort().join(',')
        const newIds = newSlices.map(s => s.slice_id).sort().join(',')
        const prevMaxTs = prevAll.reduce((max, s) => {
          const t = s.updated_at_iso ? new Date(s.updated_at_iso).getTime() : 0
          return Math.max(max, t)
        }, 0)
        const newMaxTs = newSlices.reduce((max, s) => {
          const t = s.updated_at_iso ? new Date(s.updated_at_iso).getTime() : 0
          return Math.max(max, t)
        }, 0)
        if (prevIds === newIds && prevMaxTs === newMaxTs) return prev
      }
      return grouped
    })
  }, [])

  const handleLiveTicketsUpdate = useCallback((newTickets: Ticket[]) => {
    // Group tickets by slice_id for slice view
    const grouped: Record<string, Ticket[]> = {}
    for (const ticket of newTickets) {
      if (!grouped[ticket.slice_id]) {
        grouped[ticket.slice_id] = []
      }
      grouped[ticket.slice_id].push(ticket)
    }
    // Merge SSE data into existing state instead of replacing,
    // so we don't wipe out slices that the fetch effect already loaded.
    setTicketsBySlice(prev => {
      // Build merged state
      const updated = { ...prev }
      for (const [sliceId, tickets] of Object.entries(grouped)) {
        updated[sliceId] = tickets
      }
      // Avoid new reference if data hasn't actually changed
      const prevAll = Object.values(prev).flat()
      const newAll = Object.values(updated).flat()
      if (prevAll.length === newAll.length) {
        const prevMax = prevAll.reduce((max, t) => Math.max(max, t.updated_at), 0)
        const newMax = newAll.reduce((max, t) => Math.max(max, t.updated_at), 0)
        if (prevMax === newMax) return prev
      }
      return updated
    })

    // Also update orgTickets - merge new status into existing tickets while preserving pipelines
    setOrgTickets(prev => {
      if (prev.length === 0) return prev
      const ticketMap = new Map(newTickets.map(t => [t.ticket_id, t]))
      let changed = false
      const result = prev.map(existing => {
        const updated = ticketMap.get(existing.ticket_id)
        if (updated && updated.updated_at !== existing.updated_at) {
          changed = true
          // Merge: keep existing pipeline data, update status and other fields
          return { ...existing, ...updated, pipeline: existing.pipeline }
        }
        return existing
      })
      return changed ? result : prev
    })
  }, [])

  useLiveData({
    organization: selectedOrg?.id ?? null,
    onEpicsUpdate: handleLiveEpicsUpdate,
    onSlicesUpdate: handleLiveSlicesUpdate,
    onTicketsUpdate: handleLiveTicketsUpdate,
    enabled: !!selectedOrg,
  })

  // Sync state to URL (debounced to avoid excessive updates)
  useEffect(() => {
    // Skip initial render to avoid overwriting URL params before data loads
    if (!isInitialized.current) return

    const params = new URLSearchParams()

    // Always persist viewMode so it survives page reload
    params.set('view', viewMode)

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
  }, [selectedEpicIds, selectedSliceIds, focusedTicket, selectedAssignee, activeAgentRun, viewMode, router])

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

        // Merge fetched slices into existing state (preserves SSE data for other epics)
        const newSlicesByEpic: Record<string, Slice[]> = {}
        results.forEach(({ epicId, slices }) => {
          newSlicesByEpic[epicId] = slices
        })

        setSlicesByEpic(prev => ({ ...prev, ...newSlicesByEpic }))

        // Remove slice selections for epics that are no longer selected
        setSelectedSliceIds(prev => {
          const allSliceIds = new Set(
            Object.values(newSlicesByEpic).flat().map(s => s.slice_id)
          )
          const filtered = new Set<string>()
          prev.forEach(id => {
            if (allSliceIds.has(id)) filtered.add(id)
          })
          // Avoid creating a new reference if content is unchanged —
          // a new Set reference triggers loadTicketsForSlices to re-run
          if (filtered.size === prev.size) {
            let same = true
            for (const id of filtered) {
              if (!prev.has(id)) { same = false; break }
            }
            if (same) return prev
          }
          return filtered
        })
      } finally {
        setIsLoadingSlices(false)
      }
    }

    loadSlicesForEpics()
  }, [selectedEpicIds])

  // Clear ticket selection when its slice is deselected (only in slice view)
  useEffect(() => {
    // Don't clear in org view - tickets can be from any slice
    if (viewMode === 'org') return

    if (selectedTicket && !selectedSliceIds.has(selectedTicket.slice_id)) {
      setSelectedTicket(null)
      setFocusedTicket(null)
      setActiveAgentRun(null)
    }
  }, [selectedSliceIds, selectedTicket, viewMode])

  // Load tickets when selected slices change OR when slicesByEpic becomes available.
  // No ref or retry needed — React re-runs this effect when slicesByEpic updates.
  // SSE change detection ensures slicesByEpic only triggers when data actually changes.
  useEffect(() => {
    let cancelled = false

    async function loadTicketsForSlices() {
      if (selectedSliceIds.size === 0) {
        setTicketsBySlice({})
        return
      }

      const allSlices = Object.values(slicesByEpic).flat()
      const sliceIds = Array.from(selectedSliceIds)

      // Check if we can resolve epic_id for all selected slices
      const resolvable = sliceIds.filter(id => allSlices.some(s => s.slice_id === id))

      if (resolvable.length === 0) {
        // slicesByEpic not loaded yet — effect will re-run when it loads
        return
      }

      setIsLoadingTickets(true)

      try {
        const results = await Promise.all(
          resolvable.map(async (sliceId) => {
            const slice = allSlices.find(s => s.slice_id === sliceId)!
            try {
              const tickets = await getTickets(slice.epic_id, sliceId)
              // API may return minimal ticket objects without slice_id/epic_id.
              // Augment with the IDs we already know since we fetched from this specific slice.
              const augmented = tickets.map(t => ({
                ...t,
                slice_id: t.slice_id || sliceId,
                epic_id: t.epic_id || slice.epic_id,
              }))
              return { sliceId, tickets: augmented }
            } catch (error) {
              console.error(`Failed to load tickets for slice ${sliceId}:`, error)
              return { sliceId, tickets: [] as Ticket[] }
            }
          })
        )

        if (cancelled) return

        setTicketsBySlice(prev => {
          const updated = { ...prev }
          results.forEach(({ sliceId, tickets }) => {
            const existing = prev[sliceId]
            if (!existing || existing.length === 0) {
              // No existing data — use API result as-is
              updated[sliceId] = tickets
            } else {
              // Merge: for each API ticket, preserve richer existing data (from SSE)
              // but add any new tickets the API returned that we didn't have
              const existingMap = new Map(existing.map(t => [t.ticket_id, t]))
              const merged = tickets.map(apiTicket => {
                const sseTicket = existingMap.get(apiTicket.ticket_id)
                if (sseTicket && sseTicket.blocked_by) {
                  // SSE ticket has relationship data — keep it, overlay any newer status
                  return { ...sseTicket, status: apiTicket.status, title: apiTicket.title }
                }
                return apiTicket
              })
              updated[sliceId] = merged
            }
          })
          return updated
        })
      } finally {
        if (!cancelled) setIsLoadingTickets(false)
      }
    }

    loadTicketsForSlices()

    return () => {
      cancelled = true
    }
  }, [selectedSliceIds, slicesByEpic])

  // Derive all tickets synchronously from ticketsBySlice.
  // This replaces the old effect-based approach which had a stale-closure race:
  // async loadPipelines could overwrite graphTickets with stale allTickets.
  const allTickets = useMemo(() => {
    return Object.values(ticketsBySlice).flat()
  }, [ticketsBySlice])

  // Fetch pipelines when tickets change (with cancellation via run counter)
  useEffect(() => {
    const runId = ++pipelineRunRef.current
    if (allTickets.length === 0) {
      setFetchedPipelines({})
      return
    }
    async function loadPipelines() {
      try {
        const ticketIds = allTickets.filter(t => t.pipeline).map(t => t.ticket_id)
        if (ticketIds.length === 0) { setFetchedPipelines({}); return }
        const pipelines = await getTicketPipelines(ticketIds)
        if (pipelineRunRef.current !== runId) return // stale run, discard
        setFetchedPipelines(pipelines)
      } catch (error) {
        console.error('Failed to load pipelines:', error)
      }
    }
    loadPipelines()
  }, [allTickets])

  // Derive graphTickets synchronously: tickets + fetched pipeline data.
  // This is always up-to-date — no async step can make it stale.
  const graphTickets: GraphTicket[] = useMemo(() => {
    return allTickets.map(ticket => ({
      ...ticket,
      pipeline: fetchedPipelines[ticket.ticket_id] || ticket.pipeline || undefined,
    }))
  }, [allTickets, fetchedPipelines])

  // Track which tickets we've already checked for running agents
  const checkedTicketsRef = useRef<Set<string>>(new Set())

  // Check for running agents when tickets are loaded
  // This ensures the RGB border shows on page reload
  useEffect(() => {
    const allTickets = Object.values(ticketsBySlice).flat()
    if (allTickets.length === 0) return

    // Only check tickets that could plausibly have a running agent:
    // - status is in_progress, OR
    // - has a pipeline with a 'running' step
    const ticketsToCheck = allTickets.filter(t => {
      if (checkedTicketsRef.current.has(t.ticket_id)) return false
      if (t.status === 'in_progress') return true
      if (t.pipeline?.steps?.some(s => s.status === 'running')) return true
      return false
    })
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

  // Load all org tickets when in org view mode
  useEffect(() => {
    async function loadOrgTickets() {
      if (viewMode !== 'org' || !selectedOrg) {
        return
      }

      setIsLoadingOrgTickets(true)
      try {
        const tickets = await getAllOrgTickets()
        // Only fetch pipelines for tickets that have one
        const ticketIds = tickets.filter(t => t.pipeline).map(t => t.ticket_id)
        const pipelines = ticketIds.length > 0 ? await getTicketPipelines(ticketIds) : {}
        const ticketsWithPipelines: GraphTicket[] = tickets.map(ticket => ({
          ...ticket,
          pipeline: pipelines[ticket.ticket_id] || undefined,
        }))
        setOrgTickets(ticketsWithPipelines)
      } catch (error) {
        console.error('Failed to load org tickets:', error)
        setOrgTickets([])
      } finally {
        setIsLoadingOrgTickets(false)
      }
    }

    loadOrgTickets()
  }, [viewMode, selectedOrg])

  // Clear stale running state when org tickets with pipelines are loaded
  // This syncs the glowing border with actual pipeline status
  useEffect(() => {
    if (orgTickets.length === 0) return

    orgTickets.forEach(ticket => {
      if (ticket.pipeline?.steps) {
        clearIfPipelineCompleted(ticket.ticket_id, ticket.pipeline.steps)
      }
    })
  }, [orgTickets, clearIfPipelineCompleted])

  // Also clear stale state when slice graph tickets are loaded
  useEffect(() => {
    if (graphTickets.length === 0) return

    graphTickets.forEach(ticket => {
      if (ticket.pipeline?.steps) {
        clearIfPipelineCompleted(ticket.ticket_id, ticket.pipeline.steps)
      }
    })
  }, [graphTickets, clearIfPipelineCompleted])

  // Restore ticket from URL or ensure selected ticket has full data
  useEffect(() => {
    async function restoreTicketFromUrl() {
      if (!focusedTicket) return

      // If ticket was just clicked, don't interfere - the click handler already set the right data
      if (justClickedRef.current) {
        justClickedRef.current = false
        return
      }

      // If we already have this ticket selected with pipeline, don't overwrite
      if (selectedTicket?.ticket_id === focusedTicket && selectedTicket?.pipeline) {
        return
      }

      // Check graphTickets first (has pipeline data)
      const graphTicket = graphTickets.find(t => t.ticket_id === focusedTicket)
      if (graphTicket) {
        setSelectedTicket(graphTicket)
        return
      }

      // If epics haven't loaded yet, wait
      if (epics.length === 0) return

      try {
        const ticket = await getTicketById(focusedTicket)
        if (ticket) {
          // Auto-select the epic and slice if not already selected
          if (selectedEpicIds.size === 0) {
            setSelectedEpicIds(new Set([ticket.epic_id]))
          }
          if (selectedSliceIds.size === 0) {
            setSelectedSliceIds(new Set([ticket.slice_id]))
          }
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

    restoreTicketFromUrl()
  }, [focusedTicket, graphTickets, selectedTicket, epics, selectedEpicIds, selectedSliceIds])

  // Toggle epic selection
  const handleEpicToggle = useCallback((epicId: string) => {
    const isAdding = !selectedEpicIds.has(epicId)

    setSelectedEpicIds(prev => {
      const next = new Set(prev)
      if (next.has(epicId)) {
        next.delete(epicId)
      } else {
        next.add(epicId)
      }
      return next
    })

    // Switch to slice view when selecting an epic
    if (isAdding) {
      setViewMode('slice')
    }
  }, [selectedEpicIds])

  // Toggle slice selection
  const handleSliceToggle = useCallback((sliceId: string) => {
    const isAdding = !selectedSliceIds.has(sliceId)

    setSelectedSliceIds(prev => {
      const next = new Set(prev)
      if (next.has(sliceId)) {
        next.delete(sliceId)
      } else {
        next.add(sliceId)
      }
      return next
    })

    // Switch to slice view when selecting a slice
    if (isAdding) {
      setViewMode('slice')
    }
  }, [selectedSliceIds])

  const handleTicketClick = (ticket: Ticket) => {
    setFocusedTicket(ticket.ticket_id === focusedTicket ? null : ticket.ticket_id)
    setSelectedTicket(ticket)
  }

  const handleCloseDrawer = () => {
    setSelectedTicket(null)
    setFocusedTicket(null)
    setActiveAgentRun(null)
    setCenterOnTicketId(null)
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

  // Find ticket by ID and center on it in org view
  const handleTicketSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    setSearchError(null)
    const query = searchValue.trim().toUpperCase()
    if (!query) return

    // Normalize: accept with or without "T-" prefix
    const ticketId = query.startsWith('T-') ? query : `T-${query}`

    const found = orgTickets.find(t => t.ticket_id === ticketId)
    if (!found) {
      setSearchError('Not found')
      return
    }

    // Ensure we're in org view
    if (viewMode !== 'org') {
      setViewMode('org')
    }

    // Select and center on the ticket
    justClickedRef.current = true
    setFocusedTicket(found.ticket_id)
    setSelectedTicket(found)
    setCenterOnTicketId(found.ticket_id)

    // Close search
    setIsSearchOpen(false)
    setSearchValue('')
  }, [searchValue, orgTickets, viewMode])

  // Refresh pipelines after approval
  const handlePipelineRefresh = useCallback(() => {
    const ticketIds = allTickets.filter(t => t.pipeline).map(t => t.ticket_id)
    if (ticketIds.length > 0) {
      getTicketPipelines(ticketIds).then(pipelines => {
        setFetchedPipelines(pipelines)
      })
    }
  }, [allTickets])

  // Handle graph ticket click - open ticket detail
  const handleGraphTicketClick = useCallback((ticket: GraphTicket) => {
    justClickedRef.current = true
    setFocusedTicket(ticket.ticket_id)
    setSelectedTicket(ticket)
    setCenterOnTicketId(null)
  }, [])

  // Handle ticket update from drawer (e.g., after agent completion)
  // Updates ticket in all relevant state arrays to keep views in sync.
  // graphTickets is derived (useMemo), so updating ticketsBySlice is sufficient.
  const handleTicketUpdate = useCallback((updatedTicket: Ticket) => {
    // Update selected ticket
    setSelectedTicket(updatedTicket)

    // Update in orgTickets array
    setOrgTickets(prev => prev.map(t =>
      t.ticket_id === updatedTicket.ticket_id
        ? { ...t, ...updatedTicket, pipeline: updatedTicket.pipeline }
        : t
    ))

    // Update in ticketsBySlice — this drives graphTickets via useMemo
    setTicketsBySlice(prev => {
      const sliceId = updatedTicket.slice_id
      if (!prev[sliceId]) return prev
      return {
        ...prev,
        [sliceId]: prev[sliceId].map(t =>
          t.ticket_id === updatedTicket.ticket_id ? updatedTicket : t
        )
      }
    })

    // Update fetched pipeline data if present
    if (updatedTicket.pipeline) {
      setFetchedPipelines(prev => ({
        ...prev,
        [updatedTicket.ticket_id]: updatedTicket.pipeline!,
      }))
    }
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

  // Get set of ticket IDs that have agents processing
  const processingTicketIds = useMemo(() => {
    return new Set(runningAgents.keys())
  }, [runningAgents])

  return (
    <div className="h-full bg-background flex overflow-hidden">
      <Sidebar
        epics={filteredEpics}
        slices={allSlices}
        selectedEpicIds={selectedEpicIds}
        selectedSliceIds={selectedSliceIds}
        onEpicToggle={handleEpicToggle}
        onSliceToggle={handleSliceToggle}
        viewMode={viewMode}
        isMobileSidebarOpen={isMobileSidebarOpen}
        onMobileSidebarClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main workspace area */}
      <div className="flex-1 flex flex-col min-w-0">
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
              {viewMode === 'org' ? (
                <>
                  {isLoadingOrgTickets ? 'Loading...' : `${orgTickets.length} ticket${orgTickets.length !== 1 ? 's' : ''}`}
                  {selectedAssignee && ` for ${selectedAssignee}`}
                </>
              ) : (
                <>
                  {selectedEpicIds.size} epic{selectedEpicIds.size !== 1 ? 's' : ''} · {selectedSliceIds.size} slice{selectedSliceIds.size !== 1 ? 's' : ''} · {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''}
                  {selectedAssignee && ` for ${selectedAssignee}`}
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSearchOpen ? (
              <form onSubmit={handleTicketSearch} className="flex items-center gap-1">
                <Input
                  ref={searchInputRef}
                  value={searchValue}
                  onChange={(e) => { setSearchValue(e.target.value); setSearchError(null) }}
                  placeholder="T-F4E7073E"
                  className={`h-7 w-36 text-xs font-mono ${searchError ? 'border-red-500' : ''}`}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsSearchOpen(false)
                      setSearchValue('')
                      setSearchError(null)
                    }
                  }}
                />
                <Button type="submit" variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <Search className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => { setIsSearchOpen(false); setSearchValue(''); setSearchError(null) }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </form>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => setIsSearchOpen(true)}
                title="Find ticket by ID"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Find</span>
              </Button>
            )}
            <Button
              variant={viewMode === 'org' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => setViewMode(viewMode === 'org' ? 'slice' : 'org')}
              title={viewMode === 'org' ? 'Switch to slice view' : 'View all org tickets'}
            >
              <Network className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Org View</span>
            </Button>
            <AssigneeFilter
              availableAssignees={availableAssignees}
              selectedAssignee={selectedAssignee}
              onAssigneeChange={setSelectedAssignee}
            />
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-auto">
          {/* Org View - show all tickets for the organization */}
          {viewMode === 'org' ? (
            <div className="h-full flex flex-col">
              <div className="flex-1 min-h-0">
                {isLoadingOrgTickets ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Network className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
                      <p className="text-sm">Loading all tickets...</p>
                    </div>
                  </div>
                ) : orgTickets.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Network className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">No tickets in this organization</p>
                    </div>
                  </div>
                ) : (
                  <OrgGraph
                    tickets={orgTickets}
                    epics={epics}
                    slices={Object.values(slicesByEpic).flat()}
                    selectedTicketId={focusedTicket}
                    centerOnTicketId={centerOnTicketId}
                    processingTicketIds={processingTicketIds}
                    onTicketClick={handleGraphTicketClick}
                    onPaneClick={handleCloseDrawer}
                  />
                )}
              </div>
            </div>
          ) : (
            <>
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
                            selectedTicketId={focusedTicket}
                            processingTicketIds={processingTicketIds}
                            onTicketClick={handleGraphTicketClick}
                            onPaneClick={handleCloseDrawer}
                            onCrossSliceClick={handleCrossSliceClick}
                            onRefresh={handlePipelineRefresh}
                          />
                        ) : (
                          /* Multiple slices - grid of graphs */
                          <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 overflow-auto">
                            {selectedSlices.map(slice => {
                              const sliceTickets = graphTickets.filter(t => t.slice_id === slice.slice_id)
                              return (
                              <div key={slice.slice_id} className="h-[500px] bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden">
                                <div className="h-8 px-3 flex items-center bg-zinc-900 border-b border-zinc-800">
                                  <span className="text-xs font-medium text-zinc-300 truncate">{slice.title}</span>
                                </div>
                                <div className="h-[calc(100%-32px)]">
                                  <SliceGraphWithApproval
                                    slice={slice}
                                    tickets={sliceTickets}
                                    allTickets={graphTickets}
                                    selectedTicketId={focusedTicket}
                                    processingTicketIds={processingTicketIds}
                                    onTicketClick={handleGraphTicketClick}
                                    onPaneClick={handleCloseDrawer}
                                    onCrossSliceClick={handleCrossSliceClick}
                                    onRefresh={handlePipelineRefresh}
                                  />
                                </div>
                              </div>
                              )
                            })}
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              )}
            </>
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
        onTicketUpdate={handleTicketUpdate}
      />
    </div>
  )
}
