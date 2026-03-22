/**
 * Hook for subscribing to live email updates via SSE.
 * Pushes INBOX and Sent folder updates when data changes on the server.
 * Uses fetch-based SSE to support credentials (cookies) for cross-origin requests.
 */

import { useEffect, useRef, useCallback } from 'react'
import { Email } from '@/lib/types'

function getBackendUrl(): string {
  if (typeof window === 'undefined') return 'http://localhost:8001'

  const host = window.location.hostname
  const isHttps = window.location.protocol === 'https:'

  if (isHttps) {
    return `https://${host}:8443`
  }

  return process.env.NEXT_PUBLIC_API_URL || 'http://100.119.87.128:8001'
}

const BACKEND_URL = typeof window !== 'undefined' ? getBackendUrl() : 'http://localhost:8001'

interface EmailEventPayload {
  folder: string
  emails: Email[]
  total: number
  unread: number
}

interface UseLiveEmailsOptions {
  mailbox: string | null
  onUpdate?: (folder: 'INBOX' | 'Sent', emails: Email[], total: number, unread: number) => void
  enabled?: boolean
}

export function useLiveEmails({
  mailbox,
  onUpdate,
  enabled = true,
}: UseLiveEmailsOptions) {
  const abortRef = useRef<AbortController | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    if (!enabled) return

    if (abortRef.current) {
      abortRef.current.abort()
    }

    const controller = new AbortController()
    abortRef.current = controller

    let url = `${BACKEND_URL}/api/emails/subscribe`
    if (mailbox && mailbox !== 'all') {
      url += `?mailbox=${encodeURIComponent(mailbox)}`
    }

    fetch(url, {
      credentials: 'include',
      headers: { 'Accept': 'text/event-stream' },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Email SSE request failed: ${response.status}`)
        }

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
            // SSE format: "event: emails\ndata: {...}"
            const dataMatch = line.match(/data: (.+)/)
            if (dataMatch) {
              try {
                const payload: EmailEventPayload = JSON.parse(dataMatch[1])
                if (onUpdate && (payload.folder === 'INBOX' || payload.folder === 'Sent')) {
                  onUpdate(payload.folder, payload.emails, payload.total, payload.unread)
                }
              } catch (err) {
                console.error('[LiveEmails] Failed to parse SSE event:', err)
              }
            }
          }
        }
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        console.log('[LiveEmails] SSE connection closed, will reconnect in 5s')
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
          }
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, 5000)
        }
      })
  }, [mailbox, enabled, onUpdate])

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

  return { reconnect: connect }
}
