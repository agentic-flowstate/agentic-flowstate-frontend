"use client"

import { useState, useRef, useCallback } from 'react'
import type { StreamEvent, ToolResultEvent, ReplayCompleteEvent } from '@/lib/api/agents'

// Tool call structure
export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
  result?: string
  isError?: boolean
  isExpanded: boolean
  status: 'pending' | 'running' | 'completed' | 'error'
}

// Message block structure
export interface MessageBlock {
  type: 'text' | 'tool_calls' | 'thinking' | 'status' | 'user'
  content?: string
  toolCalls?: ToolCall[]
  status?: string
  message?: string
  toolsCollapsed?: boolean
}

export type AgentStreamStatus = 'idle' | 'starting' | 'running' | 'reconnecting' | 'completed' | 'failed'

export interface UseAgentStreamResult {
  messages: MessageBlock[]
  status: AgentStreamStatus
  error: string | null
  sessionId: string | null
  isRunning: boolean
  isReconnecting: boolean

  // Actions
  processEvent: (event: StreamEvent) => void
  processBufferedEvents: (events: StreamEvent[], replayInfo: ReplayCompleteEvent | null) => void
  addUserMessage: (content: string) => void
  setMessages: (messages: MessageBlock[]) => void
  reset: () => void
  setStatus: (status: AgentStreamStatus) => void
  setError: (error: string | null) => void
  setSessionId: (sessionId: string | null) => void
  setIsRunning: (isRunning: boolean) => void
  setIsReconnecting: (isReconnecting: boolean) => void
  finalizeAllTools: () => void

  // UI interactions
  toggleToolExpanded: (blockIndex: number, toolId: string) => void
  toggleToolsCollapsed: (blockIndex: number) => void

  // Refs for scroll management
  scrollRef: React.RefObject<HTMLDivElement>
  userScrolledRef: React.MutableRefObject<boolean>
  handleScroll: () => void
}

/**
 * Shared hook for agent streaming logic.
 * Used by both AgentRunModal and workspace-manager.
 */
export function useAgentStream(): UseAgentStreamResult {
  const [messages, setMessages] = useState<MessageBlock[]>([])
  const [status, setStatus] = useState<AgentStreamStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const userScrolledRef = useRef(false)

  // Track user scroll to avoid auto-scrolling when user is reading
  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      userScrolledRef.current = !isNearBottom
    }
  }, [])

  // Helper to mark all running tools as completed
  const markToolsCompleted = useCallback((blocks: MessageBlock[]): MessageBlock[] => {
    return blocks.map(block => {
      if (block.type === 'tool_calls' && block.toolCalls) {
        const hasRunning = block.toolCalls.some(tc => tc.status === 'running')
        if (hasRunning) {
          return {
            ...block,
            toolCalls: block.toolCalls.map(tc =>
              tc.status === 'running'
                ? { ...tc, status: 'completed' as const }
                : tc
            )
          }
        }
      }
      return block
    })
  }, [])

  // Finalize all running tools (called on completion or result event)
  const finalizeAllTools = useCallback(() => {
    setMessages(prev => prev.map(block => {
      if (block.type === 'tool_calls' && block.toolCalls) {
        return {
          ...block,
          toolCalls: block.toolCalls.map(tc =>
            tc.status === 'running'
              ? { ...tc, status: 'completed' as const, result: tc.result ?? '(no output returned)' }
              : tc
          )
        }
      }
      return block
    }))
  }, [])

  // Process a single streaming event
  const processEvent = useCallback((event: StreamEvent) => {
    switch (event.type) {
      case 'text':
        setMessages(prev => {
          // Mark any running tools as completed - text after tools means they finished
          const updated = markToolsCompleted(prev)
          // Append to last text block or create new one
          const last = updated[updated.length - 1]
          if (last?.type === 'text') {
            return [
              ...updated.slice(0, -1),
              { ...last, content: (last.content || '') + event.content }
            ]
          }
          return [...updated, { type: 'text', content: event.content }]
        })
        break

      case 'tool_use': {
        const toolCall: ToolCall = {
          id: event.id,
          name: event.name,
          input: event.input,
          isExpanded: false,
          status: 'running',
        }
        setMessages(prev => {
          // Mark previous running tools as completed before adding new one
          const updated = markToolsCompleted(prev)
          // Add to existing tool_calls block or create new one
          const last = updated[updated.length - 1]
          if (last?.type === 'tool_calls') {
            // Preserve existing toolsCollapsed state when adding to existing block
            return [
              ...updated.slice(0, -1),
              { ...last, toolCalls: [...(last.toolCalls || []), toolCall] }
            ]
          }
          // New tool block starts collapsed
          return [...updated, { type: 'tool_calls', toolCalls: [toolCall], toolsCollapsed: true }]
        })
        break
      }

      case 'tool_result': {
        const resultEvent = event as ToolResultEvent
        setMessages(prev => {
          return prev.map(block => {
            if (block.type === 'tool_calls' && block.toolCalls) {
              return {
                ...block,
                toolCalls: block.toolCalls.map(tc =>
                  tc.id === resultEvent.tool_use_id
                    ? {
                        ...tc,
                        result: resultEvent.content || '(empty response)',
                        isError: resultEvent.is_error,
                        status: resultEvent.is_error ? 'error' as const : 'completed' as const
                      }
                    : tc
                )
              }
            }
            return block
          })
        })
        break
      }

      case 'thinking':
        setMessages(prev => [...prev, { type: 'thinking', content: event.content }])
        break

      case 'status':
        setStatus(event.status as AgentStreamStatus)
        if (event.message && event.status !== 'running') {
          setMessages(prev => [...prev, { type: 'status', status: event.status, message: event.message }])
        }
        break

      case 'result':
        finalizeAllTools()
        setStatus(event.is_error ? 'failed' : 'completed')
        setIsRunning(false)
        setIsReconnecting(false)
        if ('session_id' in event && event.session_id) {
          setSessionId(event.session_id)
        }
        break
    }
  }, [markToolsCompleted, finalizeAllTools])

  // Process all buffered events at once after replay is complete
  const processBufferedEvents = useCallback((events: StreamEvent[], replayInfo: ReplayCompleteEvent | null) => {
    if (events.length === 0) {
      console.error('[useAgentStream] processBufferedEvents called with ZERO events!')
      return
    }

    // Determine if agent is still running
    const agentStillRunning = replayInfo?.agent_status === 'running'

    // Find the last tool_use event index - only this one might still be running
    let lastToolUseId: string | null = null
    for (let i = events.length - 1; i >= 0; i--) {
      const event = events[i]
      if (event.type === 'tool_use') {
        lastToolUseId = event.id
        break
      }
      // If we see text/thinking after tools, all tools are done
      if (event.type === 'text' || event.type === 'thinking') {
        break
      }
    }

    // Build a set of tool_use_ids that have explicit results
    const toolResults = new Set<string>()
    for (const event of events) {
      if (event.type === 'tool_result') {
        toolResults.add((event as ToolResultEvent).tool_use_id)
      }
    }

    // Build message blocks from buffered events
    const newMessages: MessageBlock[] = []

    for (const event of events) {
      switch (event.type) {
        case 'text': {
          const lastText = newMessages[newMessages.length - 1]
          if (lastText?.type === 'text') {
            lastText.content = (lastText.content || '') + event.content
          } else {
            newMessages.push({ type: 'text', content: event.content })
          }
          break
        }

        case 'tool_use': {
          // Tool is running only if: agent is running AND this is the last tool AND no result exists
          const hasResult = toolResults.has(event.id)
          const isLastTool = event.id === lastToolUseId
          const toolStatus: ToolCall['status'] = hasResult
            ? 'completed'
            : (agentStillRunning && isLastTool ? 'running' : 'completed')

          const toolCall: ToolCall = {
            id: event.id,
            name: event.name,
            input: event.input,
            isExpanded: false,
            status: toolStatus,
          }
          const lastTools = newMessages[newMessages.length - 1]
          if (lastTools?.type === 'tool_calls') {
            lastTools.toolCalls = [...(lastTools.toolCalls || []), toolCall]
            lastTools.toolsCollapsed = true
          } else {
            newMessages.push({ type: 'tool_calls', toolCalls: [toolCall], toolsCollapsed: true })
          }
          break
        }

        case 'tool_result': {
          const resultEvent = event as ToolResultEvent
          // Find and update the tool with this result
          for (const block of newMessages) {
            if (block.type === 'tool_calls' && block.toolCalls) {
              for (const tc of block.toolCalls) {
                if (tc.id === resultEvent.tool_use_id) {
                  tc.result = resultEvent.content || '(empty response)'
                  tc.isError = resultEvent.is_error
                  tc.status = resultEvent.is_error ? 'error' : 'completed'
                }
              }
            }
          }
          break
        }

        case 'thinking':
          newMessages.push({ type: 'thinking', content: event.content })
          break

        case 'status':
          // Don't add status messages during replay, just update current status
          if (event.status !== 'reconnecting') {
            setStatus(event.status as AgentStreamStatus)
          }
          break

        case 'result':
          setStatus(event.is_error ? 'failed' : 'completed')
          setIsReconnecting(false)
          if ('session_id' in event && event.session_id) {
            setSessionId(event.session_id)
          }
          break
      }
    }

    // Set all messages at once
    setMessages(newMessages)

    // Update status based on replay info
    if (replayInfo) {
      setStatus(replayInfo.agent_status as AgentStreamStatus)
      if (replayInfo.agent_status !== 'running') {
        setIsReconnecting(false)
      }
    }
  }, [])

  // Add a user message to the display
  const addUserMessage = useCallback((content: string) => {
    setMessages(prev => [...prev, { type: 'user', content }])
  }, [])

  // Reset all state
  const reset = useCallback(() => {
    setMessages([])
    setStatus('idle')
    setError(null)
    setSessionId(null)
    setIsRunning(false)
    setIsReconnecting(false)
    userScrolledRef.current = false
  }, [])

  // Toggle individual tool expansion - preserves scroll position
  const toggleToolExpanded = useCallback((blockIndex: number, toolId: string) => {
    const scrollTop = scrollRef.current?.scrollTop ?? 0
    setMessages(prev => prev.map((block, i) => {
      if (i === blockIndex && block.type === 'tool_calls' && block.toolCalls) {
        return {
          ...block,
          toolCalls: block.toolCalls.map(tc =>
            tc.id === toolId ? { ...tc, isExpanded: !tc.isExpanded } : tc
          )
        }
      }
      return block
    }))
    // Restore scroll position after state update
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollTop
      }
    })
  }, [])

  // Toggle entire tool block collapsed/expanded - preserves scroll position
  const toggleToolsCollapsed = useCallback((blockIndex: number) => {
    const scrollTop = scrollRef.current?.scrollTop ?? 0
    setMessages(prev => prev.map((block, i) => {
      if (i === blockIndex && block.type === 'tool_calls') {
        return {
          ...block,
          toolsCollapsed: !block.toolsCollapsed
        }
      }
      return block
    }))
    // Restore scroll position after state update
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollTop
      }
    })
  }, [])

  return {
    messages,
    status,
    error,
    sessionId,
    isRunning,
    isReconnecting,

    processEvent,
    processBufferedEvents,
    addUserMessage,
    setMessages,
    reset,
    setStatus,
    setError,
    setSessionId,
    setIsRunning,
    setIsReconnecting,
    finalizeAllTools,

    toggleToolExpanded,
    toggleToolsCollapsed,

    scrollRef: scrollRef as React.RefObject<HTMLDivElement>,
    userScrolledRef,
    handleScroll,
  }
}

// Helper to format tool results for display
export function formatToolResult(result: string | undefined, toolName: string): string {
  if (result === undefined) return ''
  if (result === '') return '(empty response)'

  // Try to parse as JSON for better formatting
  try {
    const parsed = JSON.parse(result)
    // Handle common tool result structures
    if (typeof parsed === 'object' && parsed !== null) {
      // WebSearch results
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.title) {
        return parsed.map((r: { title?: string; url?: string; snippet?: string }) =>
          `• ${r.title || 'No title'}\n  ${r.url || ''}\n  ${r.snippet || ''}`
        ).join('\n\n')
      }
      // Grep/Glob file results
      if (Array.isArray(parsed) && parsed.every((f: unknown) => typeof f === 'string')) {
        return parsed.join('\n')
      }
      // Epics/slices/tickets list
      if (parsed.epics && Array.isArray(parsed.epics)) {
        return parsed.epics.map((e: { epic_id?: string; title?: string }) =>
          `• ${e.epic_id}: ${e.title || 'No title'}`
        ).join('\n')
      }
      if (parsed.slices && Array.isArray(parsed.slices)) {
        return parsed.slices.map((s: { slice_id?: string; title?: string }) =>
          `• ${s.slice_id}: ${s.title || 'No title'}`
        ).join('\n')
      }
      if (parsed.tickets && Array.isArray(parsed.tickets)) {
        return parsed.tickets.map((t: { ticket_id?: string; title?: string; status?: string }) =>
          `• ${t.ticket_id}: ${t.title || 'No title'} [${t.status || 'unknown'}]`
        ).join('\n')
      }
      // Success message
      if (parsed.message) {
        return parsed.message
      }
      // Generic object - pretty print
      return JSON.stringify(parsed, null, 2)
    }
  } catch {
    // Not JSON, return as-is
  }

  // Truncate long results
  if (result.length > 2000) {
    return result.slice(0, 2000) + '\n\n... (truncated)'
  }
  return result
}
