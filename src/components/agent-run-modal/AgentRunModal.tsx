"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { X, Loader2, Terminal, MessageSquare, AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Circle, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  streamAgentRunStructured,
  reconnectAgentStream,
  getAgentTypeInfo,
  type AgentType,
  type StreamEvent,
  type ToolResultEvent,
} from '@/lib/api/agents'
import { Ticket } from '@/lib/types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface AgentRunModalProps {
  isOpen: boolean
  onClose: () => void
  ticket: Ticket | null
  agentType: AgentType | null
  previousSessionId?: string
  reconnectSessionId?: string  // Session ID to reconnect to (for page refresh recovery)
  autoStart?: boolean  // Only start agent if explicitly requested
  onStart?: () => void
  onComplete?: () => void
}

interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
  result?: string
  isError?: boolean
  isExpanded: boolean
  status: 'pending' | 'running' | 'completed' | 'error'
}

interface MessageBlock {
  type: 'text' | 'tool_calls' | 'thinking' | 'status'
  content?: string
  toolCalls?: ToolCall[]
  status?: string
  message?: string
  toolsCollapsed?: boolean  // Track collapsed state for tool_calls blocks
}

// Helper to format tool results for display
function formatToolResult(result: string | undefined, toolName: string): string {
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
      // Generic object - pretty print
      return JSON.stringify(parsed, null, 2)
    }
  } catch {
    // Not JSON, return as-is
  }

  return result
}

export function AgentRunModal({
  isOpen,
  onClose,
  ticket,
  agentType,
  previousSessionId,
  reconnectSessionId,
  autoStart = false,
  onStart,
  onComplete,
}: AgentRunModalProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [messages, setMessages] = useState<MessageBlock[]>([])
  const [currentStatus, setCurrentStatus] = useState<string>('idle')
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const hasStartedRef = useRef(false)
  const hasReconnectedRef = useRef(false)
  const hasCompletedRef = useRef(false)
  const userScrolledRef = useRef(false)
  const lastScrollTopRef = useRef(0)

  // Track user scroll to avoid auto-scrolling when user is reading
  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      userScrolledRef.current = !isNearBottom
      lastScrollTopRef.current = scrollTop
    }
  }, [])

  // Auto-scroll to bottom only if user hasn't scrolled away
  useEffect(() => {
    if (scrollRef.current && !userScrolledRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Only auto-start when explicitly requested via autoStart prop
  // This prevents re-runs during hot reload or when reopening modal
  // IMPORTANT: Don't start if we have a reconnectSessionId - that means we're reconnecting, not starting fresh
  useEffect(() => {
    if (isOpen && autoStart && ticket && agentType && !isRunning && !hasStartedRef.current && !reconnectSessionId) {
      hasStartedRef.current = true
      startAgent()
    }
  }, [isOpen, autoStart, ticket, agentType, reconnectSessionId])

  // Handle reconnection when reconnectSessionId is provided
  useEffect(() => {
    if (isOpen && reconnectSessionId && !isReconnecting && !hasReconnectedRef.current) {
      hasReconnectedRef.current = true
      reconnectToAgent(reconnectSessionId)
    }
  }, [isOpen, reconnectSessionId])

  // Reset refs when modal closes so next open works correctly
  useEffect(() => {
    if (!isOpen) {
      hasStartedRef.current = false
      hasReconnectedRef.current = false
    }
  }, [isOpen])

  // Helper to finalize all running tools - called on completion or result event
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

  // Reconnect to an existing agent run to fetch stored output
  const reconnectToAgent = async (sessionId: string) => {
    setIsReconnecting(true)
    setMessages([])
    setError(null)
    setCurrentStatus('reconnecting')
    userScrolledRef.current = false
    hasCompletedRef.current = false

    // Add a status message to show we're reconnecting
    setMessages([{
      type: 'status',
      status: 'reconnecting',
      message: 'Reconnecting to agent run...'
    }])

    await reconnectAgentStream(
      sessionId,
      (event: StreamEvent) => {
        switch (event.type) {
          case 'text':
            setMessages(prev => {
              // Remove the reconnecting status message and add text
              const filtered = prev.filter(b => b.status !== 'reconnecting')
              const last = filtered[filtered.length - 1]
              if (last?.type === 'text') {
                return [
                  ...filtered.slice(0, -1),
                  { ...last, content: (last.content || '') + event.content }
                ]
              }
              return [...filtered, { type: 'text', content: event.content }]
            })
            break

          case 'tool_use':
            const toolCall: ToolCall = {
              id: event.id,
              name: event.name,
              input: event.input,
              isExpanded: false,
              status: 'completed', // Mark as completed since we're replaying
            }
            setMessages(prev => {
              const filtered = prev.filter(b => b.status !== 'reconnecting')
              const last = filtered[filtered.length - 1]
              if (last?.type === 'tool_calls') {
                return [
                  ...filtered.slice(0, -1),
                  { ...last, toolCalls: [...(last.toolCalls || []), toolCall], toolsCollapsed: true }
                ]
              }
              return [...filtered, { type: 'tool_calls', toolCalls: [toolCall], toolsCollapsed: true }]
            })
            break

          case 'tool_result':
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

          case 'thinking':
            setMessages(prev => {
              const filtered = prev.filter(b => b.status !== 'reconnecting')
              return [...filtered, { type: 'thinking', content: event.content }]
            })
            break

          case 'status':
            setCurrentStatus(event.status)
            // Only show status messages for non-running states (and not reconnecting)
            // Running state is indicated by the header loader, not a message
            if (event.message && event.status !== 'reconnecting' && event.status !== 'running') {
              setMessages(prev => [...prev, { type: 'status', status: event.status, message: event.message }])
            }
            break

          case 'result':
            setCurrentStatus(event.is_error ? 'failed' : 'completed')
            setIsReconnecting(false)
            if (!hasCompletedRef.current) {
              hasCompletedRef.current = true
              onComplete?.()
            }
            break
        }
      },
      () => {
        setIsReconnecting(false)
        if (currentStatus === 'running') {
          // Agent is still running - show loader in the content area
          // The header already shows "Running..." so no need for a separate message
          // Just clear the reconnecting status and let the running state speak for itself
          setMessages(prev => prev.filter(b => b.status !== 'reconnecting'))
        } else if (!hasCompletedRef.current) {
          hasCompletedRef.current = true
          setCurrentStatus('completed')
          onComplete?.()
        }
      },
      (err) => {
        setIsReconnecting(false)
        setError(err.message)
        setCurrentStatus('failed')
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true
          onComplete?.()
        }
      }
    )
  }

  const startAgent = async () => {
    if (!ticket || !agentType) return

    setIsRunning(true)
    setMessages([])
    setError(null)
    setCurrentStatus('starting')
    userScrolledRef.current = false
    hasCompletedRef.current = false
    onStart?.()

    await streamAgentRunStructured(
      ticket.epic_id,
      ticket.slice_id,
      ticket.ticket_id,
      agentType,
      previousSessionId,
      (event: StreamEvent) => {
        // Helper to mark all running tools as completed (tool results aren't streamed from CLI)
        const markToolsCompleted = (blocks: MessageBlock[]): MessageBlock[] => {
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
        }

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

          case 'tool_use':
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
                return [
                  ...updated.slice(0, -1),
                  { ...last, toolCalls: [...(last.toolCalls || []), toolCall], toolsCollapsed: true }
                ]
              }
              return [...updated, { type: 'tool_calls', toolCalls: [toolCall], toolsCollapsed: true }]
            })
            break

          case 'tool_result':
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

          case 'thinking':
            setMessages(prev => [...prev, { type: 'thinking', content: event.content }])
            break

          case 'status':
            setCurrentStatus(event.status)
            if (event.message) {
              setMessages(prev => [...prev, { type: 'status', status: event.status, message: event.message }])
            }
            break

          case 'result':
            // Finalize all tools when result is received
            finalizeAllTools()
            setCurrentStatus(event.is_error ? 'failed' : 'completed')
            setIsRunning(false)
            if (!hasCompletedRef.current) {
              hasCompletedRef.current = true
              onComplete?.()
            }
            break
        }
      },
      () => {
        // Stream complete - ensure all tools are finalized
        finalizeAllTools()
        setIsRunning(false)
        setCurrentStatus('completed')
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true
          onComplete?.()
        }
      },
      (err) => {
        finalizeAllTools()
        setIsRunning(false)
        setError(err.message)
        setCurrentStatus('failed')
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true
          onComplete?.()
        }
      }
    )
  }

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

  const agentInfo = agentType ? getAgentTypeInfo(agentType) : null

  // Determine the final status for display
  const displayStatus = isRunning ? 'running' : isReconnecting ? 'reconnecting' : currentStatus

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0 [&>button]:hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {agentInfo && (
                <span className={cn("font-semibold shrink-0", agentInfo.color)}>
                  {agentInfo.label} Agent
                </span>
              )}
              {displayStatus === 'running' && (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Running...
                </span>
              )}
              {displayStatus === 'reconnecting' && (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Reconnecting...
                </span>
              )}
              {displayStatus === 'completed' && (
                <span className="flex items-center gap-1.5 text-sm text-green-500 shrink-0">
                  <CheckCircle2 className="h-3 w-3" />
                  Completed
                </span>
              )}
              {displayStatus === 'failed' && (
                <span className="flex items-center gap-1.5 text-sm text-red-500 shrink-0">
                  <AlertCircle className="h-3 w-3" />
                  Failed
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <DialogTitle className="text-sm font-mono text-muted-foreground">
                {ticket?.ticket_id}
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </div>
          {ticket && (
            <p className="text-sm text-muted-foreground mt-1 truncate">
              {ticket.title}
            </p>
          )}
        </DialogHeader>

        {/* Content */}
        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (isRunning || isReconnecting || currentStatus === 'running') && (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              {isReconnecting ? 'Loading agent output...' : 'Waiting for agent output...'}
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500">
              <div className="flex items-center gap-2 font-medium">
                <AlertCircle className="h-4 w-4" />
                Error
              </div>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          )}

          {messages.map((block, blockIndex) => (
            <div key={blockIndex}>
              {block.type === 'text' && block.content && (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-4 w-4 mt-1 text-blue-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-lg font-semibold mt-3 mb-2">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-base font-medium mt-2 mb-1">{children}</h3>,
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                          li: ({ children }) => <li className="text-sm">{children}</li>,
                          code: ({ className, children }) => {
                            const isInline = !className
                            return isInline ? (
                              <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono">{children}</code>
                            ) : (
                              <code className="block bg-muted p-3 rounded text-sm font-mono overflow-x-auto my-2">{children}</code>
                            )
                          },
                          pre: ({ children }) => <pre className="bg-muted p-3 rounded overflow-x-auto my-2">{children}</pre>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          a: ({ href, children }) => <a href={href} className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                          blockquote: ({ children }) => <blockquote className="border-l-2 border-muted-foreground/30 pl-3 italic my-2">{children}</blockquote>,
                        }}
                      >
                        {block.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}

              {block.type === 'tool_calls' && block.toolCalls && (
                <div className="space-y-2">
                  {/* Collapsible toggle for entire tool block */}
                  <button
                    onClick={() => toggleToolsCollapsed(blockIndex)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                  >
                    {block.toolsCollapsed ? (
                      <ChevronRight className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    <Wrench className="h-4 w-4" />
                    <span>
                      {block.toolsCollapsed ? 'Show' : 'Hide'} tool calls ({block.toolCalls.length})
                    </span>
                    {/* Show status summary when collapsed */}
                    {block.toolsCollapsed && (
                      <span className="ml-2 flex items-center gap-1">
                        {block.toolCalls.some(t => t.status === 'running') && (
                          <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                        )}
                        {block.toolCalls.some(t => t.status === 'error') && (
                          <AlertCircle className="h-3 w-3 text-red-500" />
                        )}
                        {block.toolCalls.every(t => t.status === 'completed') && (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        )}
                      </span>
                    )}
                  </button>

                  {/* Individual tool calls - only shown when not collapsed */}
                  {!block.toolsCollapsed && block.toolCalls.map((tool) => (
                    <div
                      key={tool.id}
                      className={cn(
                        "border rounded-lg overflow-hidden transition-colors ml-6",
                        tool.status === 'running' ? "border-blue-500/50 bg-blue-500/5" :
                        tool.status === 'error' ? "border-red-500/30" :
                        tool.status === 'completed' ? "border-border" : "border-border"
                      )}
                    >
                      {/* Tool header */}
                      <button
                        onClick={() => toggleToolExpanded(blockIndex, tool.id)}
                        className={cn(
                          "w-full px-3 py-2 flex items-center gap-2 hover:bg-muted/70 transition-colors",
                          tool.status === 'running' ? "bg-blue-500/10" : "bg-muted/50"
                        )}
                      >
                        {tool.isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        {/* Status indicator */}
                        {tool.status === 'running' && (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500 shrink-0" />
                        )}
                        {tool.status === 'completed' && (
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        )}
                        {tool.status === 'error' && (
                          <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                        )}
                        {tool.status === 'pending' && (
                          <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <Terminal className="h-4 w-4 text-purple-500 shrink-0" />
                        <span className="font-mono text-sm font-medium truncate">{tool.name}</span>
                        {/* Right side status text */}
                        <span className={cn(
                          "ml-auto text-xs shrink-0",
                          tool.status === 'running' ? "text-blue-500" :
                          tool.status === 'error' ? "text-red-500" :
                          tool.status === 'completed' ? "text-green-500" : "text-muted-foreground"
                        )}>
                          {tool.status === 'running' && 'Running...'}
                          {tool.status === 'completed' && 'Done'}
                          {tool.status === 'error' && 'Error'}
                          {tool.status === 'pending' && 'Pending'}
                        </span>
                      </button>

                      {/* Tool details */}
                      {tool.isExpanded && (
                        <div className="border-t border-border">
                          {/* Input */}
                          <div className="p-3 border-b border-border">
                            <div className="text-xs font-medium text-muted-foreground mb-1">Input</div>
                            <pre className="text-xs bg-muted/30 p-2 rounded overflow-x-auto max-h-48">
                              {JSON.stringify(tool.input, null, 2)}
                            </pre>
                          </div>

                          {/* Result */}
                          <div className="p-3">
                            <div className={cn(
                              "text-xs font-medium mb-1",
                              tool.status === 'error' ? "text-red-500" :
                              tool.status === 'running' ? "text-blue-500" : "text-muted-foreground"
                            )}>
                              {tool.status === 'error' ? 'Error' :
                               tool.status === 'running' ? 'Output' : 'Result'}
                            </div>
                            {tool.status === 'running' && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Executing...
                              </div>
                            )}
                            {tool.result !== undefined && (
                              <pre className={cn(
                                "text-xs p-2 rounded overflow-x-auto max-h-64 whitespace-pre-wrap break-words",
                                tool.status === 'error' ? "bg-red-500/10" : "bg-muted/30"
                              )}>
                                {formatToolResult(tool.result, tool.name)}
                              </pre>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {block.type === 'thinking' && block.content && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="text-xs font-medium text-yellow-600 dark:text-yellow-400 mb-1">
                    Thinking
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {block.content}
                  </p>
                </div>
              )}

              {block.type === 'status' && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="h-px flex-1 bg-border" />
                  <span>{block.message || block.status}</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border shrink-0 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isRunning || isReconnecting}
          >
            {isRunning ? 'Running...' : isReconnecting ? 'Loading...' : 'Close'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
