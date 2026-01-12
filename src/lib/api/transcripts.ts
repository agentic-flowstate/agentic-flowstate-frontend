/**
 * Data Access Layer for Transcript System
 *
 * API calls go directly to the Rust API server at localhost:8001
 */

import {
  TranscriptSession,
  TranscriptSessionsResponse,
  TranscriptEntriesResponse,
} from "@/lib/types"

// Direct API calls to Rust backend
const API_BASE_URL = 'http://localhost:8001'

/**
 * Get all transcript sessions
 * @param activeOnly - If true, only return active sessions
 */
export async function getTranscriptSessions(activeOnly: boolean = false): Promise<TranscriptSession[]> {
  const url = new URL(`${API_BASE_URL}/api/transcripts`)
  if (activeOnly) {
    url.searchParams.set('active_only', 'true')
  }

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`Failed to fetch transcript sessions: ${response.statusText}`)
  }

  const data: TranscriptSessionsResponse = await response.json()
  return data.sessions
}

/**
 * Get a specific transcript session with all entries
 * @param sessionId - Session ID to retrieve
 */
export async function getTranscriptSession(sessionId: string): Promise<TranscriptEntriesResponse> {
  const response = await fetch(`${API_BASE_URL}/api/transcripts/${encodeURIComponent(sessionId)}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch transcript session: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Create an SSE connection for live transcript updates
 * @param sessionId - Session ID to stream
 * @param onEntry - Callback for new transcript entries
 * @param onSessionEnd - Callback when session ends
 * @param onError - Callback for errors
 * @returns Cleanup function to close the connection
 */
export function streamTranscript(
  sessionId: string,
  onEntry: (entry: import("@/lib/types").TranscriptEntry) => void,
  onSessionEnd?: () => void,
  onError?: (error: Error) => void
): () => void {
  const eventSource = new EventSource(
    `${API_BASE_URL}/api/transcripts/${encodeURIComponent(sessionId)}/stream`
  )

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)

      if (data.type === 'entry') {
        onEntry(data)
      } else if (data.type === 'session_ended') {
        onSessionEnd?.()
        eventSource.close()
      }
    } catch (e) {
      console.error('Failed to parse transcript event:', e)
    }
  }

  eventSource.onerror = (error) => {
    console.error('Transcript stream error:', error)
    onError?.(new Error('Stream connection failed'))
    eventSource.close()
  }

  // Return cleanup function
  return () => {
    eventSource.close()
  }
}
