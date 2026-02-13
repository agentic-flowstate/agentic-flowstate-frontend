/**
 * Hook for subscribing to live data updates via SSE
 * Automatically updates epics, slices, and tickets when data changes on the server
 * Uses fetch-based SSE to support credentials (cookies) for cross-origin requests
 */

import { useEffect, useRef, useCallback } from 'react'
import { Epic, Slice, Ticket } from '@/lib/types'

// API base for direct backend calls (SSE doesn't go through Next.js API routes)
// When accessed via HTTPS (Tailscale), use port 8443 for Caddy proxy
function getBackendUrl(): string {
  if (typeof window === 'undefined') return 'http://localhost:8001'

  const host = window.location.hostname
  const isHttps = window.location.protocol === 'https:'

  // If accessed via HTTPS, use Caddy proxy on 8443
  if (isHttps) {
    return `https://${host}:8443`
  }

  // For local/HTTP access, use direct API port
  return process.env.NEXT_PUBLIC_API_URL || 'http://100.119.87.128:8001'
}

const BACKEND_URL = typeof window !== 'undefined' ? getBackendUrl() : 'http://localhost:8001'

interface DataEvent {
  type: 'epics' | 'slices' | 'tickets'
  epics?: Epic[]
  slices?: Slice[]
  tickets?: Ticket[]
}

interface UseLiveDataOptions {
  organization: string | null
  onEpicsUpdate?: (epics: Epic[]) => void
  onSlicesUpdate?: (slices: Slice[]) => void
  onTicketsUpdate?: (tickets: Ticket[]) => void
  enabled?: boolean
}

export function useLiveData({
  organization,
  onEpicsUpdate,
  onSlicesUpdate,
  onTicketsUpdate,
  enabled = true,
}: UseLiveDataOptions) {
  const abortRef = useRef<AbortController | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    if (!organization || !enabled) return

    // Clean up existing connection
    if (abortRef.current) {
      abortRef.current.abort()
    }

    const controller = new AbortController()
    abortRef.current = controller

    const url = `${BACKEND_URL}/api/data/subscribe?organization=${encodeURIComponent(organization)}`
    console.log('[LiveData] Connecting to SSE:', url)

    fetch(url, {
      credentials: 'include',
      headers: { 'Accept': 'text/event-stream' },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`SSE request failed: ${response.status}`)
        }
        console.log('[LiveData] SSE connection opened')

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
                const data: DataEvent = JSON.parse(line.slice(6))
                switch (data.type) {
                  case 'epics':
                    if (data.epics && onEpicsUpdate) onEpicsUpdate(data.epics)
                    break
                  case 'slices':
                    if (data.slices && onSlicesUpdate) onSlicesUpdate(data.slices)
                    break
                  case 'tickets':
                    if (data.tickets && onTicketsUpdate) onTicketsUpdate(data.tickets)
                    break
                }
              } catch (err) {
                console.error('[LiveData] Failed to parse SSE event:', err)
              }
            }
          }
        }
      })
      .catch((err) => {
        if (err.name === 'AbortError') return // Intentional disconnect
        console.log('[LiveData] SSE connection closed, will reconnect in 5s')
      })
      .finally(() => {
        // Reconnect after 5 seconds (unless aborted)
        if (!controller.signal.aborted) {
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
          }
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('[LiveData] Attempting reconnection...')
            connect()
          }, 5000)
        }
      })
  }, [organization, enabled, onEpicsUpdate, onSlicesUpdate, onTicketsUpdate])

  useEffect(() => {
    connect()

    return () => {
      if (abortRef.current) {
        abortRef.current.abort()
        abortRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }
  }, [connect])

  // Return a function to manually reconnect
  return {
    reconnect: connect,
  }
}
