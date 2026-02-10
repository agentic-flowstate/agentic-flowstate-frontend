"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Ticket } from '@/lib/types'
import { updateTicketNotes, getTicketById } from '@/lib/api/tickets'
import { runPipeline, retryPipelineStep } from '@/lib/api/pipelines'
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
  onTicketUpdate?: (ticket: Ticket) => void
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

  // Ticket Assistant state
  handleOpenAssistant: () => void

  // Handlers
  handleRunAgent: (agentType: AgentType) => void
  handleRunPipeline: () => Promise<void>
  handleRetryStep: (stepId: string) => Promise<void>
  handleModalClose: () => void
  handleAgentStart: () => void
  handleModalComplete: () => void
  handleViewArchivedRun: (run: AgentRun) => void
  handleHistoryRunClick: (sessionId: string) => void
  reloadAgentRuns: () => Promise<void>
}

const CURRENT_AGENT_TYPES: string[] = [
  'exa-research',
  'research-synthesis',
  'ticket-planner',
  'ticket-creator',
  'planning',
  'execution',
  'evaluation',
  'email',
  'ticket-assistant'
]

export function useTicketDetail({
  ticket,
  isOpen,
  activeAgentRun,
  onAgentRunChange,
  onTicketUpdate,
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
    clearIfPipelineCompleted,
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


  // Clear stale running state if pipeline shows agent is done
  // This must happen before deriving isAgentRunning to avoid flicker
  useEffect(() => {
    if (ticket?.pipeline?.steps) {
      clearIfPipelineCompleted(ticket.ticket_id, ticket.pipeline.steps)
    }
  }, [ticket?.ticket_id, ticket?.pipeline?.steps, clearIfPipelineCompleted])

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

    setNotes('')
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

  // Refresh ticket to get latest pipeline state
  const refreshTicket = useCallback(async () => {
    if (!ticket) return
    try {
      const updatedTicket = await getTicketById(ticket.ticket_id)
      if (updatedTicket) {
        onTicketUpdate?.(updatedTicket)
      }
    } catch (error) {
      console.error('Failed to refresh ticket:', error)
    }
  }, [ticket?.ticket_id, onTicketUpdate])

  // Detect if pipeline has active (running) steps
  const isPipelineActive = useMemo(() => {
    return ticket?.pipeline?.steps?.some(s => s.status === 'running') ?? false
  }, [ticket?.pipeline?.steps])

  // Poll for updates while open — faster when pipeline is actively running
  useEffect(() => {
    if (!isOpen || !ticket) return

    const pollMs = isPipelineActive ? 3000 : 10000

    const interval = setInterval(() => {
      reloadAgentRuns()
      if (isPipelineActive) {
        refreshTicket()
      }
    }, pollMs)

    return () => clearInterval(interval)
  }, [isOpen, ticket?.ticket_id, isPipelineActive, reloadAgentRuns, refreshTicket])

  // Sync modal agent type from global state
  useEffect(() => {
    if (runningAgentInfo) {
      if (isValidAgentType(runningAgentInfo.agentType)) {
        setModalAgentType(runningAgentInfo.agentType)
      }
      setReconnectSessionId(runningAgentInfo.sessionId)
    }
  }, [runningAgentInfo])

  // Determine agent types from pipeline, or fall back to defaults
  const agentTypes: AgentType[] = useMemo(() => {
    // If ticket has a pipeline, use its steps
    if (ticket?.pipeline?.steps && ticket.pipeline.steps.length > 0) {
      const pipelineAgents = ticket.pipeline.steps
        .map(step => step.agent_type)
        .filter((agent): agent is AgentType => isValidAgentType(agent))
      if (pipelineAgents.length > 0) {
        return pipelineAgents
      }
    }
    // Fall back to defaults
    return ['planning', 'execution', 'evaluation']
  }, [ticket?.pipeline?.steps])

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

    // Check if pipeline step is already running or completed
    const pipelineStep = ticket.pipeline?.steps?.find(s => s.agent_type === agentType)
    const stepStatus = pipelineStep?.status

    // If this specific step is running (or any agent is running for this ticket),
    // open modal to view its output — don't start a new run
    if (stepStatus === 'running' || isAgentRunning) {
      setModalAgentType(agentType)
      // Use the agent_run_id from the pipeline step if available
      if (pipelineStep?.agent_run_id) {
        setReconnectSessionId(pipelineStep.agent_run_id)
      }
      setShouldAutoStart(false)
      setIsModalOpen(true)
      return
    }

    // If pipeline step is completed, show results (don't auto-start)
    if (stepStatus === 'completed') {
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

    // Legacy check for completed agent types (for tickets without pipelines)
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

  const handleRunPipeline = useCallback(async () => {
    if (!ticket) return

    try {
      const result = await runPipeline(ticket.ticket_id)
      if (result.started) {
        // Mark agent as started in global state so UI shows it's running
        const firstStep = ticket.pipeline?.steps?.find(s => s.status === 'queued')
        if (firstStep && result.session_id) {
          markAgentStarted({
            sessionId: result.session_id,
            ticketId: ticket.ticket_id,
            epicId: ticket.epic_id,
            sliceId: ticket.slice_id,
            agentType: firstStep.agent_type,
            startedAt: new Date().toISOString(),
          })
        }

        // Refresh ticket to get updated pipeline state
        const updatedTicket = await getTicketById(ticket.ticket_id)
        if (updatedTicket) {
          onTicketUpdate?.(updatedTicket)
        }
      }
    } catch (error) {
      console.error('Failed to start pipeline:', error)
    }
  }, [ticket, onTicketUpdate, markAgentStarted])

  const handleRetryStep = useCallback(async (stepId: string) => {
    if (!ticket) return

    try {
      const result = await retryPipelineStep(ticket.ticket_id, stepId)

      // If a new agent was auto-started, track it
      if (result.session_id) {
        const step = ticket.pipeline?.steps?.find(s => s.step_id === stepId)
        if (step) {
          markAgentStarted({
            sessionId: result.session_id,
            ticketId: ticket.ticket_id,
            epicId: ticket.epic_id,
            sliceId: ticket.slice_id,
            agentType: step.agent_type,
            startedAt: new Date().toISOString(),
          })
        }
      }

      // Refresh ticket to get updated pipeline state
      const updatedTicket = await getTicketById(ticket.ticket_id)
      if (updatedTicket) {
        onTicketUpdate?.(updatedTicket)
      }

      // Reload agent runs (old ones were cleaned up by the backend)
      await reloadAgentRuns()
    } catch (error) {
      console.error('Failed to retry pipeline step:', error)
    }
  }, [ticket, onTicketUpdate, markAgentStarted, reloadAgentRuns])

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false)
    onAgentRunChange?.(null)
  }, [onAgentRunChange])

  const handleAgentStart = useCallback(async () => {
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

    // Refresh ticket to pick up the updated pipeline step status (e.g. failed -> running)
    try {
      const updatedTicket = await getTicketById(ticket.ticket_id)
      if (updatedTicket) {
        onTicketUpdate?.(updatedTicket)
      }
    } catch {
      // Non-critical, polling will catch up
    }
  }, [ticket, modalAgentType, reconnectSessionId, markAgentStarted, onTicketUpdate])

  const handleModalComplete = useCallback(async () => {
    if (ticket) {
      markAgentCompleted(ticket.ticket_id)

      // Fetch updated ticket to get latest pipeline state and guidance
      try {
        const updatedTicket = await getTicketById(ticket.ticket_id)
        if (updatedTicket) {
          onTicketUpdate?.(updatedTicket)
        }
      } catch (error) {
        console.error('Failed to fetch updated ticket:', error)
      }
    }
    setModalPreviousSessionId(undefined)
    reloadAgentRuns()
  }, [ticket, markAgentCompleted, reloadAgentRuns, onTicketUpdate])

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

  // Ticket Assistant handler - opens modal for user to type question
  const handleOpenAssistant = useCallback(() => {
    if (!ticket) return
    if (isAgentRunning) return

    setModalAgentType('ticket-assistant')
    setModalPreviousSessionId(undefined)
    setReconnectSessionId(undefined)
    setShouldAutoStart(false) // User types question first
    setIsModalOpen(true)
  }, [ticket, isAgentRunning])

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

    // Ticket Assistant state
    handleOpenAssistant,

    // Handlers
    handleRunAgent,
    handleRunPipeline,
    handleRetryStep,
    handleModalClose,
    handleAgentStart,
    handleModalComplete,
    handleViewArchivedRun,
    handleHistoryRunClick,
    reloadAgentRuns,
  }
}
