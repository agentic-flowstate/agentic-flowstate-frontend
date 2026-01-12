"use client"

import React from 'react'
import { FileText, Save } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export interface TicketNotesSectionProps {
  notes: string
  isEditing: boolean
  isSaving: boolean
  onNotesChange: (notes: string) => void
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
  variant?: 'desktop' | 'mobile'
}

export function TicketNotesSection({
  notes,
  isEditing,
  isSaving,
  onNotesChange,
  onEdit,
  onSave,
  onCancel,
  variant = 'desktop',
}: TicketNotesSectionProps) {
  const isMobile = variant === 'mobile'
  const iconSize = isMobile ? 'h-4 w-4' : 'h-3 w-3'
  const textSize = isMobile ? 'text-sm' : 'text-xs'

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FileText className={cn(iconSize, "text-muted-foreground")} />
          <span className={cn(textSize, "font-medium text-muted-foreground")}>NOTES</span>
        </div>
        {!isEditing && (
          <Button
            variant="ghost"
            size="sm"
            className={isMobile ? "h-8" : "h-6 text-xs"}
            onClick={onEdit}
          >
            Edit
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className={isMobile ? "space-y-3" : "space-y-2"}>
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            className={cn(
              "w-full text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-y",
              isMobile ? "min-h-[120px] p-3" : "min-h-[100px] p-2"
            )}
            placeholder="Add notes..."
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={onSave}
              disabled={isSaving}
              className={isMobile ? "h-9 flex-1" : "h-7"}
            >
              <Save className={cn(isMobile ? "h-4 w-4 mr-2" : "h-3 w-3 mr-1")} />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onCancel}
              disabled={isSaving}
              className={isMobile ? "h-9" : "h-7"}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "text-sm text-muted-foreground whitespace-pre-wrap rounded-md cursor-pointer transition-colors",
            isMobile
              ? "min-h-[80px] p-3 bg-muted/20 active:bg-muted/30"
              : "min-h-[50px] p-2 bg-muted/20 hover:bg-muted/30"
          )}
          onClick={onEdit}
        >
          {notes || (
            <span className="italic text-muted-foreground/60">
              {isMobile ? 'Tap to add notes...' : 'Click to add notes...'}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
