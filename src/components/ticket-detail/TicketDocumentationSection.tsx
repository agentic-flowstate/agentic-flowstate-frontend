"use client"

import React from 'react'
import { FileText, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface TicketDocumentationSectionProps {
  documentation?: string[]
  onManageDocs?: () => void
  onViewDoc?: (path: string) => void
  isAgentRunning: boolean
  variant?: 'desktop' | 'mobile'
}

export function TicketDocumentationSection({
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

  const docs = documentation ?? []

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <FileText className={cn(iconSize, "text-muted-foreground")} />
        <span className={cn(textSize, "font-medium text-muted-foreground")}>DOCUMENTATION</span>
        {docs.length > 0 && (
          <span className={cn(smallTextSize, "ml-auto text-muted-foreground")}>
            {docs.length} file{docs.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {docs.length > 0 ? (
        <div className={cn("space-y-1 mb-2", isMobile ? "" : "")}>
          {docs.map((path) => {
            const filename = path.split('/').pop() || path
            return (
              <button
                key={path}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded bg-muted/30 w-full text-left",
                  "cursor-pointer hover:bg-muted/50 transition-colors group",
                  textSize
                )}
                title={path}
                onClick={() => onViewDoc?.(path)}
              >
                <FileText className={cn(iconSize, "text-muted-foreground shrink-0")} />
                <span className="truncate text-muted-foreground group-hover:text-foreground group-hover:underline transition-colors">{filename}</span>
              </button>
            )
          })}
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
