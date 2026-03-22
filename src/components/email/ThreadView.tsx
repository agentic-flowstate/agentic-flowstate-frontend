"use client"

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronDown, ChevronRight, Star, Reply, ReplyAll, Forward, Paperclip, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Email, EmailAttachment } from '@/lib/types'
import { fetchAttachments } from '@/lib/api/emails'
import { wrapEmailHtml } from './email-html-wrapper'

interface ThreadViewProps {
  emails: Email[]
  onBack: () => void
  onToggleStar: (email: Email, e: React.MouseEvent) => void
  onReply?: (email: Email) => void
  onReplyAll?: (email: Email) => void
  onForward?: (email: Email) => void
}

function ThreadMessage({
  email,
  isLatest,
  onToggleStar,
  onReply,
  onReplyAll,
  onForward,
}: {
  email: Email
  isLatest: boolean
  onToggleStar: (email: Email, e: React.MouseEvent) => void
  onReply?: (email: Email) => void
  onReplyAll?: (email: Email) => void
  onForward?: (email: Email) => void
}) {
  const [expanded, setExpanded] = useState(isLatest)
  const [attachments, setAttachments] = useState<EmailAttachment[]>([])

  useEffect(() => {
    if (expanded) {
      fetchAttachments(email.id).then(setAttachments).catch(() => setAttachments([]))
    }
  }, [expanded, email.id])

  return (
    <Card className={cn("overflow-hidden", !expanded && "cursor-pointer hover:bg-muted/50")} onClick={() => !expanded && setExpanded(true)}>
      {/* Collapsed header */}
      <div className="flex items-center gap-3 p-3">
        <div className="flex items-center">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground cursor-pointer" onClick={() => setExpanded(false)} />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("text-sm truncate", !email.is_read && "font-semibold")}>
              {email.from_name || email.from_address}
            </span>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {new Date(email.received_at_iso).toLocaleString(undefined, {
                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
              })}
            </span>
          </div>
          {!expanded && email.body_text && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {email.body_text.substring(0, 100)}
            </p>
          )}
        </div>
        <button onClick={(e) => { e.stopPropagation(); onToggleStar(email, e) }}>
          <Star className={cn("h-4 w-4", email.is_starred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground")} />
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4">
          <div className="text-xs text-muted-foreground mb-3 pl-7">
            <div>To: {email.to_addresses.join(', ')}</div>
            {email.cc_addresses && email.cc_addresses.length > 0 && (
              <div>Cc: {email.cc_addresses.join(', ')}</div>
            )}
          </div>

          <div className="max-w-none">
            {email.body_html ? (
              <iframe
                srcDoc={wrapEmailHtml(email.body_html)}
                sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
                className="w-full border-0"
                scrolling="no"
                title="Email content"
                style={{ minHeight: '100px', overflow: 'hidden', colorScheme: 'light' }}
                onLoad={(e) => {
                  const iframe = e.target as HTMLIFrameElement
                  const doc = iframe.contentDocument
                  if (!doc) return
                  const syncHeight = () => {
                    const h = doc.documentElement.scrollHeight
                    if (h > 0) iframe.style.height = h + 'px'
                  }
                  syncHeight()
                  const ro = new ResizeObserver(syncHeight)
                  ro.observe(doc.documentElement)
                }}
              />
            ) : (
              <pre className="whitespace-pre-wrap font-sans text-sm pl-7">
                {email.body_text || '(empty)'}
              </pre>
            )}
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="mt-3 pt-3 border-t pl-7">
              <div className="flex items-center gap-1.5 text-xs font-medium mb-1.5">
                <Paperclip className="h-3.5 w-3.5" />
                {attachments.length} attachment{attachments.length !== 1 ? 's' : ''}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {attachments.map((att) => (
                  <a
                    key={att.id}
                    href={`/api/emails/attachments/${att.id}`}
                    download={att.filename}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs hover:bg-muted/80 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download className="h-3 w-3 text-muted-foreground" />
                    <span className="truncate max-w-[150px]">{att.filename}</span>
                    <span className="text-muted-foreground">
                      ({att.size_bytes < 1024 ? `${att.size_bytes}B` : att.size_bytes < 1048576 ? `${Math.round(att.size_bytes / 1024)}KB` : `${(att.size_bytes / 1048576).toFixed(1)}MB`})
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t pl-7">
            {onReply && (
              <Button variant="outline" size="sm" onClick={() => onReply(email)}>
                <Reply className="h-3.5 w-3.5 mr-1" />
                Reply
              </Button>
            )}
            {onReplyAll && email.cc_addresses && email.cc_addresses.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => onReplyAll(email)}>
                <ReplyAll className="h-3.5 w-3.5 mr-1" />
                Reply All
              </Button>
            )}
            {onForward && (
              <Button variant="outline" size="sm" onClick={() => onForward(email)}>
                <Forward className="h-3.5 w-3.5 mr-1" />
                Forward
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

export function ThreadView({
  emails,
  onBack,
  onToggleStar,
  onReply,
  onReplyAll,
  onForward,
}: ThreadViewProps) {
  const subject = emails[0]?.subject || '(no subject)'

  return (
    <>
      {/* Thread Header */}
      <div className="h-14 border-b flex items-center gap-3 px-4">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold truncate">{subject}</h2>
          <p className="text-xs text-muted-foreground">{emails.length} message{emails.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Thread Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {emails.map((email, i) => (
          <ThreadMessage
            key={email.id}
            email={email}
            isLatest={i === emails.length - 1}
            onToggleStar={onToggleStar}
            onReply={onReply}
            onReplyAll={onReplyAll}
            onForward={onForward}
          />
        ))}
      </div>
    </>
  )
}
