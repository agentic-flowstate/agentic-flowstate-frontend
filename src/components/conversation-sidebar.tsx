"use client"

import React, { useState } from 'react'
import { Bot, Plus, Trash2, Loader2, Copy, Check, PanelLeftClose } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { StoredConversation } from '@/lib/types/conversations'

export interface ConversationSidebarProps {
  conversations: StoredConversation[]
  currentConversationId: string | null
  isLoading: boolean
  isOpen: boolean
  onToggle: () => void
  onNewConversation: () => void
  onSelectConversation: (conv: StoredConversation) => void
  onDeleteConversation: (convId: string, e: React.MouseEvent) => void
  title?: string
  icon?: React.ReactNode
}

export function ConversationSidebar({
  conversations,
  currentConversationId,
  isLoading,
  isOpen,
  onToggle,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
  title = 'Workspace Manager',
  icon,
}: ConversationSidebarProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyConversationId = (convId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(convId)
    setCopiedId(convId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleSelectConversation = (conv: StoredConversation) => {
    onSelectConversation(conv)
    // Auto-close sidebar on mobile after selection
    if (window.innerWidth < 768) {
      onToggle()
    }
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "border-r flex flex-col bg-background overflow-hidden transition-all duration-200 z-50",
        // Mobile: fixed overlay that slides in/out. Desktop: always visible
        "fixed inset-y-0 left-0 w-72 md:relative md:w-64",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="h-14 border-b flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            {icon || <Bot className="h-4 w-4 text-primary" />}
            <span className="font-semibold text-sm">{title}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onNewConversation}
              title="New conversation"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              title="Close sidebar"
              className="md:hidden"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="text-center text-xs text-muted-foreground py-8 flex items-center justify-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading...
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-8">
              No conversations yet
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                className={cn(
                  "group w-full text-left p-2 rounded-md text-sm hover:bg-accent transition-colors cursor-pointer",
                  currentConversationId === conv.id && "bg-accent"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{conv.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(conv.startedAt).toLocaleDateString()} · {conv.messageCount} messages
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => copyConversationId(conv.id, e)}
                      title="Copy conversation ID"
                    >
                      {copiedId === conv.id ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => onDeleteConversation(conv.id, e)}
                      title="Delete conversation"
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
