"use client"

import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import type { GraphTicket } from '@/lib/types'
import { getCrossSliceDependencies } from './utils'
import { cn } from '@/lib/utils'
import { CopyTicketId } from '@/components/copy-ticket-id'

interface ExpandedTicketNodeData {
  ticket: GraphTicket
  expanded: boolean
  status: 'completed' | 'in-progress' | 'blocked' | 'queued'
  allTickets?: GraphTicket[]
  onCrossSliceClick?: (ticketId: string, sliceId: string) => void
}

function ExpandedTicketNodeComponent({ data }: NodeProps<ExpandedTicketNodeData>) {
  const { ticket, status, allTickets, onCrossSliceClick } = data
  const blockedBy = ticket.blocked_by || []

  const crossSliceDeps = allTickets
    ? getCrossSliceDependencies(ticket, allTickets)
    : []

  const statusBadgeClasses = {
    completed: 'bg-green-800 text-green-400',
    'in-progress': 'bg-blue-800 text-blue-400',
    blocked: 'bg-red-800 text-red-400',
    queued: 'bg-zinc-800 text-zinc-500',
  }

  const statusNodeClasses = {
    completed: 'border-green-800',
    'in-progress': 'border-blue-700',
    blocked: 'border-red-800',
    queued: 'border-zinc-700',
  }

  const statusHeaderClasses = {
    completed: 'bg-gradient-to-br from-green-950/40 to-transparent',
    'in-progress': 'bg-gradient-to-br from-blue-950/40 to-transparent',
    blocked: 'bg-gradient-to-br from-red-950/40 to-transparent',
    queued: 'bg-gradient-to-br from-zinc-900/40 to-transparent',
  }

  return (
    <div className={cn("ticket-expanded bg-zinc-900 border-2 rounded-xl w-[280px] overflow-hidden", statusNodeClasses[status])}>
      <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !border-2 !border-zinc-900 !bg-zinc-600" />

      {/* Header */}
      <div className={cn("p-3 border-b border-zinc-800", statusHeaderClasses[status])}>
        <CopyTicketId ticketId={ticket.ticket_id} className="text-[9px] text-zinc-500 hover:text-zinc-300 mb-1" iconClassName="h-2 w-2" />
        <div className="text-xs font-semibold text-zinc-200 leading-tight mb-2">{ticket.title}</div>
        <div className="flex justify-between items-center">
          <span className="text-[9px] text-zinc-500">
            {blockedBy.length > 0
              ? `← ${blockedBy.length} dep${blockedBy.length > 1 ? 's' : ''}`
              : 'No deps'}
          </span>
          <span
            className={cn('text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase', statusBadgeClasses[status])}
          >
            {status.replace('-', ' ')}
          </span>
        </div>

        {/* Cross-slice dependency badges */}
        {crossSliceDeps.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {crossSliceDeps.map((dep) => (
              <button
                key={dep.ticketId}
                onClick={(e) => {
                  e.stopPropagation()
                  onCrossSliceClick?.(dep.ticketId, dep.sliceId)
                }}
                className="text-[8px] px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-400 border border-amber-700 hover:bg-amber-800/50 transition-colors"
                title={`Blocked by ${dep.ticketId} (different slice)`}
              >
                ⚠ {dep.ticketId.slice(-6)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Description / body area */}
      <div className="p-3 bg-zinc-950/50">
        {ticket.description ? (
          <p className="text-[10px] text-zinc-400 line-clamp-4">{ticket.description}</p>
        ) : (
          <div className="text-[10px] text-zinc-500 text-center py-4">
            No description
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !border-2 !border-zinc-900 !bg-zinc-600" />
    </div>
  )
}

export const ExpandedTicketNode = memo(ExpandedTicketNodeComponent)
