"use client"

import React, { useState, useCallback, useEffect, Suspense } from 'react'
import { Heart, Send, Loader2, AlertCircle, PanelLeft, MessageSquare, CalendarCheck } from 'lucide-react'
import { redirect, useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useAuth, hasLifeAccess } from '@/contexts/auth-context'
import { MessageRenderer } from '@/components/message-renderer'
import { ConversationSidebar } from '@/components/conversation-sidebar'
import { useConversationChat } from '@/hooks/useConversationChat'
import { DailyPlanSidebar, type WorkloadItem } from './DailyPlanSidebar'
import { TicketDetail } from '@/components/ticket-detail'
import { getTicketById } from '@/lib/api/tickets'
import type { Ticket } from '@/lib/types'

function enrichMessageWithTimestamp(message: string): string {
  const now = new Date()
  const dow = ['sun','mon','tue','wed','thu','fri','sat'][now.getDay()]
  const mon = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'][now.getMonth()]
  const hr = now.getHours()
  const min = now.getMinutes()
  const ampm = hr >= 12 ? 'pm' : 'am'
  const h12 = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr
  const ts = `${dow}-${mon}-${now.getDate()}-${h12}:${String(min).padStart(2, '0')}${ampm}`
  return `${message}\n\n[${ts}]`
}

function LifeContent() {
  const { user } = useAuth()

  if (!hasLifeAccess(user)) {
    redirect('/workspace')
  }

  const chat = useConversationChat({
    sseOrganization: 'life',
    chatApiEndpoint: '/api/life-planner',
    basePath: '/life',
    enrichMessage: enrichMessageWithTimestamp,
  })

  const router = useRouter()
  const searchParams = useSearchParams()

  const [mobileView, setMobileView] = useState<'plan' | 'chat'>('chat')
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)

  // Restore ticket from URL on mount
  useEffect(() => {
    const ticketId = searchParams.get('ticket')
    if (ticketId && !selectedTicket) {
      getTicketById(ticketId).then(ticket => {
        if (ticket) setSelectedTicket(ticket)
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync selected ticket to URL
  const selectedTicketId = selectedTicket?.ticket_id ?? null
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const currentParam = params.get('ticket')
    if (currentParam === selectedTicketId) return // already in sync
    if (selectedTicketId) {
      params.set('ticket', selectedTicketId)
    } else {
      params.delete('ticket')
    }
    const newUrl = params.toString() ? `/life?${params.toString()}` : '/life'
    router.replace(newUrl, { scroll: false })
  }, [selectedTicketId, searchParams, router])

  const handleTicketClick = useCallback(async (item: WorkloadItem) => {
    const ticket = await getTicketById(item.ticket_id)
    if (ticket) setSelectedTicket(ticket)
  }, [])

  const handleCloseDrawer = useCallback(() => setSelectedTicket(null), [])
  const handleTicketUpdate = useCallback((ticket: Ticket) => setSelectedTicket(ticket), [])

  return (
    <div className="flex h-full overflow-hidden">
      <ConversationSidebar
        conversations={chat.conversations}
        currentConversationId={chat.currentConversationId}
        isLoading={chat.isLoadingConversations}
        isOpen={chat.sidebarOpen}
        onToggle={() => chat.setSidebarOpen(!chat.sidebarOpen)}
        onNewConversation={chat.startNewConversation}
        onSelectConversation={chat.loadConversation}
        onDeleteConversation={chat.deleteConversation}
        title="Life Planner"
        icon={<Heart className="h-4 w-4 text-primary" />}
      />

      {/* Daily Plan Sidebar - desktop only */}
      <div className="hidden md:flex w-72 border-r flex-col bg-background overflow-hidden">
        <DailyPlanSidebar onTicketClick={handleTicketClick} selectedTicketId={selectedTicket?.ticket_id} />
      </div>

      {/* Mobile view toggle */}
      <div className="md:hidden flex flex-col h-full w-full">
        <div className="flex border-b">
          <button
            onClick={() => setMobileView('plan')}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors",
              mobileView === 'plan' ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
            )}
          >
            <CalendarCheck className="h-3.5 w-3.5" />
            Plan
          </button>
          <button
            onClick={() => setMobileView('chat')}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors",
              mobileView === 'chat' ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Chat
          </button>
        </div>

        {mobileView === 'plan' ? (
          <div className="flex-1 overflow-hidden">
            <DailyPlanSidebar onTicketClick={handleTicketClick} selectedTicketId={selectedTicket?.ticket_id} />
          </div>
        ) : (
          <ChatPanel chat={chat} onOpenConversations={() => chat.setSidebarOpen(true)} />
        )}
      </div>

      {/* Ticket detail drawer */}
      <TicketDetail ticket={selectedTicket} isOpen={!!selectedTicket} onClose={handleCloseDrawer} onTicketUpdate={handleTicketUpdate} />

      {/* Desktop chat area */}
      <div className="hidden md:flex flex-1 flex-col bg-background overflow-hidden min-w-0">
        <ChatPanel chat={chat} onOpenConversations={() => chat.setSidebarOpen(true)} />
      </div>
    </div>
  )
}

interface ChatPanelProps {
  chat: ReturnType<typeof useConversationChat>
  onOpenConversations: () => void
}

function ChatPanel({ chat, onOpenConversations }: ChatPanelProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      {/* Messages */}
      {chat.messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 text-muted-foreground">
          <div className="text-center max-w-lg px-2">
            <Heart className="h-12 w-12 mx-auto mb-4 text-primary/50" />
            <h3 className="text-lg font-semibold mb-2">What&apos;s on your mind?</h3>
            <p className="text-sm mb-4">
              Ask about your day, nutrition, training, projects, or anything else.
            </p>
            <div className="text-xs text-muted-foreground/70 space-y-1">
              <p>Try: &quot;What do I have left today?&quot;</p>
              <p>Or: &quot;What should I make for dinner?&quot;</p>
            </div>
          </div>
        </div>
      ) : (
        <div ref={chat.scrollRef} onScroll={chat.handleScroll} className="flex-1 overflow-y-auto p-3 sm:p-6">
          <div className="max-w-3xl mx-auto space-y-4">
            <MessageRenderer
              messages={chat.messages}
              onToggleToolExpanded={chat.toggleToolExpanded}
              onToggleToolsCollapsed={chat.toggleToolsCollapsed}
              isLoading={chat.isRunning}
            />

            {chat.error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {chat.error}
              </div>
            )}
            <div ref={chat.messagesEndRef} />
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t p-2 sm:p-4 bg-background">
        <div className="max-w-3xl mx-auto">
          <Card className="p-2">
            <div className="flex gap-2">
              <textarea
                ref={chat.textareaRef}
                value={chat.inputValue}
                onChange={(e) => chat.setInputValue(e.target.value)}
                onKeyDown={chat.handleKeyDown}
                placeholder="Tell me about your day..."
                disabled={chat.isRunning}
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
                onClick={() => chat.sendMessage()}
                disabled={chat.isRunning || !chat.inputValue.trim()}
              >
                {chat.isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </Card>
          {chat.sessionId && (
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <span>Session active</span>
              <button onClick={chat.startNewConversation} className="hover:text-foreground transition-colors">
                Start new conversation
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LifePage() {
  return (
    <Suspense fallback={null}>
      <LifeContent />
    </Suspense>
  )
}
