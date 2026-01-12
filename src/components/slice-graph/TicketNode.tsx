"use client"

import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import type { GraphTicket, PipelineStep } from '@/lib/types'
import { getAgentIcon, getCrossSliceDependencies } from './utils'
import { cn } from '@/lib/utils'

interface TicketNodeData {
  ticket: GraphTicket
  expanded: boolean
  status: 'completed' | 'in-progress' | 'blocked' | 'queued'
  allTickets?: GraphTicket[]
  onCrossSliceClick?: (ticketId: string, sliceId: string) => void
}

function StepDot({ step }: { step: PipelineStep }) {
  const statusClasses = {
    completed: 'bg-green-700 border-green-500',
    running: 'bg-blue-800 border-blue-500 animate-pulse',
    awaiting_approval: 'bg-amber-800 border-amber-500 animate-pulse',
    queued: 'bg-zinc-800 border-zinc-600',
    failed: 'bg-red-800 border-red-500',
  }

  const typeClasses = step.step_type === 'manual' ? 'border-dashed' : 'border-solid'

  return (
    <div
      className={cn(
        'w-5 h-5 rounded flex items-center justify-center text-[11px] border',
        statusClasses[step.status],
        typeClasses
      )}
      title={`${step.agent_type} - ${step.status}`}
    >
      {getAgentIcon(step.agent_type)}
    </div>
  )
}

function TicketNodeComponent({ data }: NodeProps<TicketNodeData>) {
  const { ticket, status, allTickets, onCrossSliceClick } = data
  const steps = ticket.pipeline?.steps || []
  const blockedBy = ticket.blocked_by_tickets || []

  // Check for cross-slice dependencies
  const crossSliceDeps = allTickets
    ? getCrossSliceDependencies(ticket, allTickets)
    : []

  const statusClasses = {
    completed: 'border-green-800 bg-gradient-to-br from-green-950/30 to-zinc-900',
    'in-progress': 'border-blue-700 bg-gradient-to-br from-blue-950/30 to-zinc-900',
    blocked: 'border-red-800 bg-gradient-to-br from-red-950/30 to-zinc-900',
    queued: 'border-zinc-700 opacity-70',
  }

  const statusBadgeClasses = {
    completed: 'bg-green-800 text-green-400',
    'in-progress': 'bg-blue-800 text-blue-400',
    blocked: 'bg-red-800 text-red-400',
    queued: 'bg-zinc-800 text-zinc-500',
  }

  return (
    <div className={cn('ticket-node bg-zinc-900 border-2 rounded-lg p-3.5 w-[200px] text-zinc-200', statusClasses[status])}>
      <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !border-2 !border-zinc-900 !bg-zinc-600" />

      {/* Ticket ID */}
      <div className="font-mono text-[9px] text-zinc-500 mb-1">{ticket.ticket_id}</div>

      {/* Title */}
      <div className="text-xs font-semibold leading-tight mb-2.5 line-clamp-2">{ticket.title}</div>

      {/* Pipeline mini progress */}
      {steps.length > 0 && (
        <div className="flex gap-1 mb-2.5 flex-wrap">
          {steps.map((step, i) => (
            <StepDot key={i} step={step} />
          ))}
        </div>
      )}

      {/* Meta row */}
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
        <div className="mt-2 pt-2 border-t border-zinc-800">
          <div className="flex flex-wrap gap-1">
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
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !border-2 !border-zinc-900 !bg-zinc-600" />
    </div>
  )
}

export const TicketNode = memo(TicketNodeComponent)
