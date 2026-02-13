"use client"

import React, { useCallback, useMemo, Suspense } from 'react'
import { Bot, Send, Loader2, AlertCircle, PanelLeft, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { MessageRenderer } from '@/components/message-renderer'
import { ProposalRenderer } from '@/components/proposal-renderer'
import { ConversationSidebar } from '@/components/conversation-sidebar'
import { useConversationChat } from '@/hooks/useConversationChat'
import type { MessageBlock } from '@/hooks/useAgentStream'

function WorkspaceManagerContent() {
  const chat = useConversationChat({
    sseOrganization: '',
    chatApiEndpoint: '/api/workspace-manager',
    basePath: '/workspace-manager',
  })

  // Check if the last assistant message contains proposals awaiting approval
  const hasPendingProposal = useMemo(() => {
    if (chat.isRunning) return false
    for (let i = chat.messages.length - 1; i >= 0; i--) {
      const block = chat.messages[i]
      if (block.type === 'user') break
      if (block.type === 'text' && block.content?.includes('<proposal>')) {
        return true
      }
    }
    return false
  }, [chat.messages, chat.isRunning])

  const handleApprove = useCallback(() => {
    chat.sendMessage('approved')
  }, [chat.sendMessage])

  // Custom renderer for text blocks that may contain XML proposals
  const renderTextBlock = useCallback((block: MessageBlock) => {
    if (block.type !== 'text' || !block.content) return null

    if (block.content.includes('<proposal>') || block.content.includes('<clarifications>')) {
      return (
        <div className="flex gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <ProposalRenderer content={block.content} />
          </div>
        </div>
      )
    }

    return null
  }, [])

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
      />

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-background overflow-hidden min-w-0">
        {/* Mobile header */}
        <div className="h-14 border-b flex items-center px-4 md:hidden">
          <Button variant="ghost" size="icon" onClick={() => chat.setSidebarOpen(true)} title="Open conversations">
            <PanelLeft className="h-5 w-5" />
          </Button>
          <span className="ml-2 font-semibold text-sm">Workspace Manager</span>
        </div>

        {/* Messages */}
        {chat.messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-4 sm:p-6 text-muted-foreground">
            <div className="text-center max-w-lg px-2">
              <Bot className="h-12 w-12 mx-auto mb-4 text-primary/50" />
              <h3 className="text-lg font-semibold mb-2">Start Planning</h3>
              <p className="text-sm mb-4">
                Describe what you want to build and I&apos;ll help you break it down into slices and tickets.
              </p>
              <div className="text-xs text-muted-foreground/70 space-y-1">
                <p>Try: &quot;I want to add dark mode to ballotradar&quot;</p>
                <p>Or: &quot;What tickets exist across all organizations?&quot;</p>
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
                renderTextBlock={renderTextBlock}
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
            {hasPendingProposal && (
              <div className="mb-3 flex justify-center">
                <Button
                  onClick={handleApprove}
                  disabled={chat.isRunning}
                  className="bg-green-600 hover:bg-green-700 text-white gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve & Create Tickets
                </Button>
              </div>
            )}
            <Card className="p-2">
              <div className="flex gap-2">
                <textarea
                  ref={chat.textareaRef}
                  value={chat.inputValue}
                  onChange={(e) => chat.setInputValue(e.target.value)}
                  onKeyDown={chat.handleKeyDown}
                  placeholder="Describe what you want to build..."
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
    </div>
  )
}

export default function WorkspaceManagerPage() {
  return (
    <Suspense fallback={null}>
      <WorkspaceManagerContent />
    </Suspense>
  )
}
