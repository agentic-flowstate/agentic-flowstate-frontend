"use client"

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { AgentRun, AgentType, getActiveAgentRun } from '@/lib/api/agents'

/**
 * Global agent state tracking for all tickets.
 * This context maintains awareness of running agents across the entire app,
 * so switching between tickets doesn't lose track of running agents.
 */

interface RunningAgentInfo {
  sessionId: string
  ticketId: string
  epicId: string
  sliceId: string
  agentType: AgentType | string  // Can be string for legacy types
  startedAt: string
}

interface AgentStateContextType {
  // Map of ticketId -> running agent info
  runningAgents: Map<string, RunningAgentInfo>

  // Check if a specific ticket has a running agent
  isAgentRunning: (ticketId: string) => boolean

  // Get running agent info for a ticket
  getRunningAgent: (ticketId: string) => RunningAgentInfo | undefined

  // Mark an agent as started
  markAgentStarted: (info: RunningAgentInfo) => void

  // Mark an agent as completed/failed
  markAgentCompleted: (ticketId: string) => void

  // Check backend for active agents on a ticket (for reconnection)
  checkForActiveAgent: (epicId: string, sliceId: string, ticketId: string) => Promise<RunningAgentInfo | null>

  // Refresh running agents from backend for multiple tickets
  refreshRunningAgents: (tickets: { epicId: string, sliceId: string, ticketId: string }[]) => Promise<void>

  // Clear stale running state if pipeline shows agent completed
  clearIfPipelineCompleted: (ticketId: string, pipelineSteps: { agent_type: string, status: string, agent_run_id?: string }[]) => void
}

const AgentStateContext = createContext<AgentStateContextType | undefined>(undefined)

export function AgentStateProvider({ children }: { children: React.ReactNode }) {
  const [runningAgents, setRunningAgents] = useState<Map<string, RunningAgentInfo>>(new Map())
  const checkingRef = useRef<Set<string>>(new Set())

  const isAgentRunning = useCallback((ticketId: string): boolean => {
    return runningAgents.has(ticketId)
  }, [runningAgents])

  const getRunningAgent = useCallback((ticketId: string): RunningAgentInfo | undefined => {
    return runningAgents.get(ticketId)
  }, [runningAgents])

  const markAgentStarted = useCallback((info: RunningAgentInfo) => {
    setRunningAgents(prev => {
      const next = new Map(prev)
      next.set(info.ticketId, info)
      return next
    })
  }, [])

  const markAgentCompleted = useCallback((ticketId: string) => {
    setRunningAgents(prev => {
      const next = new Map(prev)
      next.delete(ticketId)
      return next
    })
  }, [])

  const checkForActiveAgent = useCallback(async (
    epicId: string,
    sliceId: string,
    ticketId: string
  ): Promise<RunningAgentInfo | null> => {
    // Avoid duplicate checks
    if (checkingRef.current.has(ticketId)) {
      return runningAgents.get(ticketId) || null
    }

    try {
      checkingRef.current.add(ticketId)
      const activeRun = await getActiveAgentRun(epicId, sliceId, ticketId)

      if (activeRun) {
        const info: RunningAgentInfo = {
          sessionId: activeRun.session_id,
          ticketId: activeRun.ticket_id,
          epicId: activeRun.epic_id,
          sliceId: activeRun.slice_id,
          agentType: activeRun.agent_type,
          startedAt: activeRun.started_at,
        }

        setRunningAgents(prev => {
          const next = new Map(prev)
          next.set(ticketId, info)
          return next
        })

        return info
      } else {
        // No active agent - make sure we don't have stale state
        setRunningAgents(prev => {
          if (prev.has(ticketId)) {
            const next = new Map(prev)
            next.delete(ticketId)
            return next
          }
          return prev
        })
        return null
      }
    } catch (error) {
      console.error('Failed to check for active agent:', error)
      return null
    } finally {
      checkingRef.current.delete(ticketId)
    }
  }, [runningAgents])

  const refreshRunningAgents = useCallback(async (
    tickets: { epicId: string, sliceId: string, ticketId: string }[]
  ) => {
    // Check all tickets in parallel
    await Promise.all(
      tickets.map(t => checkForActiveAgent(t.epicId, t.sliceId, t.ticketId))
    )
  }, [checkForActiveAgent])

  // Clear stale running state if pipeline shows the CURRENT agent run is no longer running.
  // We compare agent_run_id to avoid clearing when stale pipeline data still shows a previous
  // run's "failed" status while a new run is actually in progress.
  const clearIfPipelineCompleted = useCallback((
    ticketId: string,
    pipelineSteps: { agent_type: string, status: string, agent_run_id?: string }[]
  ) => {
    const runningAgent = runningAgents.get(ticketId)
    if (!runningAgent) return

    // Find the step for the supposedly running agent
    const step = pipelineSteps.find(s => s.agent_type === runningAgent.agentType)
    if (!step) return

    // Only clear if this step's agent_run_id matches the session we're tracking.
    // If the IDs don't match, the step status is from a previous run and we should
    // NOT clear the running state for the current run.
    const idsMatch = step.agent_run_id && step.agent_run_id === runningAgent.sessionId

    if (idsMatch && (step.status === 'completed' || step.status === 'failed')) {
      setRunningAgents(prev => {
        const next = new Map(prev)
        next.delete(ticketId)
        return next
      })
    }
  }, [runningAgents])

  const value: AgentStateContextType = {
    runningAgents,
    isAgentRunning,
    getRunningAgent,
    markAgentStarted,
    markAgentCompleted,
    checkForActiveAgent,
    refreshRunningAgents,
    clearIfPipelineCompleted,
  }

  return (
    <AgentStateContext.Provider value={value}>
      {children}
    </AgentStateContext.Provider>
  )
}

export function useAgentState() {
  const context = useContext(AgentStateContext)
  if (context === undefined) {
    throw new Error('useAgentState must be used within an AgentStateProvider')
  }
  return context
}
