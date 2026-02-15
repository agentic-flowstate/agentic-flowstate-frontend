"use client"

import { FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { cn } from '@/lib/utils'
import { Ticket } from '@/lib/types'
import { CopyTicketId } from '@/components/copy-ticket-id'

interface TicketDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticket: Ticket | null
  loading: boolean
}

export function TicketDetailSheet({
  open,
  onOpenChange,
  ticket,
  loading,
}: TicketDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-96 p-0 overflow-hidden">
        <VisuallyHidden.Root>
          <SheetTitle>Ticket Details</SheetTitle>
        </VisuallyHidden.Root>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : ticket ? (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="h-14 border-b flex items-center justify-between px-4 shrink-0">
              <div className="flex items-center gap-3">
                <CopyTicketId ticketId={ticket.ticket_id} className="text-[10px]" />
                <span className="text-xs text-muted-foreground">•</span>
                <span className={cn(
                  "text-xs font-medium",
                  ticket.status === 'completed' && "text-green-500",
                  ticket.status === 'blocked' && "text-destructive",
                  ticket.status === 'in_progress' && "text-blue-500",
                  ticket.status === 'pending-enrichment' && "text-amber-500",
                  (!ticket.status || ticket.status === 'open') && "text-muted-foreground"
                )}>
                  {(ticket.status || 'open').toUpperCase().replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Title */}
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-2">{ticket.title}</h2>
              </div>

              {/* Description */}
              {ticket.description && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">DESCRIPTION</span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{ticket.description}</p>
                </div>
              )}


              {/* Assignee */}
              {ticket.assignee && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-muted-foreground">ASSIGNEE</span>
                  </div>
                  <p className="text-sm text-foreground">{ticket.assignee}</p>
                </div>
              )}

              {/* Metadata */}
              <div className="pt-4 border-t border-border">
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Epic</span>
                    <span className="font-mono">{ticket.epic_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Slice</span>
                    <span className="font-mono">{ticket.slice_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Created</span>
                    <span className="font-mono">
                      {new Date(ticket.created_at_iso).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Updated</span>
                    <span className="font-mono">
                      {new Date(ticket.updated_at_iso).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Open in Workspace button */}
              <div className="pt-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    window.open(`/workspace?epic=${ticket.epic_id}&slice=${ticket.slice_id}&ticket=${ticket.ticket_id}`, '_blank')
                  }}
                >
                  Open in Workspace
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Failed to load ticket details
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
