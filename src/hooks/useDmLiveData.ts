import { useEffect, useRef, useCallback } from 'react'
import type { DmConversation } from '@/lib/types/dms'

function getBackendUrl(): string {
  if (typeof window === 'undefined') return 'http://localhost:8001'
  const host = window.location.hostname
  const isHttps = window.location.protocol === 'https:'
  if (isHttps) return `https://${host}:8443`
  return process.env.NEXT_PUBLIC_API_URL || 'http://100.119.87.128:8001'
}

const BACKEND_URL = typeof window !== 'undefined' ? getBackendUrl() : 'http://localhost:8001'

interface DmDataEvent {
  type: 'dms'
  dms: DmConversation[]
}

interface UseDmLiveDataOptions {
  onDmsUpdate: (dms: DmConversation[]) => void
  enabled?: boolean
}

export function useDmLiveData({ onDmsUpdate, enabled = true }: UseDmLiveDataOptions) {
  const abortRef = useRef<AbortController | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const retriesRef = useRef(0)

  const connect = useCallback(() => {
    if (!enabled) return

    if (abortRef.current) {
      abortRef.current.abort()
    }

    const controller = new AbortController()
    abortRef.current = controller

    const url = `${BACKEND_URL}/api/dms/subscribe`

    fetch(url, {
      credentials: 'include',
      headers: { 'Accept': 'text/event-stream' },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`SSE request failed: ${response.status}`)

        // Connected successfully — reset retry counter
        retriesRef.current = 0

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
                const data: DmDataEvent = JSON.parse(line.slice(6))
                if (data.type === 'dms' && data.dms) {
                  onDmsUpdate(data.dms)
                }
              } catch {
                // ignore parse errors
              }
            }
          }
        }
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          // Exponential backoff: 2s, 4s, 8s, 16s, 30s max
          const delay = Math.min(2000 * Math.pow(2, retriesRef.current), 30000)
          retriesRef.current++
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
          reconnectTimeoutRef.current = setTimeout(() => connect(), delay)
        }
      })
  }, [enabled, onDmsUpdate])

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
