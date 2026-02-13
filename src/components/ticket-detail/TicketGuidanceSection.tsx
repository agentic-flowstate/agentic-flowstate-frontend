"use client"

import React, { useState } from 'react'
import { Lightbulb, MessageSquare, Loader2, Trash2 } from 'lucide-react'
import { Ticket } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { updateTicketGuidance } from '@/lib/api/tickets'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

interface TicketGuidanceSectionProps {
  ticket: Ticket
  onOpenAssistant: () => void
  onTicketUpdate?: (ticket: Ticket) => void
}

export function TicketGuidanceSection({
  ticket,
  onOpenAssistant,
  onTicketUpdate,
}: TicketGuidanceSectionProps) {
  const [isClearing, setIsClearing] = useState(false)

  const handleClearGuidance = async () => {
    setIsClearing(true)
    try {
      const updated = await updateTicketGuidance(ticket.ticket_id, null)
      onTicketUpdate?.(updated)
    } catch (error) {
      console.error('Failed to clear guidance:', error)
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Saved Guidance with Markdown Rendering */}
      {ticket.guidance && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-3 w-3 text-emerald-500" />
              <span className="text-xs font-medium text-muted-foreground">GUIDANCE</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
              onClick={handleClearGuidance}
              disabled={isClearing}
            >
              {isClearing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
            </Button>
          </div>
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-md p-3">
            <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                  code: ({ className, children }) => {
                    const isInline = !className
                    return isInline
                      ? <code className="bg-background/50 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
                      : <code className={cn("block bg-background/50 p-2 rounded text-xs font-mono overflow-x-auto", className)}>{children}</code>
                  },
                  pre: ({ children }) => <pre className="bg-background/50 p-2 rounded overflow-x-auto my-2 text-xs">{children}</pre>,
                  h1: ({ children }) => <h1 className="text-lg font-bold mt-3 mb-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-base font-bold mt-2 mb-1">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-bold mt-2 mb-1">{children}</h3>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  a: ({ href, children }) => <a href={href} className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                  blockquote: ({ children }) => <blockquote className="border-l-2 border-muted-foreground/30 pl-3 italic my-2">{children}</blockquote>,
                }}
              >{ticket.guidance}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}

      {/* Ask Assistant Button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full h-9 text-xs gap-2 border-emerald-500/30 hover:border-emerald-500/50 hover:bg-emerald-500/5"
        onClick={onOpenAssistant}
      >
        <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
        {ticket.guidance ? 'Update Guidance' : 'Ask Assistant'}
      </Button>
    </div>
  )
}
