"use client"

import { Mail, Star, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Email, EmailDraft } from '@/lib/types'

interface EmailListProps {
  emails: Email[]
  selectedEmail: Email | null
  onSelectEmail: (email: Email) => void
  onToggleStar: (email: Email, e: React.MouseEvent) => void
  loading: boolean
  currentFolder: 'INBOX' | 'Sent'
}

export function EmailList({
  emails,
  selectedEmail,
  onSelectEmail,
  onToggleStar,
  loading,
  currentFolder,
}: EmailListProps) {
  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (loading && emails.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        Loading...
      </div>
    )
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
        <Mail className="h-8 w-8 mb-2 opacity-50" />
        <p>No emails yet</p>
      </div>
    )
  }

  return (
    <>
      {emails.map((email) => (
        <div
          key={email.id}
          className={cn(
            "px-4 py-3 border-b cursor-pointer transition-colors",
            "hover:bg-accent/50",
            selectedEmail?.id === email.id && "bg-accent",
            !email.is_read && "bg-primary/5"
          )}
          onClick={() => onSelectEmail(email)}
        >
          <div className="flex items-start gap-3">
            <button
              onClick={(e) => onToggleStar(email, e)}
              className="mt-1 hover:scale-110 transition-transform"
            >
              <Star
                className={cn(
                  "h-4 w-4",
                  email.is_starred
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground"
                )}
              />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className={cn(
                  "text-sm truncate",
                  !email.is_read && "font-semibold"
                )}>
                  {currentFolder === 'Sent'
                    ? `To: ${email.to_addresses?.[0] || 'Unknown'}`
                    : (email.from_name || email.from_address)
                  }
                </span>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {formatDate(email.received_at_iso)}
                </span>
              </div>
              <div className={cn(
                "text-sm truncate",
                !email.is_read ? "text-foreground" : "text-muted-foreground"
              )}>
                {email.subject || '(no subject)'}
              </div>
              <div className="text-xs text-muted-foreground truncate mt-0.5">
                {email.body_text?.slice(0, 100) || '(no preview)'}
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  )
}

interface DraftListProps {
  drafts: EmailDraft[]
  selectedDraft: EmailDraft | null
  onSelectDraft: (draft: EmailDraft) => void
  loading: boolean
}

export function DraftList({
  drafts,
  selectedDraft,
  onSelectDraft,
  loading,
}: DraftListProps) {
  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (loading && drafts.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        Loading...
      </div>
    )
  }

  if (drafts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
        <FileText className="h-8 w-8 mb-2 opacity-50" />
        <p>No drafts</p>
      </div>
    )
  }

  return (
    <>
      {drafts.map((draft) => (
        <div
          key={draft.id}
          className={cn(
            "px-4 py-3 border-b cursor-pointer transition-colors",
            "hover:bg-accent/50",
            selectedDraft?.id === draft.id && "bg-accent"
          )}
          onClick={() => onSelectDraft(draft)}
        >
          <div className="flex items-start gap-3">
            <FileText className="h-4 w-4 mt-1 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm truncate">
                  To: {draft.to_address || '(no recipient)'}
                </span>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {formatDate(draft.created_at_iso)}
                </span>
              </div>
              <div className="text-sm truncate text-muted-foreground">
                {draft.subject || '(no subject)'}
              </div>
              <div className="text-xs text-muted-foreground truncate mt-0.5">
                {draft.body?.slice(0, 100) || '(no content)'}
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  )
}
