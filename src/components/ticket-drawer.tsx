"use client"

import React, { useState, useEffect } from 'react'
import { X, AlertCircle, Link2, FileText, Save } from 'lucide-react'
import { Ticket } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { updateTicketNotes } from '@/lib/api/tickets'

interface TicketDrawerProps {
  ticket: Ticket | null
  isOpen: boolean
  onClose: () => void
}

export function TicketDrawer({ ticket, isOpen, onClose }: TicketDrawerProps) {
  const [notes, setNotes] = useState('')
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [isSavingNotes, setIsSavingNotes] = useState(false)

  useEffect(() => {
    if (ticket) {
      setNotes(ticket.notes || '')
      setIsEditingNotes(false)
    }
  }, [ticket])

  if (!ticket) return null

  const handleSaveNotes = async () => {
    if (!ticket) return

    setIsSavingNotes(true)
    try {
      await updateTicketNotes(ticket.epic_id, ticket.slice_id, ticket.ticket_id, notes)
      setIsEditingNotes(false)
    } catch (error) {
      console.error('Failed to save notes:', error)
      // Optionally show error to user
    } finally {
      setIsSavingNotes(false)
    }
  }

  return (
    <>
      {/* Backdrop - clicking outside closes drawer */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed right-0 top-12 bottom-0 w-96 bg-background border-l border-border z-50",
          "transition-transform duration-200",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="h-14 border-b border-border flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-muted-foreground">{ticket.ticket_id}</span>
            <span className="text-xs text-muted-foreground">•</span>
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
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClose}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        {/* Content */}
        <div className="h-full overflow-y-auto pb-20">
          <div className="p-6 space-y-6">
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
                  <FileText className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">INTENT</span>
                </div>
                <p className="text-sm text-foreground">{ticket.intent}</p>
              </div>
            )}

            {/* Notes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">NOTES</span>
                </div>
                {!isEditingNotes && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => setIsEditingNotes(true)}
                  >
                    Edit
                  </Button>
                )}
              </div>
              {isEditingNotes ? (
                <div className="space-y-2">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full min-h-[100px] p-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-y"
                    placeholder="Add notes..."
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveNotes}
                      disabled={isSavingNotes}
                      className="h-7"
                    >
                      <Save className="h-3 w-3 mr-1" />
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
                      className="h-7"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="text-sm text-muted-foreground whitespace-pre-wrap min-h-[50px] p-2 bg-muted/20 rounded-md cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setIsEditingNotes(true)}
                >
                  {notes || <span className="italic text-muted-foreground/60">Click to add notes...</span>}
                </div>
              )}
            </div>

            {/* Relationships */}
            {((ticket.blocks_tickets && ticket.blocks_tickets.length > 0) ||
              (ticket.blocked_by_tickets && ticket.blocked_by_tickets.length > 0) ||
              (ticket.caused_by_tickets && ticket.caused_by_tickets.length > 0)) && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Link2 className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">RELATIONSHIPS</span>
                </div>

                <div className="space-y-3">
                  {/* Blocks */}
                  {ticket.blocks_tickets && ticket.blocks_tickets.length > 0 && (
                    <div>
                      <div className="text-xs text-destructive mb-1">Blocks</div>
                      <div className="space-y-1">
                        {ticket.blocks_tickets.map((id) => (
                          <div
                            key={id}
                            className="px-2 py-1 bg-muted/50 border border-border rounded text-xs font-mono text-muted-foreground"
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
                      <div className="text-xs text-orange-500 mb-1">Blocked by</div>
                      <div className="space-y-1">
                        {ticket.blocked_by_tickets.map((id) => (
                          <div
                            key={id}
                            className="px-2 py-1 bg-muted/50 border border-border rounded text-xs font-mono text-muted-foreground"
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
                      <div className="text-xs text-yellow-500 mb-1">Caused by</div>
                      <div className="space-y-1">
                        {ticket.caused_by_tickets.map((id) => (
                          <div
                            key={id}
                            className="px-2 py-1 bg-muted/50 border border-border rounded text-xs font-mono text-muted-foreground"
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
              <div className="space-y-2 text-xs text-muted-foreground">
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
    </>
  )
}