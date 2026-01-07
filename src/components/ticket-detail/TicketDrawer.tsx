"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { X, Link2, FileText, Save, Bot, Play, ChevronDown, ChevronUp, Loader2, Check } from 'lucide-react'
import { Ticket } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { updateTicketNotes } from '@/lib/api/tickets'
import {
  getAgentRuns,
  getAgentTypeInfo,
  getStatusInfo,
  type AgentType,
  type AgentRun,
} from '@/lib/api/agents'
import { AgentRunModal } from '@/components/agent-run-modal'
import { useAgentState } from '@/contexts/agent-state-context'

export interface TicketDetailProps {
  ticket: Ticket | null
  isOpen: boolean
  onClose: () => void
}

export function TicketDrawer({ ticket, isOpen, onClose }: TicketDetailProps) {
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
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null)

  // Modal state - persists even when modal is closed
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
    const completed = new Set<AgentType>()
    agentRuns.forEach(run => {
      if (run.status === 'completed') {
        completed.add(run.agent_type)
      }
    })
    return completed
  }, [agentRuns])

  // Load agent runs when ticket changes - use ticket_id as stable dependency
  useEffect(() => {
    if (!ticket) return

    let cancelled = false

    const loadRuns = async () => {
      setIsLoadingRuns(true)
      try {
        const runs = await getAgentRuns(ticket.epic_id, ticket.slice_id, ticket.ticket_id)
        if (!cancelled) {
          setAgentRuns(runs)
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
      setIsCheckingActiveAgent(true)
      try {
        const activeInfo = await checkForActiveAgent(ticket.epic_id, ticket.slice_id, ticket.ticket_id)
        if (!cancelled && activeInfo) {
          setModalAgentType(activeInfo.agentType)
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
  }, [ticket?.ticket_id]) // Only re-run when ticket ID changes, not on every ticket object change

  // Function to reload agent runs (for after completion)
  const reloadAgentRuns = useCallback(async () => {
    if (!ticket) return
    try {
      const runs = await getAgentRuns(ticket.epic_id, ticket.slice_id, ticket.ticket_id)
      setAgentRuns(runs)
    } catch (error) {
      console.error('Failed to reload agent runs:', error)
    }
  }, [ticket?.epic_id, ticket?.slice_id, ticket?.ticket_id])

  // Sync modal agent type from global state when switching tickets
  useEffect(() => {
    if (runningAgentInfo) {
      setModalAgentType(runningAgentInfo.agentType)
      setReconnectSessionId(runningAgentInfo.sessionId)
    }
  }, [runningAgentInfo])

  if (!ticket) return null

  const handleSaveNotes = async () => {
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
  }

  const handleRunAgent = (agentType: AgentType) => {
    if (!ticket) return

    // Don't allow clicking while we're checking for active agents
    if (isCheckingActiveAgent) return

    // If agent is already running, just reopen the modal (don't auto-start again)
    if (isAgentRunning) {
      setShouldAutoStart(false)
      setIsModalOpen(true)
      return
    }

    // If this agent type has already completed, show the output instead of re-running
    if (completedAgentTypes.has(agentType)) {
      // Find the completed run to show
      const completedRun = agentRuns.find(
        run => run.agent_type === agentType && run.status === 'completed'
      )
      if (completedRun) {
        setModalAgentType(agentType)
        setReconnectSessionId(completedRun.session_id)
        setShouldAutoStart(false)
        setIsModalOpen(true)
        return
      }
    }

    // Find the most recent completed run to chain from (if applicable)
    const previousRun = agentRuns.find(
      (run) => run.status === 'completed' && run.output_summary
    )

    setModalAgentType(agentType)
    setModalPreviousSessionId(previousRun?.session_id)
    setReconnectSessionId(undefined) // Clear any reconnect state - this is a new run
    setShouldAutoStart(true)  // Explicit user action - start the agent
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    // Just close the modal, don't reset state if agent is still running
    setIsModalOpen(false)
  }

  const handleAgentStart = () => {
    if (!ticket || !modalAgentType) return

    // Mark agent as started in global state
    markAgentStarted({
      sessionId: reconnectSessionId || '', // Will be updated when we get the actual session ID
      ticketId: ticket.ticket_id,
      epicId: ticket.epic_id,
      sliceId: ticket.slice_id,
      agentType: modalAgentType,
      startedAt: new Date().toISOString(),
    })
    setShouldAutoStart(false)  // Clear so reopening modal doesn't restart
  }

  const handleModalComplete = () => {
    if (ticket) {
      markAgentCompleted(ticket.ticket_id)
    }
    setModalAgentType(null)
    setModalPreviousSessionId(undefined)
    setReconnectSessionId(undefined) // Clear reconnect state
    reloadAgentRuns() // Refresh runs list when agent completes
  }

  const agentTypes: AgentType[] = ['research', 'planning', 'execution', 'evaluation']

  return (
    <>
      {/* Backdrop - clicking outside closes drawer */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed right-0 top-12 bottom-0 w-96 bg-background border-l border-border z-50",
          "transition-transform duration-200",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="h-14 border-b border-border flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-muted-foreground">{ticket.ticket_id}</span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className={cn(
              "text-xs font-medium",
              ticket.status === 'completed' && "text-green-500",
              ticket.status === 'blocked' && "text-destructive",
              ticket.status === 'in_progress' && "text-blue-500",
              (!ticket.status || ticket.status === 'open') && "text-muted-foreground"
            )}>
              {(ticket.status || 'open').toUpperCase().replace('_', ' ')}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClose}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        {/* Content */}
        <div className="h-full overflow-y-auto pb-20">
          <div className="p-6 space-y-6">
            {/* Title */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">{ticket.title}</h2>
              {ticket.type && ticket.type !== 'task' && (
                <span className="inline-block px-2 py-1 bg-muted border border-border rounded text-xs text-muted-foreground">
                  {ticket.type}
                </span>
              )}
            </div>

            {/* Intent */}
            {ticket.intent && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">INTENT</span>
                </div>
                <p className="text-sm text-foreground">{ticket.intent}</p>
              </div>
            )}

            {/* Agent Runs Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Bot className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">AI AGENTS</span>
              </div>

              {/* Agent Type Buttons */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {agentTypes.map((type) => {
                  const info = getAgentTypeInfo(type)
                  const isThisRunning = isAgentRunning && modalAgentType === type
                  const isThisChecking = isCheckingActiveAgent
                  const isThisCompleted = completedAgentTypes.has(type)
                  return (
                    <Button
                      key={type}
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-auto py-2 flex flex-col items-start gap-0.5",
                        isThisRunning && "border-blue-500 bg-blue-500/5",
                        isThisCompleted && !isThisRunning && "border-green-500/50 bg-green-500/5"
                      )}
                      onClick={() => handleRunAgent(type)}
                      disabled={isThisChecking || (isAgentRunning && modalAgentType !== type)}
                    >
                      <div className="flex items-center gap-1.5 w-full">
                        {isThisRunning ? (
                          <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                        ) : isThisCompleted ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Play className={cn("h-3 w-3", info.color)} />
                        )}
                        <span className="text-xs font-medium">{info.label}</span>
                        {isThisRunning && (
                          <span className="ml-auto text-[10px] text-blue-500">Running</span>
                        )}
                        {isThisCompleted && !isThisRunning && (
                          <span className="ml-auto text-[10px] text-green-500">Done</span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        {isThisRunning ? 'Click to view output' : isThisCompleted ? 'Click to view results' : info.description}
                      </span>
                    </Button>
                  )
                })}
              </div>

              {/* Agent Run History */}
              <div className="space-y-2">
                {isLoadingRuns ? (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    Loading agent runs...
                  </div>
                ) : agentRuns.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-4 bg-muted/20 rounded-md">
                    No agent runs yet. Click a button above to run an agent.
                  </div>
                ) : (
                  agentRuns.map((run) => {
                    const typeInfo = getAgentTypeInfo(run.agent_type)
                    const statusInfo = getStatusInfo(run.status)
                    const isExpanded = expandedRunId === run.session_id

                    return (
                      <div
                        key={run.session_id}
                        className="bg-muted/20 rounded-md border border-border overflow-hidden"
                      >
                        {/* Run Header */}
                        <div
                          className="p-2 cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => setExpandedRunId(isExpanded ? null : run.session_id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={cn("text-xs font-medium", typeInfo.color)}>
                                {typeInfo.label}
                              </span>
                              <span className={cn("text-[10px]", statusInfo.color)}>
                                {statusInfo.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(run.started_at).toLocaleString()}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="h-3 w-3 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-3 w-3 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expanded Content */}
                        {isExpanded && run.output_summary && (
                          <div className="px-2 pb-2">
                            <div className="p-2 bg-background rounded text-xs text-muted-foreground whitespace-pre-wrap max-h-64 overflow-y-auto">
                              {run.output_summary}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">NOTES</span>
                </div>
                {!isEditingNotes && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => setIsEditingNotes(true)}
                  >
                    Edit
                  </Button>
                )}
              </div>
              {isEditingNotes ? (
                <div className="space-y-2">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full min-h-[100px] p-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-y"
                    placeholder="Add notes..."
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveNotes}
                      disabled={isSavingNotes}
                      className="h-7"
                    >
                      <Save className="h-3 w-3 mr-1" />
                      {isSavingNotes ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setNotes(ticket.notes || '')
                        setIsEditingNotes(false)
                      }}
                      disabled={isSavingNotes}
                      className="h-7"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="text-sm text-muted-foreground whitespace-pre-wrap min-h-[50px] p-2 bg-muted/20 rounded-md cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setIsEditingNotes(true)}
                >
                  {notes || <span className="italic text-muted-foreground/60">Click to add notes...</span>}
                </div>
              )}
            </div>

            {/* Relationships */}
            {((ticket.blocks_tickets && ticket.blocks_tickets.length > 0) ||
              (ticket.blocked_by_tickets && ticket.blocked_by_tickets.length > 0) ||
              (ticket.caused_by_tickets && ticket.caused_by_tickets.length > 0)) && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Link2 className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">RELATIONSHIPS</span>
                </div>

                <div className="space-y-3">
                  {/* Blocks */}
                  {ticket.blocks_tickets && ticket.blocks_tickets.length > 0 && (
                    <div>
                      <div className="text-xs text-destructive mb-1">Blocks</div>
                      <div className="space-y-1">
                        {ticket.blocks_tickets.map((id) => (
                          <div
                            key={id}
                            className="px-2 py-1 bg-muted/50 border border-border rounded text-xs font-mono text-muted-foreground"
                          >
                            {id}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Blocked by */}
                  {ticket.blocked_by_tickets && ticket.blocked_by_tickets.length > 0 && (
                    <div>
                      <div className="text-xs text-orange-500 mb-1">Blocked by</div>
                      <div className="space-y-1">
                        {ticket.blocked_by_tickets.map((id) => (
                          <div
                            key={id}
                            className="px-2 py-1 bg-muted/50 border border-border rounded text-xs font-mono text-muted-foreground"
                          >
                            {id}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Caused by */}
                  {ticket.caused_by_tickets && ticket.caused_by_tickets.length > 0 && (
                    <div>
                      <div className="text-xs text-yellow-500 mb-1">Caused by</div>
                      <div className="space-y-1">
                        {ticket.caused_by_tickets.map((id) => (
                          <div
                            key={id}
                            className="px-2 py-1 bg-muted/50 border border-border rounded text-xs font-mono text-muted-foreground"
                          >
                            {id}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="pt-4 border-t border-border">
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Created</span>
                  <span className="font-mono">
                    {new Date(ticket.created_at_iso).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Updated</span>
                  <span className="font-mono">
                    {new Date(ticket.updated_at_iso).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Run Modal */}
      <AgentRunModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        ticket={ticket}
        agentType={modalAgentType}
        previousSessionId={modalPreviousSessionId}
        reconnectSessionId={reconnectSessionId}
        autoStart={shouldAutoStart}
        onStart={handleAgentStart}
        onComplete={handleModalComplete}
      />
    </>
  )
}
