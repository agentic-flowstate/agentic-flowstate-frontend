"use client"

import { useState } from 'react'
import { Mic } from 'lucide-react'
import { TranscriptList, TranscriptViewer } from '@/components/transcripts'
import { TranscriptSession } from '@/lib/types'

export default function TranscriptsPage() {
  const [selectedSession, setSelectedSession] = useState<TranscriptSession | null>(null)

  return (
    <div className="h-full bg-background flex overflow-hidden">
      {/* Sidebar - Session list */}
      <div className="w-80 border-r bg-muted/10 flex flex-col">
        <div className="h-12 border-b flex items-center px-4 gap-2 bg-background">
          <Mic className="h-4 w-4 text-primary" />
          <h1 className="font-semibold text-sm">Transcripts</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          <TranscriptList
            onSelectSession={setSelectedSession}
            selectedSessionId={selectedSession?.session_id}
          />
        </div>
      </div>

      {/* Main content - Transcript viewer */}
      <div className="flex-1 flex flex-col relative">
        {selectedSession ? (
          <TranscriptViewer session={selectedSession} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Mic className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Select a transcript</p>
              <p className="text-sm mt-1">Choose a recording session from the sidebar to view its transcript</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
