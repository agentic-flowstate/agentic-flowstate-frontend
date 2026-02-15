"use client"

import React, { useEffect, useState } from 'react'
import { Loader2, FileText } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { markdownComponents } from '@/components/message-renderer/MessageRenderer'

interface DocumentViewerModalProps {
  isOpen: boolean
  onClose: () => void
  ticketId: string
  docPath: string | null
}

export function DocumentViewerModal({ isOpen, onClose, ticketId, docPath }: DocumentViewerModalProps) {
  const [content, setContent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!isOpen || !docPath) {
      setContent(null)
      setError(null)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setContent(null)
    setError(null)

    fetch(`/api/tickets/${ticketId}/docs/content?path=${encodeURIComponent(docPath)}`, {
      credentials: 'include',
    })
      .then(async (res) => {
        if (cancelled) return
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: 'Failed to load document' }))
          throw new Error(body.error || `HTTP ${res.status}`)
        }
        return res.text()
      })
      .then((text) => {
        if (cancelled || text === undefined) return
        setContent(text)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.message || 'Failed to load document')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [isOpen, ticketId, docPath])

  const filename = docPath?.split('/').pop() || docPath || ''

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-muted-foreground" />
            {filename}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive py-4 text-center">
              {error}
            </div>
          )}

          {content !== null && (
            <div className="prose prose-sm dark:prose-invert max-w-none text-sm px-1">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
