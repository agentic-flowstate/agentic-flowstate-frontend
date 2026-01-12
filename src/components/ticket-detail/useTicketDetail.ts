"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Ticket } from '@/lib/types'
import { updateTicketNotes } from '@/lib/api/tickets'
import {
  getAgentRuns,
  isValidAgentType,
  type AgentType,
  type AgentRun,
} from '@/lib/api/agents'
import { useAgentState } from '@/contexts/agent-state-context'

export interface UseTicketDetailProps {
  ticket: Ticket | null
  isOpen: boolean
  activeAgentRun?: string | null
  onAgentRunChange?: (sessionId: string | null) => void
}

interface RunningAgentInfo {
  sessionId: string
  ticketId: string
  epicId: string
  sliceId: string
  agentType: AgentType | string
  startedAt: string
}

export interface UseTicketDetailReturn {
  // Notes state
  notes: string
  setNotes: (notes: string) => void
  isEditingNotes: boolean
  setIsEditingNotes: (editing: boolean) => void
  isSavingNotes: boolean
  handleSaveNotes: () => Promise<void>

  // Agent state
  agentRuns: AgentRun[]
  isLoadingRuns: boolean
  isCheckingActiveAgent: boolean
  isAgentRunning: boolean
  runningAgentInfo: RunningAgentInfo | undefined
  completedAgentTypes: Set<string>
  archivedRuns: AgentRun[]
  agentTypes: AgentType[]

  // Modal state
  isModalOpen: boolean
  setIsModalOpen: (open: boolean) => void
  modalAgentType: AgentType | null
  modalPreviousSessionId: string | undefined
  shouldAutoStart: boolean
  reconnectSessionId: string | undefined

  // Handlers
  handleRunAgent: (agentType: AgentType) => void
  handleModalClose: () => void
  handleAgentStart: () => void
  handleModalComplete: () => void
  handleViewArchivedRun: (run: AgentRun) => void
  handleHistoryRunClick: (sessionId: string) => void
  reloadAgentRuns: () => Promise<void>
}

const CURRENT_AGENT_TYPES: string[] = [
  'vendor-research',
  'technical-research',
  'competitive-research',
  'planning',
  'execution',
  'evaluation',
  'email'
]

export function useTicketDetail({
  ticket,
  isOpen,
  activeAgentRun,
  onAgentRunChange,
}: UseTicketDetailProps): UseTicketDetailReturn {
  // Notes state
  const [notes, setNotes] = useState('')
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [isSavingNotes, setIsSavingNotes] = useState(false)

  // Agent state from global context
  const {
    isAgentRunning: isGlobalAgentRunning,
    getRunningAgent,
    markAgentStarted,
    markAgentCompleted,
    checkForActiveAgent,
  } = useAgentState()

  // Local agent state
  const [agentRuns, setAgentRuns] = useState<AgentRun[]>([])
  const [isLoadingRuns, setIsLoadingRuns] = useState(false)
  const [isCheckingActiveAgent, setIsCheckingActiveAgent] = useState(false)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalAgentType, setModalAgentType] = useState<AgentType | null>(null)
  const [modalPreviousSessionId, setModalPreviousSessionId] = useState<string | undefined>(undefined)
  const [shouldAutoStart, setShouldAutoStart] = useState(false)
  const [reconnectSessionId, setReconnectSessionId] = useState<string | undefined>(undefined)

  // Derive running state from global context
  const isAgentRunning = ticket ? isGlobalAgentRunning(ticket.ticket_id) : false
  const runningAgentInfo = ticket ? getRunningAgent(ticket.ticket_id) : undefined

  // Track which agent types have completed runs
  const completedAgentTypes = useMemo(() => {
    const completed = new Set<string>()
    agentRuns.forEach(run => {
      if (run.status === 'completed') {
        completed.add(run.agent_type)
      }
    })
    return completed
  }, [agentRuns])

  // Get completed runs that are NOT current agent types (legacy/archived)
  const archivedRuns = useMemo(() => {
    return agentRuns.filter(run =>
      (run.status === 'completed' || run.status === 'failed') &&
      !CURRENT_AGENT_TYPES.includes(run.agent_type)
    )
  }, [agentRuns])

  // Track if we've already processed the activeAgentRun from URL
  const processedActiveRunRef = useRef<string | null>(null)

  // Load agent runs when ticket changes
  useEffect(() => {
    if (!ticket) return

    let cancelled = false

    const loadRuns = async () => {
      setIsLoadingRuns(true)
      try {
        const runs = await getAgentRuns(ticket.epic_id, ticket.slice_id, ticket.ticket_id)
        if (!cancelled) {
          setAgentRuns(runs)

          // If we have an activeAgentRun from URL and haven't processed it yet, open the modal
          if (activeAgentRun && processedActiveRunRef.current !== activeAgentRun) {
            processedActiveRunRef.current = activeAgentRun
            const run = runs.find(r => r.session_id === activeAgentRun)
            if (run) {
              if (isValidAgentType(run.agent_type)) {
                setModalAgentType(run.agent_type as AgentType)
              }
              setReconnectSessionId(activeAgentRun)
              setShouldAutoStart(false)
              setIsModalOpen(true)
            }
          }
        }
      } catch (error) {
        console.error('Failed to load agent runs:', error)
      } finally {
        if (!cancelled) {
          setIsLoadingRuns(false)
        }
      }
    }

    const checkActiveAgent = async () => {
      if (activeAgentRun) return

      setIsCheckingActiveAgent(true)
      try {
        const activeInfo = await checkForActiveAgent(ticket.epic_id, ticket.slice_id, ticket.ticket_id)
        if (!cancelled && activeInfo) {
          if (isValidAgentType(activeInfo.agentType)) {
            setModalAgentType(activeInfo.agentType)
          }
          setReconnectSessionId(activeInfo.sessionId)
          setShouldAutoStart(false)
        }
      } finally {
        if (!cancelled) {
          setIsCheckingActiveAgent(false)
        }
      }
    }

    setNotes(ticket.notes || '')
    setIsEditingNotes(false)
    loadRuns()
    checkActiveAgent()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?.ticket_id, activeAgentRun])

  // Reload agent runs
  const reloadAgentRuns = useCallback(async () => {
    if (!ticket) return
    try {
      const runs = await getAgentRuns(ticket.epic_id, ticket.slice_id, ticket.ticket_id)
      setAgentRuns(runs)
    } catch (error) {
      console.error('Failed to reload agent runs:', error)
    }
  }, [ticket?.epic_id, ticket?.slice_id, ticket?.ticket_id])

  // Poll for agent run updates while open
  useEffect(() => {
    if (!isOpen || !ticket) return

    const interval = setInterval(() => {
      reloadAgentRuns()
    }, 10000)

    return () => clearInterval(interval)
  }, [isOpen, ticket?.ticket_id, reloadAgentRuns])

  // Sync modal agent type from global state
  useEffect(() => {
    if (runningAgentInfo) {
      if (isValidAgentType(runningAgentInfo.agentType)) {
        setModalAgentType(runningAgentInfo.agentType)
      }
      setReconnectSessionId(runningAgentInfo.sessionId)
    }
  }, [runningAgentInfo])

  // Determine agent types based on assignee
  const agentTypes: AgentType[] = useMemo(() => {
    if (ticket?.assignee?.toLowerCase() === 'jake greene') {
      return ['vendor-research', 'technical-research', 'competitive-research', 'email']
    }
    return ['vendor-research', 'technical-research', 'competitive-research', 'planning', 'execution', 'evaluation', 'email']
  }, [ticket?.assignee])

  // Handlers
  const handleSaveNotes = useCallback(async () => {
    if (!ticket) return

    setIsSavingNotes(true)
    try {
      await updateTicketNotes(ticket.epic_id, ticket.slice_id, ticket.ticket_id, notes)
      setIsEditingNotes(false)
    } catch (error) {
      console.error('Failed to save notes:', error)
    } finally {
      setIsSavingNotes(false)
    }
  }, [ticket, notes])

  const handleRunAgent = useCallback((agentType: AgentType) => {
    if (!ticket) return
    if (isCheckingActiveAgent) return

    if (isAgentRunning) {
      setShouldAutoStart(false)
      setIsModalOpen(true)
      return
    }

    if (completedAgentTypes.has(agentType)) {
      const completedRun = agentRuns.find(
        run => run.agent_type === agentType && run.status === 'completed'
      )
      if (completedRun) {
        setModalAgentType(agentType)
        setReconnectSessionId(completedRun.session_id)
        setShouldAutoStart(false)
        setIsModalOpen(true)
        onAgentRunChange?.(completedRun.session_id)
        return
      }
    }

    const previousRun = agentRuns.find(
      (run) => run.status === 'completed' && run.output_summary
    )

    setModalAgentType(agentType)
    setModalPreviousSessionId(previousRun?.session_id)
    setReconnectSessionId(undefined)
    // Email agent: don't auto-start, let user select context first
    setShouldAutoStart(agentType !== 'email')
    setIsModalOpen(true)
  }, [ticket, isCheckingActiveAgent, isAgentRunning, completedAgentTypes, agentRuns, onAgentRunChange])

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false)
    onAgentRunChange?.(null)
  }, [onAgentRunChange])

  const handleAgentStart = useCallback(() => {
    if (!ticket || !modalAgentType) return

    markAgentStarted({
      sessionId: reconnectSessionId || '',
      ticketId: ticket.ticket_id,
      epicId: ticket.epic_id,
      sliceId: ticket.slice_id,
      agentType: modalAgentType,
      startedAt: new Date().toISOString(),
    })
    setShouldAutoStart(false)
  }, [ticket, modalAgentType, reconnectSessionId, markAgentStarted])

  const handleModalComplete = useCallback(() => {
    if (ticket) {
      markAgentCompleted(ticket.ticket_id)
    }
    setModalPreviousSessionId(undefined)
    reloadAgentRuns()
  }, [ticket, markAgentCompleted, reloadAgentRuns])

  const handleViewArchivedRun = useCallback((run: AgentRun) => {
    setModalAgentType(null)
    setReconnectSessionId(run.session_id)
    setShouldAutoStart(false)
    setIsModalOpen(true)
    onAgentRunChange?.(run.session_id)
  }, [onAgentRunChange])

  const handleHistoryRunClick = useCallback((sessionId: string) => {
    const run = agentRuns.find(r => r.session_id === sessionId)
    if (run) {
      if (isValidAgentType(run.agent_type)) {
        setModalAgentType(run.agent_type as AgentType)
      }
      setReconnectSessionId(sessionId)
      setShouldAutoStart(false)
      setIsModalOpen(true)
      onAgentRunChange?.(sessionId)
    }
  }, [agentRuns, onAgentRunChange])

  return {
    // Notes
    notes,
    setNotes,
    isEditingNotes,
    setIsEditingNotes,
    isSavingNotes,
    handleSaveNotes,

    // Agent state
    agentRuns,
    isLoadingRuns,
    isCheckingActiveAgent,
    isAgentRunning,
    runningAgentInfo,
    completedAgentTypes,
    archivedRuns,
    agentTypes,

    // Modal state
    isModalOpen,
    setIsModalOpen,
    modalAgentType,
    modalPreviousSessionId,
    shouldAutoStart,
    reconnectSessionId,

    // Handlers
    handleRunAgent,
    handleModalClose,
    handleAgentStart,
    handleModalComplete,
    handleViewArchivedRun,
    handleHistoryRunClick,
    reloadAgentRuns,
  }
}
