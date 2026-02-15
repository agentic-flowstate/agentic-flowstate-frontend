"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { X, Loader2, AlertCircle, CheckCircle2, Mail, Send, FileText, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  streamAgentRunStructured,
  reconnectAgentStream,
  sendMessageToAgent,
  getAgentTypeInfo,
  getAgentTypeDisplayInfo,
  createDraft,
  type AgentType,
  type AgentRun,
  type StreamEvent,
  type ReplayCompleteEvent,
} from '@/lib/api/agents'
import { Ticket } from '@/lib/types'
import { useAgentStream, type MessageBlock } from '@/hooks/useAgentStream'
import { MessageRenderer } from '@/components/message-renderer'
import { updateTicketGuidance } from '@/lib/api/tickets'

interface AgentRunModalProps {
  isOpen: boolean
  onClose: () => void
  ticket: Ticket | null
  agentType: AgentType | null
  previousSessionId?: string
  reconnectSessionId?: string  // Session ID to reconnect to (for page refresh recovery)
  autoStart?: boolean  // Only start agent if explicitly requested
  onStart?: () => void
  onComplete?: (outputSummary?: string) => void
  agentRuns?: AgentRun[]  // For email agent: available runs to select as context
  onTicketUpdate?: (ticket: Ticket) => void  // For ticket-assistant: auto-save guidance
  stepId?: string  // Pipeline step ID for pipeline-aware streaming
}

// Parse structured email from agent text output
interface ParsedEmail {
  to: string
  cc?: string
  subject: string
  body: string
  notes?: string
}

function parseEmailFromText(text: string): ParsedEmail | null {
  // Look for <email> tags
  const emailMatch = text.match(/<email>([\s\S]*?)<\/email>/i)
  if (!emailMatch) return null

  const emailContent = emailMatch[1]

  // Extract to (required)
  const toMatch = emailContent.match(/<to>([\s\S]*?)<\/to>/i)
  if (!toMatch) return null

  // Extract cc (optional)
  const ccMatch = emailContent.match(/<cc>([\s\S]*?)<\/cc>/i)

  // Extract subject
  const subjectMatch = emailContent.match(/<subject>([\s\S]*?)<\/subject>/i)
  if (!subjectMatch) return null

  // Extract body
  const bodyMatch = emailContent.match(/<body>([\s\S]*?)<\/body>/i)
  if (!bodyMatch) return null

  // Extract notes (optional, outside email tag)
  const notesMatch = text.match(/<notes>([\s\S]*?)<\/notes>/i)

  return {
    to: toMatch[1].trim(),
    cc: ccMatch ? ccMatch[1].trim() : undefined,
    subject: subjectMatch[1].trim(),
    body: bodyMatch[1].trim(),
    notes: notesMatch ? notesMatch[1].trim() : undefined,
  }
}

// Email display component with save as draft button
function EmailDisplay({
  email,
  onSaveDraft,
  isSaving,
  isSaved
}: {
  email: ParsedEmail
  onSaveDraft?: () => void
  isSaving?: boolean
  isSaved?: boolean
}) {
  return (
    <div className="space-y-4">
      {/* Save as Draft button */}
      {onSaveDraft && (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant={isSaved ? "default" : "outline"}
            onClick={onSaveDraft}
            disabled={isSaving || isSaved}
            className={cn("gap-2", isSaved && "bg-green-600 hover:bg-green-600 text-white")}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isSaved ? (
              <Check className="h-4 w-4" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            {isSaving ? 'Saving...' : isSaved ? 'Saved to Drafts' : 'Save as Draft'}
          </Button>
        </div>
      )}

      {/* To */}
      <div className="bg-muted/50 rounded-lg p-4 border border-border">
        <div className="text-xs font-medium text-muted-foreground mb-1">TO</div>
        <div className="text-sm font-medium text-foreground">{email.to}</div>
      </div>

      {/* CC */}
      {email.cc && (
        <div className="bg-muted/50 rounded-lg p-4 border border-border">
          <div className="text-xs font-medium text-muted-foreground mb-1">CC</div>
          <div className="text-sm text-foreground">{email.cc}</div>
        </div>
      )}

      {/* Subject */}
      <div className="bg-muted/50 rounded-lg p-4 border border-border">
        <div className="text-xs font-medium text-muted-foreground mb-1">SUBJECT</div>
        <div className="text-sm font-medium text-foreground">{email.subject}</div>
      </div>

      {/* Body */}
      <div className="bg-muted/50 rounded-lg p-4 border border-border">
        <div className="text-xs font-medium text-muted-foreground mb-2">BODY</div>
        <div className="text-sm text-foreground whitespace-pre-wrap">{email.body}</div>
      </div>

      {/* Notes */}
      {email.notes && (
        <div className="bg-cyan-500/10 rounded-lg p-4 border border-cyan-500/20">
          <div className="text-xs font-medium text-cyan-500 mb-1">NOTES</div>
          <div className="text-sm text-muted-foreground">{email.notes}</div>
        </div>
      )}
    </div>
  )
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
  agentRuns = [],
  onTicketUpdate,
  stepId,
}: AgentRunModalProps) {
  // Use the shared hook
  const {
    messages,
    status,
    error,
    sessionId,
    isRunning,
    isReconnecting,
    processEvent,
    processBufferedEvents,
    addUserMessage,
    reset,
    setStatus,
    setError,
    setSessionId,
    setIsRunning,
    setIsReconnecting,
    finalizeAllTools,
    toggleToolExpanded,
    toggleToolsCollapsed,
    scrollRef,
    userScrolledRef,
    handleScroll,
  } = useAgentStream()

  const hasStartedRef = useRef(false)
  const hasReconnectedRef = useRef(false)
  const hasCompletedRef = useRef(false)
  const outputTextRef = useRef<string>('')

  // Email agent specific state
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [savedEmailKeys, setSavedEmailKeys] = useState<Set<string>>(new Set())

  // Completed runs available for context selection (email agent)
  const completedRuns = agentRuns.filter(run => run.status === 'completed' && run.agent_type !== 'email')

  // Check if email agent has completed initial generation (for showing chat input)
  const isEmailAgent = agentType === 'email'
  const isTicketAssistant = agentType === 'ticket-assistant'
  const isDocManager = agentType === 'doc-manager'
  const isPipelineEditor = agentType === 'pipeline-editor'
  const isInteractiveAgent = isTicketAssistant || isDocManager || isPipelineEditor
  const hasCompletedInitialGeneration = isEmailAgent && status === 'completed' && messages.length > 0
  const hasTicketAssistantCompleted = isTicketAssistant && status === 'completed' && messages.length > 0
  const hasDocManagerCompleted = isDocManager && status === 'completed' && messages.length > 0
  const hasPipelineEditorCompleted = isPipelineEditor && status === 'completed' && messages.length > 0
  const hasInteractiveAgentCompleted = hasTicketAssistantCompleted || hasDocManagerCompleted || hasPipelineEditorCompleted

  // Track custom input for ticket-assistant
  const [ticketAssistantInput, setTicketAssistantInput] = useState('')
  const [isSavingGuidance, setIsSavingGuidance] = useState(false)

  // Auto-scroll to bottom only if user hasn't scrolled away
  useEffect(() => {
    if (scrollRef.current && !userScrolledRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, scrollRef, userScrolledRef])

  // Only auto-start when explicitly requested via autoStart prop
  useEffect(() => {
    if (isOpen && autoStart && ticket && agentType && !isRunning && !hasStartedRef.current && !reconnectSessionId) {
      hasStartedRef.current = true
      startAgent()
    }
  }, [isOpen, autoStart, ticket, agentType, reconnectSessionId, isRunning])

  // Handle reconnection when reconnectSessionId is provided
  useEffect(() => {
    if (isOpen && reconnectSessionId && !isReconnecting && !hasReconnectedRef.current) {
      hasReconnectedRef.current = true
      reconnectToAgent(reconnectSessionId)
    }
  }, [isOpen, reconnectSessionId, isReconnecting])

  // Reset refs and email state when modal closes
  useEffect(() => {
    if (!isOpen) {
      hasStartedRef.current = false
      hasReconnectedRef.current = false
      hasCompletedRef.current = false
      setSelectedSessionIds([])
      setChatInput('')
      setTicketAssistantInput('')
      setSavedEmailKeys(new Set())
    }
  }, [isOpen])

  // Reset stream state when modal opens for a fresh session (not a reconnect)
  useEffect(() => {
    if (isOpen && !reconnectSessionId) {
      reset()
    }
  }, [isOpen, reconnectSessionId, reset])

  // Toggle session selection for context (email agent)
  const toggleSessionSelection = useCallback((sid: string) => {
    setSelectedSessionIds(prev =>
      prev.includes(sid)
        ? prev.filter(id => id !== sid)
        : [...prev, sid]
    )
  }, [])

  // Generate a unique key for an email to track if it's been saved
  const getEmailKey = useCallback((email: ParsedEmail) => {
    return `${email.to}|${email.subject}|${email.body.slice(0, 100)}`
  }, [])

  // Save current email as draft
  const handleSaveDraft = useCallback(async (email: ParsedEmail) => {
    if (!ticket) return

    const emailKey = getEmailKey(email)
    setIsSavingDraft(true)
    try {
      const sid = sessionId || reconnectSessionId
      await createDraft({
        session_id: sid ?? undefined,
        ticket_id: ticket.ticket_id,
        epic_id: ticket.epic_id,
        slice_id: ticket.slice_id,
        to_address: email.to,
        cc_address: email.cc,
        subject: email.subject,
        body: email.body,
        notes: email.notes,
      })
      setSavedEmailKeys(prev => new Set(prev).add(emailKey))
    } catch (err) {
      console.error('Failed to save draft:', err)
    } finally {
      setIsSavingDraft(false)
    }
  }, [ticket, sessionId, reconnectSessionId, getEmailKey])

  // Reconnect to an existing agent run to fetch stored output
  const reconnectToAgent = async (sid: string) => {
    setIsReconnecting(true)
    reset()
    setStatus('reconnecting')
    userScrolledRef.current = false
    hasCompletedRef.current = false

    // Buffer events until we receive replay_complete
    const eventBuffer: StreamEvent[] = []
    let replayComplete: ReplayCompleteEvent | null = null

    await reconnectAgentStream(
      sid,
      (event: StreamEvent) => {
        if (event.type === 'replay_complete') {
          replayComplete = event as ReplayCompleteEvent
          processBufferedEvents(eventBuffer, replayComplete)
        } else if (replayComplete) {
          // After replay_complete, process events immediately (live events)
          processEvent(event)
        } else {
          // Before replay_complete, buffer all events
          eventBuffer.push(event)
        }
      },
      () => {
        setIsReconnecting(false)
        // If we never got replay_complete (old backend), process buffered events now
        if (!replayComplete && eventBuffer.length > 0) {
          processBufferedEvents(eventBuffer, null)
        }
        if (!hasCompletedRef.current && status !== 'running') {
          hasCompletedRef.current = true
          setStatus('completed')
          onComplete?.()
        }
      },
      (err) => {
        setIsReconnecting(false)
        setError(err.message)
        setStatus('failed')
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true
          onComplete?.()
        }
      }
    )
  }

  // Auto-save guidance when ticket-assistant completes
  const saveGuidanceToTicket = useCallback(async (guidance: string) => {
    if (!ticket || !onTicketUpdate) return
    setIsSavingGuidance(true)
    try {
      const updated = await updateTicketGuidance(ticket.ticket_id, guidance)
      onTicketUpdate(updated)
    } catch (error) {
      console.error('Failed to save guidance:', error)
    } finally {
      setIsSavingGuidance(false)
    }
  }, [ticket, onTicketUpdate])

  const startAgent = async (customMessage?: string) => {
    if (!ticket || !agentType) return

    setIsRunning(true)
    reset()
    setStatus('starting')
    userScrolledRef.current = false
    hasCompletedRef.current = false
    outputTextRef.current = ''
    onStart?.()

    // For ticket-assistant, add user message to display
    if (isTicketAssistant && customMessage) {
      addUserMessage(customMessage)
    }

    await streamAgentRunStructured(
      ticket.epic_id,
      ticket.slice_id,
      ticket.ticket_id,
      agentType,
      previousSessionId,
      (event: StreamEvent) => {
        // Capture session ID from result event for follow-up messages
        if (event.type === 'result' && 'session_id' in event) {
          setSessionId(event.session_id)
        }

        // Capture text output for ticket-assistant
        if (event.type === 'text' && 'content' in event) {
          outputTextRef.current += event.content
        }

        processEvent(event)

        // Handle completion
        if (event.type === 'result') {
          setIsRunning(false)
          if (!hasCompletedRef.current) {
            hasCompletedRef.current = true
            // Auto-save guidance for ticket-assistant
            if (isTicketAssistant && outputTextRef.current) {
              saveGuidanceToTicket(outputTextRef.current)
            }
            onComplete?.(outputTextRef.current || undefined)
          }
        }
      },
      () => {
        finalizeAllTools()
        setIsRunning(false)
        setStatus('completed')
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true
          // Auto-save guidance for ticket-assistant
          if (isTicketAssistant && outputTextRef.current) {
            saveGuidanceToTicket(outputTextRef.current)
          }
          onComplete?.(outputTextRef.current || undefined)
        }
      },
      (err) => {
        finalizeAllTools()
        setIsRunning(false)
        setError(err.message)
        setStatus('failed')
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true
          onComplete?.()
        }
      },
      isEmailAgent ? selectedSessionIds : undefined,
      customMessage || undefined,
      stepId
    )
  }

  // Start ticket-assistant with the user's question
  const handleTicketAssistantStart = () => {
    if (!ticketAssistantInput.trim()) return
    const question = ticketAssistantInput.trim()
    setTicketAssistantInput('')
    startAgent(question)
  }

  // Send follow-up to interactive agent (ticket-assistant, doc-manager) — reuses existing session
  const handleTicketAssistantFollowUp = async () => {
    const sid = sessionId || reconnectSessionId
    if (!sid || !ticketAssistantInput.trim() || isSendingMessage) return

    const messageText = ticketAssistantInput.trim()
    setTicketAssistantInput('')
    setIsSendingMessage(true)
    setStatus('running')
    outputTextRef.current = ''

    // Add user message to display
    addUserMessage(messageText)

    await sendMessageToAgent(
      sid,
      messageText,
      (event: StreamEvent) => {
        // Capture text output
        if (event.type === 'text' && 'content' in event) {
          outputTextRef.current += event.content
        }
        processEvent(event)
      },
      () => {
        finalizeAllTools()
        setIsSendingMessage(false)
        setStatus('completed')
        // Auto-save the follow-up response (ticket-assistant only)
        if (isTicketAssistant && outputTextRef.current) {
          saveGuidanceToTicket(outputTextRef.current)
        }
      },
      (err) => {
        finalizeAllTools()
        setIsSendingMessage(false)
        setError(err.message)
        setStatus('failed')
      }
    )
  }

  // Send follow-up message to refine email (email agent only)
  const handleSendMessage = async () => {
    const sid = sessionId || reconnectSessionId
    if (!sid || !chatInput.trim() || isSendingMessage) return

    const messageText = chatInput.trim()
    setChatInput('')
    setIsSendingMessage(true)
    setStatus('running')

    // Add user message to display
    addUserMessage(messageText)

    await sendMessageToAgent(
      sid,
      messageText,
      (event: StreamEvent) => {
        processEvent(event)
      },
      () => {
        finalizeAllTools()
        setIsSendingMessage(false)
        setStatus('completed')
      },
      (err) => {
        finalizeAllTools()
        setIsSendingMessage(false)
        setError(err.message)
        setStatus('failed')
      }
    )
  }

  const agentInfo = agentType ? getAgentTypeInfo(agentType) : null

  // Determine the final status for display
  const displayStatus = isRunning ? 'running' : isReconnecting ? 'reconnecting' : status

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[80vh] max-md:h-[100dvh] max-md:max-h-[100dvh] max-md:w-full max-md:max-w-full max-md:rounded-none max-md:translate-y-0 max-md:top-0 flex flex-col p-0 gap-0 [&>button]:hidden">
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

        {/* Initial question input for ticket-assistant - shown before agent starts */}
        {isTicketAssistant && !isRunning && !isReconnecting && status === 'idle' && !reconnectSessionId && (
          <div className="px-6 py-4 border-b border-border shrink-0 bg-muted/30">
            <div className="flex items-center gap-2 mb-3">
              <Send className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium">Ask a question about this ticket</span>
            </div>
            <Textarea
              value={ticketAssistantInput}
              onChange={(e) => setTicketAssistantInput(e.target.value)}
              placeholder="What do I need to start this task? What are the steps involved?"
              className="min-h-[80px] max-h-[150px] resize-none mb-3"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleTicketAssistantStart()
                }
              }}
            />
            <Button
              className="w-full bg-emerald-500 hover:bg-emerald-600"
              onClick={handleTicketAssistantStart}
              disabled={!ticketAssistantInput.trim()}
            >
              <Send className="h-4 w-4 mr-2" />
              Ask Assistant
            </Button>
          </div>
        )}

        {/* Context selector for email agent - shown before agent starts */}
        {isEmailAgent && !isRunning && !isReconnecting && status === 'idle' && (
          <div className="px-6 py-4 border-b border-border shrink-0 bg-muted/30">
            {completedRuns.length > 0 ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <Mail className="h-4 w-4 text-cyan-500" />
                  <span className="text-sm font-medium">Include context from previous agents</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {completedRuns.map((run) => {
                    const displayInfo = getAgentTypeDisplayInfo(run.agent_type)
                    const isSelected = selectedSessionIds.includes(run.session_id)
                    return (
                      <Badge
                        key={run.session_id}
                        variant={isSelected ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer transition-colors",
                          isSelected && "bg-cyan-500 hover:bg-cyan-600"
                        )}
                        onClick={() => toggleSessionSelection(run.session_id)}
                      >
                        <span className={cn(!isSelected && displayInfo.color)}>
                          {displayInfo.label}
                        </span>
                        <span className="ml-1.5 text-[10px] opacity-70">
                          {new Date(run.started_at).toLocaleDateString()}
                        </span>
                      </Badge>
                    )
                  })}
                </div>
                {selectedSessionIds.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {selectedSessionIds.length} context{selectedSessionIds.length > 1 ? 's' : ''} selected
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No completed research to include. The email will be generated based on the ticket intent only.
              </p>
            )}
            <Button
              className="mt-4 w-full bg-cyan-500 hover:bg-cyan-600"
              onClick={() => startAgent()}
            >
              <Send className="h-4 w-4 mr-2" />
              Generate Email
            </Button>
          </div>
        )}

        {/* Content */}
        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-4">
          {messages.length === 0 && (isRunning || isReconnecting || status === 'running') && (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              {isReconnecting ? 'Loading agent output...' : 'Waiting for agent output...'}
            </div>
          )}

          {messages.length === 0 && !isRunning && !isReconnecting && !reconnectSessionId && status !== 'running' && status !== 'idle' && status !== 'starting' && !error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500">
              <div className="flex items-center gap-2 font-medium">
                <AlertCircle className="h-4 w-4" />
                Failed to Load Agent Output
              </div>
              <p className="mt-1 text-sm">No events were received from the server. Check browser console for debug logs.</p>
              <p className="mt-2 text-xs font-mono bg-red-500/10 p-2 rounded">
                Status: {status} | Session: {reconnectSessionId || 'none'}
              </p>
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

          <MessageRenderer
            messages={messages}
            onToggleToolExpanded={toggleToolExpanded}
            onToggleToolsCollapsed={toggleToolsCollapsed}
            isLoading={isRunning || isReconnecting}
            loadingMessage={isReconnecting ? 'Loading agent output...' : 'Waiting for agent output...'}
            renderTextBlock={isEmailAgent ? (block: MessageBlock) => {
              if (!block.content) return null
              const parsedEmail = parseEmailFromText(block.content)
              if (parsedEmail) {
                const emailKey = getEmailKey(parsedEmail)
                return (
                  <EmailDisplay
                    email={parsedEmail}
                    onSaveDraft={() => handleSaveDraft(parsedEmail)}
                    isSaving={isSavingDraft}
                    isSaved={savedEmailKeys.has(emailKey)}
                  />
                )
              }
              return null // Use default rendering
            } : undefined}
          />
        </div>

        {/* Chat input for email agent follow-up messages */}
        {isEmailAgent && (hasCompletedInitialGeneration || status === 'completed') && (
          <div className="px-6 py-4 border-t border-border shrink-0 bg-background">
            <div className="flex gap-2">
              <Textarea
                ref={chatInputRef}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Refine the email... (e.g., 'Make it more formal')"
                className="min-h-[60px] max-h-[120px] resize-none"
                disabled={isSendingMessage || isRunning}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
              />
              <Button
                size="icon"
                className="h-[60px] w-[60px] shrink-0"
                onClick={handleSendMessage}
                disabled={!chatInput.trim() || isSendingMessage || isRunning}
              >
                {isSendingMessage ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Chat input for interactive agent follow-up questions (ticket-assistant, doc-manager) */}
        {isInteractiveAgent && (hasInteractiveAgentCompleted || (status === 'completed' && messages.length > 0)) && (
          <div className="px-6 py-4 border-t border-border shrink-0 bg-background">
            {isTicketAssistant && isSavingGuidance && (
              <div className="flex items-center gap-2 text-xs text-emerald-500 mb-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving to ticket...
              </div>
            )}
            <div className="flex gap-2">
              <Textarea
                value={ticketAssistantInput}
                onChange={(e) => setTicketAssistantInput(e.target.value)}
                placeholder={isDocManager ? "Ask about the docs, request changes..." : isPipelineEditor ? "Request pipeline changes..." : "Ask a follow-up question..."}
                className="min-h-[60px] max-h-[120px] resize-none"
                disabled={isSendingMessage || isRunning}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleTicketAssistantFollowUp()
                  }
                }}
              />
              <Button
                size="icon"
                className={cn("h-[60px] w-[60px] shrink-0", isDocManager ? "bg-blue-500 hover:bg-blue-600" : isPipelineEditor ? "bg-purple-500 hover:bg-purple-600" : "bg-emerald-500 hover:bg-emerald-600")}
                onClick={handleTicketAssistantFollowUp}
                disabled={!ticketAssistantInput.trim() || isSendingMessage || isRunning}
              >
                {isSendingMessage ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        )}

      </DialogContent>
    </Dialog>
  )
}
