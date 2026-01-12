"use client"

import { useEffect, useState } from 'react'
import { Mic, MicOff, Users, Clock, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TranscriptSession } from '@/lib/types'
import { getTranscriptSessions } from '@/lib/api/transcripts'

interface TranscriptListProps {
  onSelectSession: (session: TranscriptSession) => void
  selectedSessionId?: string
}

export function TranscriptList({ onSelectSession, selectedSessionId }: TranscriptListProps) {
  const [sessions, setSessions] = useState<TranscriptSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadSessions() {
      try {
        setIsLoading(true)
        const data = await getTranscriptSessions()
        setSessions(data)
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load sessions')
      } finally {
        setIsLoading(false)
      }
    }

    loadSessions()

    // Refresh every 5 seconds to catch new sessions quickly
    const interval = setInterval(loadSessions, 5000)
    return () => clearInterval(interval)
  }, [])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDuration = (startedAt: string, endedAt?: string) => {
    const start = new Date(startedAt)
    const end = endedAt ? new Date(endedAt) : new Date()
    const durationMs = end.getTime() - start.getTime()
    const minutes = Math.floor(durationMs / 60000)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    }
    return `${minutes}m`
  }

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="p-8 text-center">
        <MicOff className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">No transcript sessions yet</p>
        <p className="text-xs text-muted-foreground/70 mt-2">
          Start a Discord voice call to begin recording
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2 p-2">
      {sessions.map((session) => (
        <Card
          key={session.session_id}
          className={`cursor-pointer transition-colors hover:bg-muted/50 ${
            selectedSessionId === session.session_id ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => onSelectSession(session)}
        >
          <CardHeader className="p-3 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {session.is_active ? (
                  <div className="relative">
                    <Mic className="h-4 w-4 text-red-500" />
                    <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                  </div>
                ) : (
                  <MicOff className="h-4 w-4 text-muted-foreground" />
                )}
                <CardTitle className="text-sm font-medium">
                  {session.channel_name || 'Voice Call'}
                </CardTitle>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardDescription className="text-xs">
              {formatDate(session.started_at)}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{session.participant_count} participants</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatDuration(session.started_at, session.ended_at)}</span>
              </div>
              {session.is_active && (
                <span className="text-red-500 font-medium">LIVE</span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
