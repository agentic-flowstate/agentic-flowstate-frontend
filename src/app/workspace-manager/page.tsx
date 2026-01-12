"use client"

import React, { useState, useRef, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Bot, Send, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useOrganization, Organization } from '@/contexts/organization-context'
import { useAgentStream, type MessageBlock } from '@/hooks/useAgentStream'
import { MessageRenderer } from '@/components/message-renderer'
import type { StreamEvent } from '@/lib/api/agents'
import { ConversationSidebar } from './ConversationSidebar'
import { API_BASE, ApiConversation, StoredConversation, apiToLocal } from './types'

// Inner component that uses searchParams
function WorkspaceManagerContent() {
  const { organizations } = useOrganization()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Initialize state from URL params
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(() => {
    const orgId = searchParams.get('org')
    return orgId ? organizations.find(o => o.id === orgId) || null : null
  })
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(
    searchParams.get('conv')
  )

  const [inputValue, setInputValue] = useState('')
  const [conversations, setConversations] = useState<StoredConversation[]>([])
  const [isLoadingConversations, setIsLoadingConversations] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Use the shared hook for agent streaming
  const {
    messages,
    status,
    error,
    sessionId,
    isRunning,
    processEvent,
    addUserMessage,
    setMessages,
    reset,
    setStatus,
    setError,
    setSessionId,
    setIsRunning,
    finalizeAllTools,
    toggleToolExpanded,
    toggleToolsCollapsed,
    scrollRef,
    userScrolledRef,
    handleScroll,
  } = useAgentStream()

  // Sync URL when state changes
  useEffect(() => {
    const params = new URLSearchParams()
    if (selectedOrg) params.set('org', selectedOrg.id)
    if (currentConversationId) params.set('conv', currentConversationId)
    const newUrl = params.toString() ? `?${params.toString()}` : '/workspace-manager'
    router.replace(newUrl, { scroll: false })
  }, [selectedOrg, currentConversationId, router])

  // Initialize org from URL when organizations load
  useEffect(() => {
    if (organizations.length === 0) return
    const orgId = searchParams.get('org')
    if (orgId && !selectedOrg) {
      const org = organizations.find(o => o.id === orgId)
      if (org) setSelectedOrg(org)
    }
  }, [organizations, searchParams, selectedOrg])

  // Load conversation from URL on initial load
  useEffect(() => {
    const convId = searchParams.get('conv')
    if (convId && conversations.length > 0 && messages.length === 0) {
      const conv = conversations.find(c => c.id === convId)
      if (conv) loadConversation(conv)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, searchParams])

  // Subscribe to real-time conversation updates via SSE
  useEffect(() => {
    let eventSource: EventSource | null = null
    let reconnectTimeout: NodeJS.Timeout | null = null

    const connect = () => {
      setIsLoadingConversations(true)
      eventSource = new EventSource(`${API_BASE}/api/conversations/subscribe`)

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'sync') {
            setConversations(data.conversations.map(apiToLocal))
            setIsLoadingConversations(false)
          }
        } catch (e) {
          console.error('Failed to parse SSE event:', e)
        }
      }

      eventSource.onerror = () => {
        eventSource?.close()
        setIsLoadingConversations(false)
        reconnectTimeout = setTimeout(connect, 5000)
      }
    }

    connect()
    return () => {
      eventSource?.close()
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
    }
  }, [])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (!userScrolledRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, userScrolledRef])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [inputValue])

  const handleOrgChange = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId)
    if (org) {
      setSelectedOrg(org)
      startNewConversation()
    }
  }

  const startNewConversation = () => {
    reset()
    setCurrentConversationId(null)
  }

  const loadConversation = async (conv: StoredConversation) => {
    const org = organizations.find(o => o.id === conv.organization)
    if (org) setSelectedOrg(org)
    setCurrentConversationId(conv.id)

    try {
      const response = await fetch(`${API_BASE}/api/conversations/${conv.id}`)
      if (response.ok) {
        const data: ApiConversation = await response.json()
        const loadedConv = apiToLocal(data)
        setMessages(loadedConv.blocks)
        setSessionId(data.session_id)
        setStatus('completed')
        setConversations(prev => prev.map(c =>
          c.id === conv.id ? { ...c, blocks: loadedConv.blocks, messageCount: loadedConv.messageCount, sessionId: data.session_id } : c
        ))
      }
    } catch (e) {
      console.error('Failed to load conversation:', e)
    }
  }

  const deleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await fetch(`${API_BASE}/api/conversations/${convId}`, { method: 'DELETE' })
    } catch (e) {
      console.error('Failed to delete conversation:', e)
    }
    setConversations(prev => prev.filter(c => c.id !== convId))
    if (currentConversationId === convId) startNewConversation()
  }

  const sendMessage = useCallback(async () => {
    if (!inputValue.trim() || !selectedOrg || isRunning) return

    const userMessage = inputValue.trim()
    setInputValue('')
    setIsRunning(true)
    setError(null)
    userScrolledRef.current = false
    addUserMessage(userMessage)

    let capturedSessionId = sessionId
    let convId = currentConversationId
    const title = userMessage.slice(0, 50) + (userMessage.length >= 50 ? '...' : '')
    const userBlock: MessageBlock = { type: 'user', content: userMessage }

    try {
      if (!convId) {
        const createResponse = await fetch(`${API_BASE}/api/conversations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ organization: selectedOrg.id, title, session_id: null })
        })

        if (createResponse.ok) {
          const createdConv: ApiConversation = await createResponse.json()
          convId = createdConv.id
          setCurrentConversationId(convId)
          setConversations(prev => [{
            id: convId!,
            sessionId: null,
            organization: selectedOrg.id,
            title,
            startedAt: createdConv.started_at,
            messageCount: 1,
            blocks: [userBlock]
          }, ...prev])
        }
      } else {
        setConversations(prev => prev.map(conv =>
          conv.id === convId ? { ...conv, blocks: [...conv.blocks, userBlock], messageCount: conv.messageCount + 1 } : conv
        ))
      }

      if (convId) {
        await fetch(`${API_BASE}/api/conversations/${convId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'user', content: userMessage })
        })
      }

      const endpoint = sessionId
        ? `${API_BASE}/api/workspace-manager/resume`
        : `${API_BASE}/api/workspace-manager/chat`

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          organization: selectedOrg.id,
          session_id: sessionId,
          conversation_id: convId  // Pass conversation_id for backend persistence
        })
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (!data) continue

            try {
              const event: StreamEvent = JSON.parse(data)

              // Capture session_id from status or result events
              if (event.type === 'status' && event.message?.includes('Session:')) {
                const match = event.message.match(/Session:\s*(\S+)/)
                if (match) { capturedSessionId = match[1]; setSessionId(match[1]) }
              }
              if (event.type === 'result' && 'session_id' in event) {
                capturedSessionId = event.session_id
                setSessionId(event.session_id)
              }

              // Process event for UI rendering (backend handles DB persistence)
              processEvent(event)
            } catch (e) {
              console.error('Failed to parse SSE event:', e)
            }
          }
        }
      }

      finalizeAllTools()
      setStatus('completed')

      // Backend now handles message persistence incrementally during streaming.
      // We just need to update the local conversation state with session_id if captured.
      if (convId && capturedSessionId) {
        setConversations(prev => prev.map(conv =>
          conv.id === convId
            ? { ...conv, sessionId: capturedSessionId }
            : conv
        ))
      }
    } catch (err) {
      console.error('Failed to send message:', err)
      setError(err instanceof Error ? err.message : 'Failed to send message')
      setStatus('failed')
    } finally {
      setIsRunning(false)
    }
  }, [inputValue, selectedOrg, isRunning, sessionId, currentConversationId, addUserMessage, processEvent, finalizeAllTools, setStatus, setError, setSessionId, setIsRunning, userScrolledRef])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const chatEnabled = selectedOrg !== null

  return (
    <div className="flex h-[calc(100vh-3rem)] mt-12">
      <ConversationSidebar
        organizations={organizations}
        selectedOrg={selectedOrg}
        onOrgChange={handleOrgChange}
        conversations={conversations}
        currentConversationId={currentConversationId}
        isLoading={isLoadingConversations}
        onNewConversation={startNewConversation}
        onSelectConversation={loadConversation}
        onDeleteConversation={deleteConversation}
      />

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-background">
        {!chatEnabled ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h2 className="text-lg font-semibold mb-2">Workspace Manager</h2>
              <p className="text-sm max-w-md mb-4">
                Plan and create slices and tickets through natural conversation.
                Select an organization to get started.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-6">
              <div className="max-w-3xl mx-auto space-y-4">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center max-w-lg">
                      <Bot className="h-12 w-12 mx-auto mb-4 text-primary/50" />
                      <h3 className="text-lg font-semibold mb-2">Start Planning</h3>
                      <p className="text-sm mb-4">
                        Describe what you want to build and I&apos;ll help you break it down into slices and tickets.
                      </p>
                      <div className="text-xs text-muted-foreground/70 space-y-1">
                        <p>Try: &quot;I want to add dark mode to the app&quot;</p>
                        <p>Or: &quot;What tickets exist for this organization?&quot;</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <MessageRenderer
                    messages={messages}
                    onToggleToolExpanded={toggleToolExpanded}
                    onToggleToolsCollapsed={toggleToolsCollapsed}
                    isLoading={isRunning}
                  />
                )}

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            <div className="border-t p-4 bg-background">
              <div className="max-w-3xl mx-auto">
                <Card className="p-2">
                  <div className="flex gap-2">
                    <textarea
                      ref={textareaRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Describe what you want to build..."
                      disabled={isRunning}
                      className={cn(
                        "flex-1 resize-none text-sm p-2 rounded border-0 bg-transparent",
                        "focus:outline-none focus:ring-0",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "min-h-[44px] max-h-[200px]"
                      )}
                      rows={1}
                    />
                    <Button
                      size="icon"
                      className="h-[44px] w-[44px] flex-shrink-0"
                      onClick={sendMessage}
                      disabled={isRunning || !inputValue.trim()}
                    >
                      {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </Card>
                {sessionId && (
                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <span>Session active</span>
                    <button onClick={startNewConversation} className="hover:text-foreground transition-colors">
                      Start new conversation
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function WorkspaceManagerPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[calc(100vh-3rem)] mt-12 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <WorkspaceManagerContent />
    </Suspense>
  )
}
