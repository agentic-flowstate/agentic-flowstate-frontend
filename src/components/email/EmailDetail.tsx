"use client"

import { ChevronLeft, Star, Ticket, Eye, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Email, EmailThreadTicket } from '@/lib/types'

interface EmailDetailProps {
  email: Email
  onBack: () => void
  onToggleStar: (email: Email, e: React.MouseEvent) => void
  linkedTickets: EmailThreadTicket[]
  loadingTickets: boolean
  onOpenTicket: (ticketId: string, epicId?: string, sliceId?: string) => void
}

export function EmailDetail({
  email,
  onBack,
  onToggleStar,
  linkedTickets,
  loadingTickets,
  onOpenTicket,
}: EmailDetailProps) {
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
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {email.body_html ? (
              <div
                dangerouslySetInnerHTML={{ __html: email.body_html }}
              />
            ) : (
              <pre className="whitespace-pre-wrap font-sans">
                {email.body_text || '(empty)'}
              </pre>
            )}
          </div>
        </Card>
      </div>
    </>
  )
}
