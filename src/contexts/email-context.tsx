"use client"

import React, { createContext, useContext, useState, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth-context'
import { useLiveEmails } from '@/hooks/useLiveEmails'
import type { Email } from '@/lib/types'

function useLatest<T>(value: T) {
  const ref = useRef(value)
  ref.current = value
  return ref
}

interface EmailContextValue {
  totalUnread: number
}

const EmailContext = createContext<EmailContextValue>({
  totalUnread: 0,
})

export function useEmail() {
  return useContext(EmailContext)
}

export function EmailProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const pathname = usePathname()
  const pathnameRef = useLatest(pathname)

  const [totalUnread, setTotalUnread] = useState(0)
  const prevEmailIdsRef = useRef<Set<number>>(new Set())
  const initializedRef = useRef(false)

  const handleLiveEmailUpdate = useCallback(
    (folder: 'INBOX' | 'Sent', emails: Email[], _total: number, unread: number) => {
      if (folder !== 'INBOX') return

      setTotalUnread(unread)

      if (!initializedRef.current) {
        prevEmailIdsRef.current = new Set(emails.map(e => e.id))
        initializedRef.current = true
        return
      }

      const newEmails = emails.filter(
        e => !prevEmailIdsRef.current.has(e.id) && !e.is_read
      )

      if (newEmails.length > 0 && !pathnameRef.current.startsWith('/emails')) {
        for (const email of newEmails.slice(0, 3)) {
          const sender = email.from_name || email.from_address
          const subject = email.subject
            ? (email.subject.length > 60 ? email.subject.slice(0, 60) + '...' : email.subject)
            : 'New email'
          toast.message(sender, {
            description: subject,
            duration: 5000,
          })
        }

        if (document.visibilityState === 'hidden' && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          const first = newEmails[0]
          new Notification(first.from_name || first.from_address, {
            body: first.subject || 'New email',
          })
        }
      }

      prevEmailIdsRef.current = new Set(emails.map(e => e.id))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  useLiveEmails({
    mailbox: null,
    onUpdate: handleLiveEmailUpdate,
    enabled: !!user,
  })

  return (
    <EmailContext.Provider value={{ totalUnread }}>
      {children}
    </EmailContext.Provider>
  )
}
