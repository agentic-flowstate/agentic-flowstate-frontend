'use client'

import React from 'react'
import { Users } from 'lucide-react'
import { LayoutModeSelector } from './LayoutModeSelector'
import { LayoutMode } from './types'

interface MeetingHeaderProps {
  roomId: string
  isRecording: boolean
  participantCount: number
  layoutMode: LayoutMode
  onLayoutModeChange: (mode: LayoutMode) => void
}

export function MeetingHeader({
  roomId,
  isRecording,
  participantCount,
  layoutMode,
  onLayoutModeChange,
}: MeetingHeaderProps) {
  return (
    <div className="h-12 flex items-center justify-between px-4 border-b border-border/50">
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm text-muted-foreground">{roomId}</span>
        {isRecording && (
          <div className="flex items-center gap-1.5 text-xs text-red-500 dark:text-red-400">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            REC
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <LayoutModeSelector value={layoutMode} onChange={onLayoutModeChange} />
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Users className="h-4 w-4" />
          <span>{participantCount}</span>
        </div>
      </div>
    </div>
  )
}
