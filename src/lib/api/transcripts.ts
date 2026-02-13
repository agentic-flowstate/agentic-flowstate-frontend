/**
 * Data Access Layer for Transcript System
 */

import {
  TranscriptSession,
  TranscriptSessionsResponse,
  TranscriptEntriesResponse,
} from "@/lib/types"

function getApiBaseUrl() {
  if (typeof window === 'undefined') return 'http://localhost:8001'
  const isSecure = window.location.protocol === 'https:'
  const host = window.location.hostname
  if (isSecure) {
    return `https://${host}:8443`
  }
  return `http://${host}:8001`
}

/**
 * Get all transcript sessions
 * @param activeOnly - If true, only return active sessions
 */
export async function getTranscriptSessions(activeOnly: boolean = false): Promise<TranscriptSession[]> {
  const url = new URL(`${getApiBaseUrl()}/api/transcripts`)
  if (activeOnly) {
    url.searchParams.set('active_only', 'true')
  }

  const response = await fetch(url.toString(), { credentials: 'include' })
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
  const response = await fetch(`${getApiBaseUrl()}/api/transcripts/${encodeURIComponent(sessionId)}`, { credentials: 'include' })
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
  const controller = new AbortController()

  fetch(`${getApiBaseUrl()}/api/transcripts/${encodeURIComponent(sessionId)}/stream`, {
    credentials: 'include',
    headers: { 'Accept': 'text/event-stream' },
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) throw new Error(`Stream request failed: ${response.status}`)
      const reader = response.body?.getReader()
      if (!reader) return

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.type === 'entry') {
                onEntry(data)
              } else if (data.type === 'session_ended') {
                onSessionEnd?.()
                controller.abort()
              }
            } catch (e) {
              console.error('Failed to parse transcript event:', e)
            }
          }
        }
      }
    })
    .catch((err) => {
      if (err.name === 'AbortError') return
      console.error('Transcript stream error:', err)
      onError?.(new Error('Stream connection failed'))
    })

  return () => {
    controller.abort()
  }
}
