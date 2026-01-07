"use client"

import React, { useState, useEffect } from 'react'
import { X, ArrowLeft, Link2, FileText, Save } from 'lucide-react'
import { Ticket } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { updateTicketNotes } from '@/lib/api/tickets'
import { TicketDetailProps } from './TicketDrawer'

export function TicketDetailMobile({ ticket, isOpen, onClose }: TicketDetailProps) {
  const [notes, setNotes] = useState('')
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [isSavingNotes, setIsSavingNotes] = useState(false)

  useEffect(() => {
    if (ticket) {
      setNotes(ticket.notes || '')
      setIsEditingNotes(false)
    }
  }, [ticket])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!ticket || !isOpen) return null

  const handleSaveNotes = async () => {
    if (!ticket) return

    setIsSavingNotes(true)
    try {
      await updateTicketNotes(ticket.epic_id, ticket.slice_id, ticket.ticket_id, notes)
      setIsEditingNotes(false)
    } catch (error) {
      console.error('Failed to save notes:', error)
    } finally {
      setIsSavingNotes(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-background">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-muted-foreground">{ticket.ticket_id}</span>
            <span className={cn(
              "text-xs font-medium",
              ticket.status === 'completed' && "text-green-500",
              ticket.status === 'blocked' && "text-destructive",
              ticket.status === 'in_progress' && "text-blue-500",
              (!ticket.status || ticket.status === 'open') && "text-muted-foreground"
            )}>
              {(ticket.status || 'open').toUpperCase().replace('_', ' ')}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="h-[calc(100%-56px)] overflow-y-auto">
        <div className="p-4 space-y-6">
          {/* Title */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">{ticket.title}</h2>
            {ticket.type && ticket.type !== 'task' && (
              <span className="inline-block px-2 py-1 bg-muted border border-border rounded text-xs text-muted-foreground">
                {ticket.type}
              </span>
            )}
          </div>

          {/* Intent */}
          {ticket.intent && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">INTENT</span>
              </div>
              <p className="text-sm text-foreground">{ticket.intent}</p>
            </div>
          )}

          {/* Notes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">NOTES</span>
              </div>
              {!isEditingNotes && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={() => setIsEditingNotes(true)}
                >
                  Edit
                </Button>
              )}
            </div>
            {isEditingNotes ? (
              <div className="space-y-3">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full min-h-[120px] p-3 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-y"
                  placeholder="Add notes..."
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveNotes}
                    disabled={isSavingNotes}
                    className="h-9 flex-1"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSavingNotes ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setNotes(ticket.notes || '')
                      setIsEditingNotes(false)
                    }}
                    disabled={isSavingNotes}
                    className="h-9"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="text-sm text-muted-foreground whitespace-pre-wrap min-h-[80px] p-3 bg-muted/20 rounded-md cursor-pointer active:bg-muted/30 transition-colors"
                onClick={() => setIsEditingNotes(true)}
              >
                {notes || <span className="italic text-muted-foreground/60">Tap to add notes...</span>}
              </div>
            )}
          </div>

          {/* Relationships */}
          {((ticket.blocks_tickets && ticket.blocks_tickets.length > 0) ||
            (ticket.blocked_by_tickets && ticket.blocked_by_tickets.length > 0) ||
            (ticket.caused_by_tickets && ticket.caused_by_tickets.length > 0)) && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">RELATIONSHIPS</span>
              </div>

              <div className="space-y-4">
                {/* Blocks */}
                {ticket.blocks_tickets && ticket.blocks_tickets.length > 0 && (
                  <div>
                    <div className="text-sm text-destructive mb-2">Blocks</div>
                    <div className="space-y-2">
                      {ticket.blocks_tickets.map((id) => (
                        <div
                          key={id}
                          className="px-3 py-2 bg-muted/50 border border-border rounded-md text-sm font-mono text-muted-foreground"
                        >
                          {id}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Blocked by */}
                {ticket.blocked_by_tickets && ticket.blocked_by_tickets.length > 0 && (
                  <div>
                    <div className="text-sm text-orange-500 mb-2">Blocked by</div>
                    <div className="space-y-2">
                      {ticket.blocked_by_tickets.map((id) => (
                        <div
                          key={id}
                          className="px-3 py-2 bg-muted/50 border border-border rounded-md text-sm font-mono text-muted-foreground"
                        >
                          {id}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Caused by */}
                {ticket.caused_by_tickets && ticket.caused_by_tickets.length > 0 && (
                  <div>
                    <div className="text-sm text-yellow-500 mb-2">Caused by</div>
                    <div className="space-y-2">
                      {ticket.caused_by_tickets.map((id) => (
                        <div
                          key={id}
                          className="px-3 py-2 bg-muted/50 border border-border rounded-md text-sm font-mono text-muted-foreground"
                        >
                          {id}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="pt-4 border-t border-border">
            <div className="space-y-3 text-sm text-muted-foreground">
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
        </div>
      </div>
    </div>
  )
}
