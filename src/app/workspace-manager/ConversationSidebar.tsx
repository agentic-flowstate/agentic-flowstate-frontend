"use client"

import React from 'react'
import { Bot, Plus, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { Organization } from '@/contexts/organization-context'
import type { StoredConversation } from './types'

export interface ConversationSidebarProps {
  organizations: Organization[]
  selectedOrg: Organization | null
  onOrgChange: (orgId: string) => void
  conversations: StoredConversation[]
  currentConversationId: string | null
  isLoading: boolean
  onNewConversation: () => void
  onSelectConversation: (conv: StoredConversation) => void
  onDeleteConversation: (convId: string, e: React.MouseEvent) => void
}

export function ConversationSidebar({
  organizations,
  selectedOrg,
  onOrgChange,
  conversations,
  currentConversationId,
  isLoading,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
}: ConversationSidebarProps) {
  // Filter conversations by selected org
  const filteredConversations = selectedOrg
    ? conversations.filter(c => c.organization === selectedOrg.id)
    : conversations

  return (
    <div className="w-64 border-r flex flex-col bg-background overflow-hidden">
      <div className="h-14 border-b flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Workspace Manager</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNewConversation}
          title="New conversation"
          disabled={!selectedOrg}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Organization selector */}
      <div className="p-3 border-b">
        <div className="text-xs font-medium text-muted-foreground mb-2">Organization</div>
        <Select
          value={selectedOrg?.id || ''}
          onValueChange={onOrgChange}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Select organization..." />
          </SelectTrigger>
          <SelectContent>
            {organizations.map((org) => (
              <SelectItem key={org.id} value={org.id} className="text-sm">
                {org.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="text-center text-xs text-muted-foreground py-8 flex items-center justify-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading...
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-8">
            {selectedOrg ? 'No conversations yet' : 'Select an organization'}
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => onSelectConversation(conv)}
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => onDeleteConversation(conv.id, e)}
                  title="Delete conversation"
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
