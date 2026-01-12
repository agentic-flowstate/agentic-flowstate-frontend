"use client"

import { useEffect, useState, useRef, useCallback } from 'react'
import { Mic, ArrowDown, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TranscriptSession, TranscriptEntry } from '@/lib/types'
import { getTranscriptSession, streamTranscript } from '@/lib/api/transcripts'

interface TranscriptViewerProps {
  session: TranscriptSession
}

// Generate a consistent color for a username
function getUserColor(username: string): string {
  const colors = [
    'text-blue-500',
    'text-green-500',
    'text-purple-500',
    'text-orange-500',
    'text-pink-500',
    'text-cyan-500',
    'text-yellow-500',
    'text-red-400',
  ]
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export function TranscriptViewer({ session }: TranscriptViewerProps) {
  const [entries, setEntries] = useState<TranscriptEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLive, setIsLive] = useState(session.is_active)
  const [autoScroll, setAutoScroll] = useState(true)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Load initial entries and set up streaming
  useEffect(() => {
    let cleanup: (() => void) | null = null

    async function initialize() {
      try {
        setIsLoading(true)

        if (session.is_active) {
          // For live sessions, use SSE streaming
          const seenIds = new Set<number>()

          cleanup = streamTranscript(
            session.session_id,
            (entry) => {
              // Dedupe entries by ID
              if (!seenIds.has(entry.id)) {
                seenIds.add(entry.id)
                setEntries((prev) => [...prev, entry])
              }
            },
            () => {
              setIsLive(false)
            },
            (error) => {
              console.error('Stream error:', error)
              setIsLive(false)
            }
          )
        } else {
          // For completed sessions, just fetch all entries
          const data = await getTranscriptSession(session.session_id)
          setEntries(data.entries)
        }
      } catch (e) {
        console.error('Failed to load transcript:', e)
      } finally {
        setIsLoading(false)
      }
    }

    setEntries([])
    initialize()

    return () => {
      cleanup?.()
    }
  }, [session.session_id, session.is_active])

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [entries, autoScroll])

  // Detect when user scrolls away from bottom
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100

    setAutoScroll(isAtBottom)
    setShowScrollButton(!isAtBottom && entries.length > 10)
  }, [entries.length])

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    setAutoScroll(true)
    setShowScrollButton(false)
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  // Group consecutive entries by the same speaker
  const groupedEntries = entries.reduce<Array<{ username: string; entries: TranscriptEntry[] }>>(
    (groups, entry) => {
      const lastGroup = groups[groups.length - 1]
      if (lastGroup && lastGroup.username === entry.username) {
        lastGroup.entries.push(entry)
      } else {
        groups.push({ username: entry.username, entries: [entry] })
      }
      return groups
    },
    []
  )

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-sm">Loading transcript...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          {isLive ? (
            <>
              <div className="relative">
                <Mic className="h-4 w-4 text-red-500" />
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
              </div>
              <span className="text-sm font-medium text-red-500">Live Recording</span>
            </>
          ) : (
            <>
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Recording ended</span>
            </>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {entries.length} message{entries.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Transcript content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        onScroll={handleScroll}
      >
        {groupedEntries.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-sm">No transcript entries yet</p>
            {isLive && (
              <p className="text-xs mt-1">Waiting for speech to be transcribed...</p>
            )}
          </div>
        ) : (
          groupedEntries.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              {/* Speaker header */}
              <div className="flex items-baseline gap-2">
                <span className={`font-semibold text-sm ${getUserColor(group.username)}`}>
                  {group.username}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatTime(group.entries[0].timestamp)}
                </span>
              </div>

              {/* Messages from this speaker */}
              <div className="pl-0 space-y-1">
                {group.entries.map((entry) => (
                  <p key={entry.id} className="text-sm leading-relaxed">
                    {entry.text}
                  </p>
                ))}
              </div>
            </div>
          ))
        )}

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <div className="absolute bottom-4 right-4">
          <Button
            size="sm"
            variant="secondary"
            className="shadow-lg"
            onClick={scrollToBottom}
          >
            <ArrowDown className="h-4 w-4 mr-1" />
            Latest
          </Button>
        </div>
      )}
    </div>
  )
}
