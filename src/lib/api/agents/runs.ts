/**
 * Agent Run API Functions
 */

import { AGENT_API_BASE, getCurrentOrg } from './types'
import type { AgentType, AgentRun, RunAgentRequest, RunAgentResponse } from './types'

/**
 * Run an agent on a specific ticket
 */
export async function runAgent(
  epicId: string,
  sliceId: string,
  ticketId: string,
  agentType: AgentType,
  previousSessionId?: string
): Promise<RunAgentResponse> {
  const currentOrg = getCurrentOrg()

  const response = await fetch(
    `${AGENT_API_BASE}/api/epics/${encodeURIComponent(epicId)}/slices/${encodeURIComponent(sliceId)}/tickets/${encodeURIComponent(ticketId)}/agent-runs`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Organization': currentOrg || 'telemetryops',
      },
      body: JSON.stringify({
        agent_type: agentType,
        previous_session_id: previousSessionId,
      } as RunAgentRequest),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to run agent: ${errorText}`)
  }

  return response.json()
}

/**
 * Get all agent runs for a specific ticket
 */
export async function getAgentRuns(
  epicId: string,
  sliceId: string,
  ticketId: string
): Promise<AgentRun[]> {
  const currentOrg = getCurrentOrg()

  const response = await fetch(
    `${AGENT_API_BASE}/api/epics/${encodeURIComponent(epicId)}/slices/${encodeURIComponent(sliceId)}/tickets/${encodeURIComponent(ticketId)}/agent-runs`,
    {
      headers: {
        'X-Organization': currentOrg || 'telemetryops',
      },
    }
  )

  if (!response.ok) {
    throw new Error('Failed to fetch agent runs')
  }

  const data = await response.json()
  return data.runs
}

/**
 * Get a specific agent run by session ID
 */
export async function getAgentRun(sessionId: string): Promise<AgentRun> {
  const response = await fetch(
    `${AGENT_API_BASE}/api/agent-runs/${encodeURIComponent(sessionId)}`
  )

  if (!response.ok) {
    throw new Error('Failed to fetch agent run')
  }

  return response.json()
}

/**
 * Check if there's an active (running) agent for a specific ticket
 */
export async function getActiveAgentRun(
  epicId: string,
  sliceId: string,
  ticketId: string
): Promise<AgentRun | null> {
  const currentOrg = getCurrentOrg()

  const response = await fetch(
    `${AGENT_API_BASE}/api/epics/${encodeURIComponent(epicId)}/slices/${encodeURIComponent(sliceId)}/tickets/${encodeURIComponent(ticketId)}/agent-runs/active`,
    {
      headers: {
        'X-Organization': currentOrg || 'telemetryops',
      },
    }
  )

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error('Failed to check for active agent run')
  }

  return response.json()
}
