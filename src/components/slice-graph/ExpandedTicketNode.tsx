"use client"

import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import type { GraphTicket, PipelineStep } from '@/lib/types'
import { getAgentIcon, getAgentName, getCrossSliceDependencies } from './utils'
import { cn } from '@/lib/utils'
import { CopyTicketId } from '@/components/copy-ticket-id'

interface ExpandedTicketNodeData {
  ticket: GraphTicket
  expanded: boolean
  status: 'completed' | 'in-progress' | 'blocked' | 'queued'
  allTickets?: GraphTicket[]
  onStepClick?: (ticket: GraphTicket, step: PipelineStep) => void
  onCrossSliceClick?: (ticketId: string, sliceId: string) => void
}

function StepRow({
  step,
  onClick,
}: {
  step: PipelineStep
  onClick?: () => void
}) {
  const statusClasses = {
    completed: 'bg-green-700 border-green-500',
    running: 'bg-blue-800 border-blue-500 animate-pulse',
    awaiting_approval: 'bg-amber-800 border-amber-500 animate-pulse cursor-pointer hover:bg-amber-700',
    queued: 'bg-zinc-800 border-zinc-600',
    failed: 'bg-red-800 border-red-500',
    skipped: 'bg-zinc-700 border-zinc-500 opacity-50',
  }

  const statusTextClasses = {
    completed: 'text-green-400',
    running: 'text-blue-400',
    awaiting_approval: 'text-amber-400',
    queued: 'text-zinc-500',
    failed: 'text-red-400',
    skipped: 'text-zinc-500',
  }

  const statusLabels = {
    completed: '✓ Completed',
    running: '▶ Running...',
    awaiting_approval: '⏳ Awaiting',
    queued: '○ Queued',
    failed: '✗ Failed',
    skipped: '⊘ Skipped',
  }

  const typeClasses = step.execution_type === 'manual' ? 'border-dashed' : 'border-solid'
  const isClickable = step.status === 'awaiting_approval'

  return (
    <div
      className={cn(
        'flex items-center gap-2.5 py-1.5 border-b border-zinc-800 last:border-b-0',
        isClickable && 'cursor-pointer hover:bg-zinc-800/50 rounded -mx-1 px-1'
      )}
      onClick={isClickable ? onClick : undefined}
    >
      <div
        className={cn(
          'w-[26px] h-[26px] rounded-md flex items-center justify-center text-[13px] border',
          statusClasses[step.status],
          typeClasses
        )}
      >
        {getAgentIcon(step.agent_type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-semibold text-zinc-200 truncate">
          {getAgentName(step.agent_type)}
          {step.execution_type === 'manual' && (
            <span className="ml-1 text-[9px] text-amber-400">(manual)</span>
          )}
        </div>
        <div className={cn('text-[9px] mt-0.5', statusTextClasses[step.status])}>
          {statusLabels[step.status]}
        </div>
      </div>
    </div>
  )
}

function ExpandedTicketNodeComponent({ data }: NodeProps<ExpandedTicketNodeData>) {
  const { ticket, status, allTickets, onStepClick, onCrossSliceClick } = data
  const steps = ticket.pipeline?.steps || []
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

      {/* Steps body */}
      <div className="p-3 bg-zinc-950/50">
        {steps.length > 0 ? (
          steps.map((step, i) => (
            <StepRow
              key={i}
              step={step}
              onClick={() => onStepClick?.(ticket, step)}
            />
          ))
        ) : (
          <div className="text-[10px] text-zinc-500 text-center py-4">
            No pipeline configured
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !border-2 !border-zinc-900 !bg-zinc-600" />
    </div>
  )
}

export const ExpandedTicketNode = memo(ExpandedTicketNodeComponent)
