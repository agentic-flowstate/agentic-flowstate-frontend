'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CopyTicketIdProps {
  ticketId: string
  className?: string
  iconClassName?: string
}

export function CopyTicketId({ ticketId, className, iconClassName = 'h-2.5 w-2.5' }: CopyTicketIdProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(ticketId)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = ticketId
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      className={cn(
        "inline-flex items-center gap-1 font-mono text-muted-foreground hover:text-foreground transition-colors",
        className
      )}
      onClick={handleCopy}
      title="Copy ticket ID"
    >
      {ticketId}
      {copied ? (
        <Check className={cn(iconClassName, "text-green-500 shrink-0")} />
      ) : (
        <Copy className={cn(iconClassName, "shrink-0")} />
      )}
    </button>
  )
}
