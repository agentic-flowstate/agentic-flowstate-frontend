/**
 * Agent Streaming Functions
 */

import { AGENT_API_BASE, getCurrentOrg } from './types'
import type { AgentType, RunAgentRequest, StreamEvent } from './types'

/**
 * Helper to parse SSE stream
 */
async function parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onEvent: (event: StreamEvent) => void,
  debug = false
): Promise<void> {
  const decoder = new TextDecoder()
  let buffer = ''
  let totalBytesReceived = 0
  let totalEventsProcessed = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      if (debug) {
        console.log('[parseSSEStream] Stream done. Total bytes:', totalBytesReceived, 'Total events:', totalEventsProcessed)
      }
      break
    }

    const chunk = decoder.decode(value, { stream: true })
    totalBytesReceived += value.length
    buffer += chunk

    // Parse SSE format: data: <json>\n\n
    const lines = buffer.split('\n\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const jsonStr = line.slice(6)
        try {
          const event = JSON.parse(jsonStr) as StreamEvent
          totalEventsProcessed++
          if (debug) {
            console.log('[parseSSEStream] Parsed event #' + totalEventsProcessed + ':', event.type)
          }
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
      totalEventsProcessed++
      onEvent(event)
    } catch (e) {
      console.warn('Failed to parse final event:', buffer, e)
    }
  }

  if (debug && totalEventsProcessed === 0) {
    console.error('[parseSSEStream] WARNING: Zero events processed! Total bytes received:', totalBytesReceived)
  }
}

/**
 * Reconnect to an agent run's stream to get stored output
 */
export async function reconnectAgentStream(
  sessionId: string,
  onEvent: (event: StreamEvent) => void,
  onComplete: () => void,
  onError: (error: Error) => void
): Promise<void> {
  const url = `${AGENT_API_BASE}/api/agent-runs/${encodeURIComponent(sessionId)}/stream`
  console.log('[reconnectAgentStream] Fetching:', url)

  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'text/event-stream' },
      credentials: 'include',
    })

    console.log('[reconnectAgentStream] Response status:', response.status)
    if (!response.ok) {
      throw new Error(`Reconnect request failed: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    await parseSSEStream(reader, onEvent, true)
    onComplete()
  } catch (error) {
    onError(error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * Create an EventSource for streaming agent output (basic)
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
        credentials: 'include',
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

      const lines = buffer.split('\n\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          onMessage(line.slice(6))
        }
      }
    }

    if (buffer.startsWith('data: ')) {
      onMessage(buffer.slice(6))
    }

    onComplete()
  } catch (error) {
    onError(error instanceof Error ? error : new Error(String(error)))
  }
}

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
  onError: (error: Error) => void,
  selectedSessionIds?: string[],
  customInputMessage?: string,
  stepId?: string
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
        credentials: 'include',
        body: JSON.stringify({
          agent_type: agentType,
          previous_session_id: previousSessionId,
          selected_session_ids: selectedSessionIds,
          custom_input_message: customInputMessage,
          step_id: stepId,
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

    await parseSSEStream(reader, onEvent)
    onComplete()
  } catch (error) {
    onError(error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * Send a follow-up message to an existing agent session (for email agent refinement)
 */
export async function sendMessageToAgent(
  sessionId: string,
  message: string,
  onEvent: (event: StreamEvent) => void,
  onComplete: () => void,
  onError: (error: Error) => void
): Promise<void> {
  try {
    const response = await fetch(
      `${AGENT_API_BASE}/api/agent-runs/${encodeURIComponent(sessionId)}/message`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        credentials: 'include',
        body: JSON.stringify({ message }),
      }
    )

    if (!response.ok) {
      throw new Error(`Message request failed: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    await parseSSEStream(reader, onEvent)
    onComplete()
  } catch (error) {
    onError(error instanceof Error ? error : new Error(String(error)))
  }
}
