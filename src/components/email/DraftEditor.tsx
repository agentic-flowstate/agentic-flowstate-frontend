"use client"

import { X, Send, Trash2, FileText, Loader2, Ticket, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmailDraft, Ticket as TicketType } from '@/lib/types'

interface DraftEdits {
  from: string
  to: string
  cc: string
  subject: string
  body: string
}

interface DraftEditorProps {
  draft: EmailDraft
  edits: DraftEdits
  onChange: (updates: Partial<DraftEdits>) => void
  onSave: () => void
  onSend: () => void
  onDelete: () => void
  onClose: () => void
  linkedTicket: TicketType | null
  onOpenTicket: (ticketId: string, epicId?: string, sliceId?: string) => void
  saving: boolean
  sending: boolean
  deleting: boolean
  verifiedAddresses: string[]
}

export function DraftEditor({
  draft,
  edits,
  onChange,
  onSave,
  onSend,
  onDelete,
  onClose,
  linkedTicket,
  onOpenTicket,
  saving,
  sending,
  deleting,
  verifiedAddresses,
}: DraftEditorProps) {
  return (
    <>
      {/* Draft Edit Header */}
      <div className="h-14 border-b flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
          <h2 className="font-semibold">Edit Draft</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            disabled={deleting}
            title="Delete draft"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 text-destructive" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            Save
          </Button>
          <Button
            onClick={onSend}
            disabled={sending}
            size="sm"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send
          </Button>
        </div>
      </div>

      {/* Draft Edit Form */}
      <div className="flex-1 overflow-y-auto p-4">
        <Card className="p-4 space-y-4">
          {/* Linked Ticket Info */}
          {linkedTicket && (
            <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
              <div className="flex items-center gap-2 text-sm">
                <Ticket className="h-4 w-4 text-primary" />
                <span className="font-medium">Linked to Ticket:</span>
                <button
                  onClick={() => onOpenTicket(linkedTicket.ticket_id, linkedTicket.epic_id, linkedTicket.slice_id)}
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  {linkedTicket.title}
                  <Eye className="h-3 w-3" />
                </button>
              </div>
              {linkedTicket.description && (
                <div className="text-xs text-muted-foreground mt-1 ml-6">
                  {linkedTicket.description}
                </div>
              )}
            </div>
          )}

          {/* From Address */}
          <div className="space-y-2">
            <Label htmlFor="draft-from">From</Label>
            <Select
              value={edits.from}
              onValueChange={(value) => onChange({ from: value })}
            >
              <SelectTrigger id="draft-from">
                <SelectValue placeholder="Select sender address" />
              </SelectTrigger>
              <SelectContent>
                {verifiedAddresses.map((addr) => (
                  <SelectItem key={addr} value={addr}>
                    {addr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="draft-to">To</Label>
            <Input
              id="draft-to"
              type="email"
              placeholder="recipient@example.com"
              value={edits.to}
              onChange={(e) => onChange({ to: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="draft-cc">Cc</Label>
            <Input
              id="draft-cc"
              type="email"
              placeholder="cc@example.com (optional)"
              value={edits.cc}
              onChange={(e) => onChange({ cc: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="draft-subject">Subject</Label>
            <Input
              id="draft-subject"
              placeholder="Email subject"
              value={edits.subject}
              onChange={(e) => onChange({ subject: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="draft-body">Message</Label>
            <textarea
              id="draft-body"
              className="w-full min-h-[300px] p-3 rounded-md border border-input bg-background text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Write your message..."
              value={edits.body}
              onChange={(e) => onChange({ body: e.target.value })}
            />
          </div>

          {draft.notes && (
            <div className="bg-cyan-500/10 rounded-lg p-4 border border-cyan-500/20">
              <div className="text-xs font-medium text-cyan-500 mb-1">Agent Notes</div>
              <div className="text-sm text-muted-foreground">{draft.notes}</div>
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
