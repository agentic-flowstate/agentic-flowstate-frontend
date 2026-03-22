"use client"

import { FileText, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getAttachmentUrl } from '@/lib/api/dms'
import type { DmAttachment } from '@/lib/types/dms'

export function isImageType(contentType: string): boolean {
  return contentType.startsWith('image/')
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatTime(ts: number): string {
  const date = new Date(ts * 1000)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function AttachmentDisplay({ attachment, dmId, isMe }: { attachment: DmAttachment; dmId: string; isMe: boolean }) {
  const url = getAttachmentUrl(dmId, attachment.id)

  if (isImageType(attachment.content_type)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={attachment.filename}
          className="max-w-full max-h-64 rounded-lg object-contain"
        />
        <span className={cn(
          "text-[10px] mt-0.5 block",
          isMe ? "text-primary-foreground/60" : "text-muted-foreground"
        )}>
          {attachment.filename} ({formatFileSize(attachment.size_bytes)})
        </span>
      </a>
    )
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center gap-2 mt-1.5 px-2.5 py-1.5 rounded-lg border transition-colors",
        isMe
          ? "border-primary-foreground/20 hover:bg-primary-foreground/10"
          : "border-border hover:bg-accent/50"
      )}
    >
      <FileText className="h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium truncate">{attachment.filename}</div>
        <div className={cn(
          "text-[10px]",
          isMe ? "text-primary-foreground/60" : "text-muted-foreground"
        )}>
          {formatFileSize(attachment.size_bytes)}
        </div>
      </div>
      <Download className="h-3.5 w-3.5 shrink-0 opacity-50" />
    </a>
  )
}
