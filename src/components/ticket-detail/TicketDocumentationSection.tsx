"use client"

import React, { useEffect, useState } from 'react'
import { FileText, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ArtifactDocSummary } from '@/lib/types'

interface TicketDocumentationSectionProps {
  ticketId: string
  documentation?: string[]
  onManageDocs?: () => void
  onViewDoc?: (artifactId: string) => void
  isAgentRunning: boolean
  variant?: 'desktop' | 'mobile'
}

export function TicketDocumentationSection({
  ticketId,
  documentation,
  onManageDocs,
  onViewDoc,
  isAgentRunning,
  variant = 'desktop',
}: TicketDocumentationSectionProps) {
  const isMobile = variant === 'mobile'
  const iconSize = isMobile ? 'h-4 w-4' : 'h-3 w-3'
  const textSize = isMobile ? 'text-sm' : 'text-xs'
  const smallTextSize = isMobile ? 'text-xs' : 'text-[10px]'

  const docIds = documentation ?? []
  const [summaries, setSummaries] = useState<ArtifactDocSummary[]>([])

  useEffect(() => {
    if (docIds.length === 0) {
      setSummaries([])
      return
    }

    let cancelled = false
    fetch(`/api/tickets/${ticketId}/docs`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : [])
      .then((data: ArtifactDocSummary[]) => {
        if (!cancelled) setSummaries(data)
      })
      .catch(() => {
        if (!cancelled) setSummaries([])
      })

    return () => { cancelled = true }
  }, [ticketId, docIds.length])

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <FileText className={cn(iconSize, "text-muted-foreground")} />
        <span className={cn(textSize, "font-medium text-muted-foreground")}>DOCUMENTATION</span>
        {summaries.length > 0 && (
          <span className={cn(smallTextSize, "ml-auto text-muted-foreground")}>
            {summaries.length} artifact{summaries.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {summaries.length > 0 ? (
        <div className={cn("space-y-1 mb-2", isMobile ? "" : "")}>
          {summaries.map((doc) => (
            <button
              key={doc.artifact_id}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded bg-muted/30 w-full text-left",
                "cursor-pointer hover:bg-muted/50 transition-colors group",
                textSize
              )}
              title={doc.artifact_id}
              onClick={() => onViewDoc?.(doc.artifact_id)}
            >
              <FileText className={cn(iconSize, "text-muted-foreground shrink-0")} />
              <span className="truncate text-muted-foreground group-hover:text-foreground group-hover:underline transition-colors">{doc.title}</span>
              <span className={cn(smallTextSize, "ml-auto text-muted-foreground/60 shrink-0")}>{doc.artifact_type}</span>
            </button>
          ))}
        </div>
      ) : docIds.length > 0 ? (
        <div className={cn("text-center py-2 text-muted-foreground mb-2", smallTextSize)}>
          Loading artifacts...
        </div>
      ) : (
        <div className={cn("text-center py-2 text-muted-foreground mb-2", smallTextSize)}>
          No documentation attached
        </div>
      )}

      {onManageDocs && (
        <Button
          variant="ghost"
          size={isMobile ? "default" : "sm"}
          className={cn("w-full", textSize)}
          onClick={onManageDocs}
        >
          <Bot className={cn(iconSize, "mr-1.5")} />
          Manage Docs
        </Button>
      )}
    </div>
  )
}
