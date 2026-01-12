"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { ChevronDown, ChevronRight, Clock, Bot, FileText, User, ArrowRight, Plus, Mail, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getTicketHistory, type TicketHistoryEvent } from '@/lib/api/tickets'
import { getAgentTypeDisplayInfo } from '@/lib/api/agents'

interface TicketHistoryProps {
  epicId: string
  sliceId: string
  ticketId: string
  onAgentRunClick?: (sessionId: string) => void
}

export function TicketHistory({ epicId, sliceId, ticketId, onAgentRunClick }: TicketHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [events, setEvents] = useState<TicketHistoryEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadHistory = useCallback(async () => {
    if (!ticketId) return

    setIsLoading(true)
    setError(null)
    try {
      const history = await getTicketHistory(epicId, sliceId, ticketId, 50)
      setEvents(history)
    } catch (e) {
      console.error('Failed to load ticket history:', e)
      setError('Failed to load history')
    } finally {
      setIsLoading(false)
    }
  }, [epicId, sliceId, ticketId])

  // Load history when expanded
  useEffect(() => {
    if (isExpanded && events.length === 0 && !isLoading) {
      loadHistory()
    }
  }, [isExpanded, events.length, isLoading, loadHistory])

  // Reload when ticket changes
  useEffect(() => {
    if (isExpanded) {
      loadHistory()
    }
  }, [ticketId]) // eslint-disable-line react-hooks/exhaustive-deps

  const formatEventTime = (isoDate: string) => {
    const date = new Date(isoDate)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const renderEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'status_change':
        return <ArrowRight className="h-3 w-3 text-blue-500" />
      case 'agent_run_completed':
        return <Bot className="h-3 w-3 text-purple-500" />
      case 'note_added':
        return <FileText className="h-3 w-3 text-yellow-500" />
      case 'assignee_changed':
        return <User className="h-3 w-3 text-green-500" />
      case 'ticket_created':
        return <Plus className="h-3 w-3 text-emerald-500" />
      case 'draft_created':
        return <Mail className="h-3 w-3 text-orange-500" />
      case 'email_sent':
        return <Send className="h-3 w-3 text-green-500" />
      default:
        return <Clock className="h-3 w-3 text-muted-foreground" />
    }
  }

  const renderEventDescription = (event: TicketHistoryEvent) => {
    const data = event.event_data

    switch (event.event_type) {
      case 'status_change':
        return (
          <span>
            Status changed from{' '}
            <span className="font-medium text-muted-foreground">{String(data.old_status || 'unknown')}</span>
            {' → '}
            <span className="font-medium text-foreground">{String(data.new_status || 'unknown')}</span>
          </span>
        )

      case 'agent_run_completed': {
        const agentType = String(data.agent_type || 'unknown')
        const sessionId = String(data.session_id || '')
        const status = String(data.status || 'completed')
        const displayInfo = getAgentTypeDisplayInfo(agentType)

        return (
          <span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (onAgentRunClick && sessionId) {
                  onAgentRunClick(sessionId)
                }
              }}
              className={cn(
                "font-medium hover:underline",
                displayInfo.color
              )}
            >
              {displayInfo.label}
            </button>
            {' agent '}
            <span className={cn(
              "font-medium",
              status === 'completed' ? "text-green-500" : "text-red-500"
            )}>
              {status === 'completed' ? 'completed' : 'failed'}
            </span>
          </span>
        )
      }

      case 'note_added':
        return <span>Notes updated</span>

      case 'assignee_changed':
        return (
          <span>
            Assignee changed from{' '}
            <span className="font-medium text-muted-foreground">{String(data.old_assignee || 'unassigned')}</span>
            {' → '}
            <span className="font-medium text-foreground">{String(data.new_assignee || 'unassigned')}</span>
          </span>
        )

      case 'ticket_created':
        return <span>Ticket created</span>

      case 'draft_created': {
        const toAddr = String(data.to_address || 'unknown')
        const subject = String(data.subject || '(no subject)')
        // Truncate long subjects
        const shortSubject = subject.length > 30 ? subject.slice(0, 30) + '...' : subject
        return (
          <span>
            Email draft created to{' '}
            <span className="font-medium text-foreground">{toAddr}</span>
            {' - '}
            <span className="text-muted-foreground italic">{shortSubject}</span>
          </span>
        )
      }

      case 'email_sent': {
        const toAddr = String(data.to_address || 'unknown')
        const subject = String(data.subject || '(no subject)')
        const shortSubject = subject.length > 30 ? subject.slice(0, 30) + '...' : subject
        return (
          <span>
            Email sent to{' '}
            <span className="font-medium text-green-600">{toAddr}</span>
            {' - '}
            <span className="text-muted-foreground italic">{shortSubject}</span>
          </span>
        )
      }

      default:
        return <span>{event.event_type}</span>
    }
  }

  return (
    <div className="border-t border-border pt-4">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left hover:bg-muted/50 rounded px-2 py-1.5 -mx-2 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        )}
        <Clock className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">HISTORY</span>
        {events.length > 0 && !isExpanded && (
          <span className="text-[10px] text-muted-foreground/60 ml-auto">
            {events.length} event{events.length !== 1 ? 's' : ''}
          </span>
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-3 space-y-0">
          {isLoading && (
            <div className="text-xs text-muted-foreground py-2">Loading history...</div>
          )}

          {error && (
            <div className="text-xs text-destructive py-2">{error}</div>
          )}

          {!isLoading && !error && events.length === 0 && (
            <div className="text-xs text-muted-foreground py-2">No history yet</div>
          )}

          {!isLoading && !error && events.length > 0 && (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

              {/* Events */}
              <div className="space-y-0">
                {events.map((event, index) => (
                  <div
                    key={event.id}
                    className={cn(
                      "relative flex items-start gap-3 py-2 pl-6",
                      index !== events.length - 1 && "border-b border-border/30"
                    )}
                  >
                    {/* Timeline dot */}
                    <div className="absolute left-0 top-2.5 h-4 w-4 rounded-full bg-background border border-border flex items-center justify-center">
                      {renderEventIcon(event.event_type)}
                    </div>

                    {/* Event content */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-foreground">
                        {renderEventDescription(event)}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {formatEventTime(event.created_at_iso)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
