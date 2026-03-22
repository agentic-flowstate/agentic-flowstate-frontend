"use client"

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth-context'
import { useDmLiveData } from '@/hooks/useDmLiveData'
import * as dmApi from '@/lib/api/dms'
import type { DmConversation } from '@/lib/types/dms'

// Keep pathname in a ref so SSE callback doesn't depend on it (avoids reconnects on navigation)
function useLatest<T>(value: T) {
  const ref = useRef(value)
  ref.current = value
  return ref
}

interface DmContextValue {
  dms: DmConversation[]
  totalUnread: number
  refreshDms: () => void
  setDms: React.Dispatch<React.SetStateAction<DmConversation[]>>
  chatWidgetOpen: boolean
  chatWidgetDmId: string | null
  openChatWidget: (dmId?: string) => void
  closeChatWidget: () => void
}

const DmContext = createContext<DmContextValue>({
  dms: [],
  totalUnread: 0,
  refreshDms: () => {},
  setDms: () => {},
  chatWidgetOpen: false,
  chatWidgetDmId: null,
  openChatWidget: () => {},
  closeChatWidget: () => {},
})

export function useDm() {
  return useContext(DmContext)
}

export function DmProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const pathname = usePathname()
  const [dms, setDms] = useState<DmConversation[]>([])
  const [chatWidgetOpen, setChatWidgetOpen] = useState(false)
  const [chatWidgetDmId, setChatWidgetDmId] = useState<string | null>(null)
  const prevUnreadRef = useRef<Record<string, number>>({})
  const initializedRef = useRef(false)

  const openChatWidget = useCallback((dmId?: string) => {
    setChatWidgetOpen(true)
    if (dmId) setChatWidgetDmId(dmId)
  }, [])

  const closeChatWidget = useCallback(() => {
    setChatWidgetOpen(false)
    setChatWidgetDmId(null)
  }, [])

  // Load initial DM list
  useEffect(() => {
    if (!user) return
    dmApi.listDms().then(data => {
      setDms(data)
      // Seed previous unread counts so we don't toast on initial load
      const counts: Record<string, number> = {}
      for (const dm of data) {
        counts[dm.id] = dm.unread_count
      }
      prevUnreadRef.current = counts
      initializedRef.current = true
    }).catch(console.error)
  }, [user])

  // Use refs for values that change often so the SSE callback stays stable (no reconnects on navigation)
  const pathnameRef = useLatest(pathname)
  const openChatWidgetRef = useLatest(openChatWidget)

  // SSE live updates
  const handleDmsUpdate = useCallback((updatedDms: DmConversation[]) => {
    setDms(prev => {
      const prevJson = JSON.stringify(prev.map(d => ({ id: d.id, updated_at: d.updated_at, unread_count: d.unread_count })))
      const newJson = JSON.stringify(updatedDms.map(d => ({ id: d.id, updated_at: d.updated_at, unread_count: d.unread_count })))
      if (prevJson === newJson) return prev
      return updatedDms
    })

    // Fire toast for new unread messages (only after initial load)
    if (!initializedRef.current) return

    const onDmsPage = pathnameRef.current === '/dms'

    for (const dm of updatedDms) {
      const prevCount = prevUnreadRef.current[dm.id] ?? 0
      if (dm.unread_count > prevCount) {
        // New unread message(s) — show toast if not on DMs page
        if (!onDmsPage) {
          const preview = dm.last_message
            ? dm.last_message.length > 60 ? dm.last_message.slice(0, 60) + '...' : dm.last_message
            : 'New message'
          toast.message(dm.other_user_name, {
            description: preview,
            action: {
              label: 'Reply',
              onClick: () => openChatWidgetRef.current(dm.id),
            },
            duration: 5000,
          })
        }
      }
    }

    // Update previous counts
    const counts: Record<string, number> = {}
    for (const dm of updatedDms) {
      counts[dm.id] = dm.unread_count
    }
    prevUnreadRef.current = counts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useDmLiveData({ onDmsUpdate: handleDmsUpdate, enabled: !!user })

  const totalUnread = dms.reduce((sum, dm) => sum + dm.unread_count, 0)

  const refreshDms = useCallback(() => {
    dmApi.listDms().then(setDms).catch(console.error)
  }, [])

  return (
    <DmContext.Provider value={{ dms, totalUnread, refreshDms, setDms, chatWidgetOpen, chatWidgetDmId, openChatWidget, closeChatWidget }}>
      {children}
    </DmContext.Provider>
  )
}
