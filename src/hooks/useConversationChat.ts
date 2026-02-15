"use client"

import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAgentStream, type MessageBlock } from '@/hooks/useAgentStream'
import { type ApiConversation, type StoredConversation, apiToLocal } from '@/lib/types/conversations'
import type { StreamEvent } from '@/lib/api/agents'

export interface ConversationChatOptions {
  sseOrganization: string
  chatApiEndpoint: string
  basePath: string
  enrichMessage?: (message: string) => string
  onEvent?: (event: StreamEvent) => void
}

export function useConversationChat(options: ConversationChatOptions) {
  const { sseOrganization, chatApiEndpoint, basePath, enrichMessage, onEvent } = options

  const router = useRouter()
  const searchParams = useSearchParams()

  const [currentConversationId, setCurrentConversationId] = useState<string | null>(
    searchParams.get('conv')
  )
  const [inputValue, setInputValue] = useState('')
  const [conversations, setConversations] = useState<StoredConversation[]>([])
  const [isLoadingConversations, setIsLoadingConversations] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const agentStream = useAgentStream()
  const {
    messages,
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
    scrollRef,
    userScrolledRef,
    handleScroll,
  } = agentStream

  // Sync URL when conversation changes (preserve other params like ?ticket=)
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (currentConversationId) {
      params.set('conv', currentConversationId)
    } else {
      params.delete('conv')
    }
    const newUrl = params.toString() ? `${basePath}?${params.toString()}` : basePath
    router.replace(newUrl, { scroll: false })
  }, [currentConversationId, router, basePath, searchParams])

  // Load conversation from URL on initial load
  useEffect(() => {
    const convId = searchParams.get('conv')
    if (convId && conversations.length > 0 && messages.length === 0) {
      const conv = conversations.find(c => c.id === convId)
      if (conv) loadConversation(conv)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, searchParams])

  // SSE subscription for conversation updates
  useEffect(() => {
    let controller: AbortController | null = null
    let reconnectTimeout: NodeJS.Timeout | null = null

    const orgParam = sseOrganization ? `?organization=${sseOrganization}` : ''

    const connect = () => {
      setIsLoadingConversations(true)
      controller = new AbortController()

      fetch(`/api/conversations/subscribe${orgParam}`, {
        credentials: 'include',
        headers: { 'Accept': 'text/event-stream' },
        signal: controller.signal,
      }).then(async (response) => {
        const reader = response.body?.getReader()
        if (!reader) return

        const decoder = new TextDecoder()
        let buffer = ''

        try {
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
                  const parsed = JSON.parse(data)
                  if (parsed.type === 'sync') {
                    setConversations(parsed.conversations.map(apiToLocal))
                    setIsLoadingConversations(false)
                  }
                } catch (e) {
                  console.error('Failed to parse SSE event:', e)
                }
              }
            }
          }
        } catch (e) {
          if ((e as Error).name !== 'AbortError') {
            console.error('SSE stream error:', e)
          }
        }

        if (!controller?.signal.aborted) {
          setIsLoadingConversations(false)
          reconnectTimeout = setTimeout(connect, 5000)
        }
      }).catch((e) => {
        if ((e as Error).name !== 'AbortError') {
          console.error('SSE fetch error:', e)
          setIsLoadingConversations(false)
          reconnectTimeout = setTimeout(connect, 5000)
        }
      })
    }

    connect()
    return () => {
      controller?.abort()
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sseOrganization])

  // Auto-scroll
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

  // Refocus textarea after agent response completes
  useEffect(() => {
    if (!isRunning && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isRunning])

  const startNewConversation = useCallback(() => {
    reset()
    setCurrentConversationId(null)
  }, [reset])

  const loadConversation = useCallback(async (conv: StoredConversation) => {
    setCurrentConversationId(conv.id)

    try {
      const response = await fetch(`/api/conversations/${conv.id}`, { credentials: 'include' })
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
  }, [setMessages, setSessionId, setStatus])

  const deleteConversation = useCallback(async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await fetch(`/api/conversations/${convId}`, { method: 'DELETE', credentials: 'include' })
    } catch (e) {
      console.error('Failed to delete conversation:', e)
    }
    setConversations(prev => prev.filter(c => c.id !== convId))
    if (currentConversationId === convId) startNewConversation()
  }, [currentConversationId, startNewConversation])

  const sendMessage = useCallback(async (overrideMessage?: string) => {
    const messageToSend = overrideMessage || inputValue.trim()
    if (!messageToSend || isRunning) return

    const userMessage = messageToSend
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
        const createResponse = await fetch(`/api/conversations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ organization: sseOrganization || 'global', title, session_id: null })
        })

        if (createResponse.ok) {
          const createdConv: ApiConversation = await createResponse.json()
          convId = createdConv.id
          setCurrentConversationId(convId)
          setConversations(prev => [{
            id: convId!,
            sessionId: null,
            organization: sseOrganization || 'global',
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
        await fetch(`/api/conversations/${convId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ role: 'user', content: userMessage })
        })
      }

      const endpoint = `${chatApiEndpoint}/chat`

      const finalMessage = enrichMessage ? enrichMessage(userMessage) : userMessage

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: finalMessage,
          conversation_id: convId,
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

              if (event.type === 'status' && event.message?.includes('Session:')) {
                const match = event.message.match(/Session:\s*(\S+)/)
                if (match) { capturedSessionId = match[1]; setSessionId(match[1]) }
              }
              if (event.type === 'result' && 'session_id' in event) {
                capturedSessionId = event.session_id
                setSessionId(event.session_id)
              }

              processEvent(event)
              onEvent?.(event)
            } catch (e) {
              console.error('Failed to parse SSE event:', e)
            }
          }
        }
      }

      finalizeAllTools()
      setStatus('completed')

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
  }, [inputValue, isRunning, sessionId, currentConversationId, sseOrganization, chatApiEndpoint, enrichMessage, onEvent, addUserMessage, processEvent, finalizeAllTools, setStatus, setError, setSessionId, setIsRunning, userScrolledRef])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }, [sendMessage])

  return {
    // State
    currentConversationId,
    inputValue,
    setInputValue,
    conversations,
    isLoadingConversations,
    sidebarOpen,
    setSidebarOpen,
    messagesEndRef,
    textareaRef,

    // From useAgentStream
    messages,
    status: agentStream.status,
    error: agentStream.error,
    sessionId,
    isRunning,
    scrollRef,
    handleScroll,
    toggleToolExpanded: agentStream.toggleToolExpanded,
    toggleToolsCollapsed: agentStream.toggleToolsCollapsed,

    // Actions
    startNewConversation,
    loadConversation,
    deleteConversation,
    sendMessage,
    handleKeyDown,
  }
}
