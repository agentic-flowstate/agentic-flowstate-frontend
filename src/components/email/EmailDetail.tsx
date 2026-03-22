"use client"

import { useEffect, useState } from 'react'
import { ChevronLeft, Star, Ticket, Eye, Loader2, Reply, ReplyAll, Forward, Paperclip, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Email, EmailAttachment, EmailThreadTicket } from '@/lib/types'
import { fetchAttachments } from '@/lib/api/emails'
import { wrapEmailHtml } from './email-html-wrapper'

interface EmailDetailProps {
  email: Email
  onBack: () => void
  onToggleStar: (email: Email, e: React.MouseEvent) => void
  linkedTickets: EmailThreadTicket[]
  loadingTickets: boolean
  onOpenTicket: (ticketId: string, epicId?: string, sliceId?: string) => void
  onReply?: (email: Email) => void
  onReplyAll?: (email: Email) => void
  onForward?: (email: Email) => void
}

export function EmailDetail({
  email,
  onBack,
  onToggleStar,
  linkedTickets,
  loadingTickets,
  onOpenTicket,
  onReply,
  onReplyAll,
  onForward,
}: EmailDetailProps) {
  const [attachments, setAttachments] = useState<EmailAttachment[]>([])

  useEffect(() => {
    fetchAttachments(email.id).then(setAttachments).catch(() => setAttachments([]))
  }, [email.id])

  return (
    <>
      {/* Detail Header */}
      <div className="h-14 border-b flex items-center gap-3 px-4">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onBack}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold truncate">
            {email.subject || '(no subject)'}
          </h2>
        </div>
        <button onClick={(e) => onToggleStar(email, e)}>
          <Star
            className={cn(
              "h-5 w-5",
              email.is_starred
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            )}
          />
        </button>
      </div>

      {/* Email Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <Card className="p-4">
          {/* Linked Tickets */}
          {(linkedTickets.length > 0 || loadingTickets) && (
            <div className="bg-primary/5 rounded-lg p-3 border border-primary/20 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Ticket className="h-4 w-4 text-primary" />
                <span className="font-medium">Linked Tickets:</span>
                {loadingTickets ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {linkedTickets.map((link) => (
                      <button
                        key={link.id}
                        onClick={() => onOpenTicket(link.ticket_id, link.epic_id, link.slice_id)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 rounded text-primary hover:bg-primary/20 transition-colors"
                      >
                        {link.ticket_id}
                        <Eye className="h-3 w-3" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sender info */}
          <div className="flex items-start justify-between mb-4 pb-4 border-b">
            <div>
              <div className="font-medium">
                {email.from_name || email.from_address}
              </div>
              {email.from_name && (
                <div className="text-sm text-muted-foreground">
                  {email.from_address}
                </div>
              )}
              <div className="text-sm text-muted-foreground mt-1">
                To: {email.to_addresses.join(', ')}
              </div>
              {email.cc_addresses && email.cc_addresses.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  Cc: {email.cc_addresses.join(', ')}
                </div>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {new Date(email.received_at_iso).toLocaleString()}
            </div>
          </div>

          {/* Body */}
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
              <pre className="whitespace-pre-wrap font-sans text-sm">
                {email.body_text || '(empty)'}
              </pre>
            )}
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-1.5 text-sm font-medium mb-2">
                <Paperclip className="h-4 w-4" />
                {attachments.length} attachment{attachments.length !== 1 ? 's' : ''}
              </div>
              <div className="flex flex-wrap gap-2">
                {attachments.map((att) => (
                  <a
                    key={att.id}
                    href={`/api/emails/attachments/${att.id}`}
                    download={att.filename}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-md text-sm hover:bg-muted/80 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate max-w-[200px]">{att.filename}</span>
                    <span className="text-xs text-muted-foreground">
                      ({att.size_bytes < 1024 ? `${att.size_bytes}B` : att.size_bytes < 1048576 ? `${Math.round(att.size_bytes / 1024)}KB` : `${(att.size_bytes / 1048576).toFixed(1)}MB`})
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Reply/Forward Actions */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t">
            {onReply && (
              <Button variant="outline" size="sm" onClick={() => onReply(email)}>
                <Reply className="h-4 w-4 mr-1.5" />
                Reply
              </Button>
            )}
            {onReplyAll && email.cc_addresses && email.cc_addresses.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => onReplyAll(email)}>
                <ReplyAll className="h-4 w-4 mr-1.5" />
                Reply All
              </Button>
            )}
            {onForward && (
              <Button variant="outline" size="sm" onClick={() => onForward(email)}>
                <Forward className="h-4 w-4 mr-1.5" />
                Forward
              </Button>
            )}
          </div>
        </Card>
      </div>
    </>
  )
}
