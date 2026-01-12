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

  const value: AgentStateContextType = {
    runningAgents,
    isAgentRunning,
    getRunningAgent,
    markAgentStarted,
    markAgentCompleted,
    checkForActiveAgent,
    refreshRunningAgents,
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
