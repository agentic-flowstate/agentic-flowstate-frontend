"use client"

import { useState } from 'react'
import { X, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ComposeState {
  from: string
  to: string
  cc: string
  subject: string
  body: string
}

interface ComposeEmailProps {
  compose: ComposeState
  onChange: (updates: Partial<ComposeState>) => void
  onSend: () => void
  onClose: () => void
  sending: boolean
  fromAddresses: string[]
  mode?: 'compose' | 'reply' | 'reply-all' | 'forward'
}

const MODE_LABELS = {
  'compose': 'New Message',
  'reply': 'Reply',
  'reply-all': 'Reply All',
  'forward': 'Forward',
} as const

export function ComposeEmail({
  compose,
  onChange,
  onSend,
  onClose,
  sending,
  fromAddresses,
  mode = 'compose',
}: ComposeEmailProps) {
  const [selectedFrom, setSelectedFrom] = useState(fromAddresses[0] || '')

  const handleFromChange = (value: string) => {
    setSelectedFrom(value)
    onChange({ from: value })
  }

  return (
    <>
      {/* Compose Header */}
      <div className="h-14 border-b flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
          <h2 className="font-semibold">{MODE_LABELS[mode]}</h2>
        </div>
        <Button
          onClick={onSend}
          disabled={sending}
          size="sm"
        >
          <Send className="h-4 w-4 mr-2" />
          {sending ? 'Sending...' : 'Send'}
        </Button>
      </div>

      {/* Compose Form */}
      <div className="flex-1 overflow-y-auto p-4">
        <Card className="p-4 space-y-4">
          {/* From Address */}
          <div className="space-y-2">
            <Label htmlFor="from">From</Label>
            {fromAddresses.length > 1 ? (
              <Select
                value={selectedFrom}
                onValueChange={handleFromChange}
              >
                <SelectTrigger id="from">
                  <SelectValue placeholder="Select sender address" />
                </SelectTrigger>
                <SelectContent>
                  {fromAddresses.map((addr) => (
                    <SelectItem key={addr} value={addr}>
                      {addr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-sm text-muted-foreground py-2">
                {fromAddresses[0] || 'No accounts configured'}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              type="email"
              placeholder="recipient@example.com"
              value={compose.to}
              onChange={(e) => onChange({ to: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Separate multiple addresses with commas
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cc">Cc</Label>
            <Input
              id="cc"
              type="email"
              placeholder="cc@example.com (optional)"
              value={compose.cc}
              onChange={(e) => onChange({ cc: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Email subject"
              value={compose.subject}
              onChange={(e) => onChange({ subject: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <textarea
              id="body"
              className="w-full min-h-[300px] p-3 rounded-md border border-input bg-background text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Write your message..."
              value={compose.body}
              onChange={(e) => onChange({ body: e.target.value })}
            />
          </div>
        </Card>
      </div>
    </>
  )
}
