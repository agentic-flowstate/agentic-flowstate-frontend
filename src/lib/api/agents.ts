/**
 * Data Access Layer for Agent Execution System
 *
 * This module provides async functions to run and manage AI agents on tickets.
 * Uses the Rust API server on port 8001 for agent operations.
 */

import type { OrganizationId } from "@/contexts/organization-context"

// Agent API calls go directly to Rust API server
const AGENT_API_BASE = 'http://localhost:8001'

export type AgentType = 'research' | 'planning' | 'execution' | 'evaluation'

export type AgentRunStatus = 'running' | 'completed' | 'failed' | 'cancelled'

export interface AgentRun {
  session_id: string
  ticket_id: string
  epic_id: string
  slice_id: string
  agent_type: AgentType
  status: AgentRunStatus
  started_at: string
  completed_at?: string
  input_message: string
  output_summary?: string
}

export interface RunAgentRequest {
  agent_type: AgentType
  previous_session_id?: string
}

export interface RunAgentResponse {
  session_id: string
  status: string
}

// Get current organization from localStorage (client-side only)
function getCurrentOrg(): OrganizationId | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem('selected-organization')
  return stored as OrganizationId | null
}

/**
 * Run an agent on a specific ticket
 * @param epicId - Epic ID
 * @param sliceId - Slice ID
 * @param ticketId - Ticket ID
 * @param agentType - Type of agent to run
 * @param previousSessionId - Optional session ID to chain from
 * @returns Promise resolving to run response with session_id
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
 * @param epicId - Epic ID
 * @param sliceId - Slice ID
 * @param ticketId - Ticket ID
 * @returns Promise resolving to list of agent runs
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
 * @param sessionId - Session ID of the agent run
 * @returns Promise resolving to agent run details
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
 * @param epicId - Epic ID
 * @param sliceId - Slice ID
 * @param ticketId - Ticket ID
 * @returns Promise resolving to active agent run, or null if none running
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
    return null // No active agent run
  }

  if (!response.ok) {
    throw new Error('Failed to check for active agent run')
  }

  return response.json()
}

/**
 * Reconnect to an agent run's stream to get stored output
 * Used when page is refreshed and agent has completed
 * @param sessionId - Session ID of the agent run
 * @param onEvent - Callback for each event
 * @param onComplete - Callback when stream completes
 * @param onError - Callback for errors
 */
export async function reconnectAgentStream(
  sessionId: string,
  onEvent: (event: StreamEvent) => void,
  onComplete: () => void,
  onError: (error: Error) => void
): Promise<void> {
  try {
    const response = await fetch(
      `${AGENT_API_BASE}/api/agent-runs/${encodeURIComponent(sessionId)}/stream`,
      {
        headers: {
          'Accept': 'text/event-stream',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Reconnect request failed: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // Parse SSE format: data: <json>\n\n
      const lines = buffer.split('\n\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6)
          try {
            const event = JSON.parse(jsonStr) as StreamEvent
            onEvent(event)
          } catch (e) {
            console.warn('Failed to parse reconnect event:', jsonStr, e)
          }
        }
      }
    }

    // Handle any remaining buffer
    if (buffer.startsWith('data: ')) {
      try {
        const event = JSON.parse(buffer.slice(6)) as StreamEvent
        onEvent(event)
      } catch (e) {
        console.warn('Failed to parse final reconnect event:', buffer, e)
      }
    }

    onComplete()
  } catch (error) {
    onError(error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * Create an EventSource for streaming agent output
 * Note: SSE endpoint uses POST, so we need to use fetch + ReadableStream instead
 * @param epicId - Epic ID
 * @param sliceId - Slice ID
 * @param ticketId - Ticket ID
 * @param agentType - Type of agent to run
 * @param previousSessionId - Optional session ID to chain from
 * @param onMessage - Callback for each message chunk
 * @param onComplete - Callback when stream completes
 * @param onError - Callback for errors
 */
export async function streamAgentRun(
  epicId: string,
  sliceId: string,
  ticketId: string,
  agentType: AgentType,
  previousSessionId: string | undefined,
  onMessage: (message: string) => void,
  onComplete: () => void,
  onError: (error: Error) => void
): Promise<void> {
  const currentOrg = getCurrentOrg()

  try {
    const response = await fetch(
      `${AGENT_API_BASE}/api/epics/${encodeURIComponent(epicId)}/slices/${encodeURIComponent(sliceId)}/tickets/${encodeURIComponent(ticketId)}/agent-runs/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'X-Organization': currentOrg || 'telemetryops',
        },
        body: JSON.stringify({
          agent_type: agentType,
          previous_session_id: previousSessionId,
        } as RunAgentRequest),
      }
    )

    if (!response.ok) {
      throw new Error(`Stream request failed: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // Parse SSE format: data: <content>\n\n
      const lines = buffer.split('\n\n')
      buffer = lines.pop() || '' // Keep incomplete chunk in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          onMessage(data)
        }
      }
    }

    // Handle any remaining buffer
    if (buffer.startsWith('data: ')) {
      onMessage(buffer.slice(6))
    }

    onComplete()
  } catch (error) {
    onError(error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * Get display info for an agent type
 */
export function getAgentTypeInfo(type: AgentType): {
  label: string
  description: string
  color: string
} {
  switch (type) {
    case 'research':
      return {
        label: 'Research',
        description: 'Gather information and context',
        color: 'text-blue-500',
      }
    case 'planning':
      return {
        label: 'Planning',
        description: 'Create implementation plan',
        color: 'text-purple-500',
      }
    case 'execution':
      return {
        label: 'Execution',
        description: 'Implement the changes',
        color: 'text-green-500',
      }
    case 'evaluation':
      return {
        label: 'Evaluation',
        description: 'Review and validate',
        color: 'text-orange-500',
      }
  }
}

/**
 * Get status display info
 */
export function getStatusInfo(status: AgentRunStatus): {
  label: string
  color: string
} {
  switch (status) {
    case 'running':
      return { label: 'Running', color: 'text-blue-500' }
    case 'completed':
      return { label: 'Completed', color: 'text-green-500' }
    case 'failed':
      return { label: 'Failed', color: 'text-red-500' }
    case 'cancelled':
      return { label: 'Cancelled', color: 'text-gray-500' }
  }
}

// Structured streaming event types
export type StreamEventType = 'text' | 'tool_use' | 'tool_result' | 'thinking' | 'status' | 'result'

export interface TextEvent {
  type: 'text'
  content: string
}

export interface ToolUseEvent {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ToolResultEvent {
  type: 'tool_result'
  tool_use_id: string
  content: string
  is_error: boolean
}

export interface ThinkingEvent {
  type: 'thinking'
  content: string
}

export interface StatusEvent {
  type: 'status'
  status: string
  message?: string
}

export interface ResultEvent {
  type: 'result'
  session_id: string
  status: string
  is_error: boolean
}

export interface ReplayCompleteEvent {
  type: 'replay_complete'
  total_events: number
  agent_status: string
}

export type StreamEvent = TextEvent | ToolUseEvent | ToolResultEvent | ThinkingEvent | StatusEvent | ResultEvent | ReplayCompleteEvent

/**
 * Stream agent run with structured events
 */
export async function streamAgentRunStructured(
  epicId: string,
  sliceId: string,
  ticketId: string,
  agentType: AgentType,
  previousSessionId: string | undefined,
  onEvent: (event: StreamEvent) => void,
  onComplete: () => void,
  onError: (error: Error) => void
): Promise<void> {
  const currentOrg = getCurrentOrg()

  try {
    const response = await fetch(
      `${AGENT_API_BASE}/api/epics/${encodeURIComponent(epicId)}/slices/${encodeURIComponent(sliceId)}/tickets/${encodeURIComponent(ticketId)}/agent-runs/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'X-Organization': currentOrg || 'telemetryops',
        },
        body: JSON.stringify({
          agent_type: agentType,
          previous_session_id: previousSessionId,
        } as RunAgentRequest),
      }
    )

    if (!response.ok) {
      throw new Error(`Stream request failed: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // Parse SSE format: data: <json>\n\n
      const lines = buffer.split('\n\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6)
          try {
            const event = JSON.parse(jsonStr) as StreamEvent
            onEvent(event)
          } catch (e) {
            console.warn('Failed to parse event:', jsonStr, e)
          }
        }
      }
    }

    // Handle any remaining buffer
    if (buffer.startsWith('data: ')) {
      try {
        const event = JSON.parse(buffer.slice(6)) as StreamEvent
        onEvent(event)
      } catch (e) {
        console.warn('Failed to parse final event:', buffer, e)
      }
    }

    onComplete()
  } catch (error) {
    onError(error instanceof Error ? error : new Error(String(error)))
  }
}
