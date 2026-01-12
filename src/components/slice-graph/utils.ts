import dagre from '@dagrejs/dagre'
import { MarkerType, type Node, type Edge } from 'reactflow'
import type { GraphTicket, PipelineStep, AgentType } from '@/lib/types'

// Node dimensions
export const NODE_WIDTH_COLLAPSED = 200
export const NODE_HEIGHT_COLLAPSED = 130
export const NODE_WIDTH_EXPANDED = 280
export const STEP_HEIGHT = 36
export const EXPANDED_HEADER_HEIGHT = 80
export const EXPANDED_PADDING = 24

/**
 * Calculate expanded node height based on number of steps
 */
export function getExpandedHeight(stepsCount: number): number {
  return EXPANDED_HEADER_HEIGHT + (stepsCount * STEP_HEIGHT) + EXPANDED_PADDING
}

/**
 * Get icon for agent type
 */
export function getAgentIcon(agentType: AgentType): string {
  switch (agentType) {
    case 'research': return '🔍'
    case 'planning': return '📋'
    case 'execution': return '⚡'
    case 'evaluation': return '🔎'
    case 'build': return '🔨'
    default: return '⚙️'
  }
}

/**
 * Get display name for agent type
 */
export function getAgentName(agentType: AgentType): string {
  switch (agentType) {
    case 'research': return 'Research'
    case 'planning': return 'Plan Review'
    case 'execution': return 'Execute'
    case 'evaluation': return 'Evaluate'
    case 'build': return 'Build & Test'
    default: return agentType
  }
}

/**
 * Derive effective ticket status from pipeline steps
 */
export function deriveTicketStatus(ticket: GraphTicket): 'completed' | 'in-progress' | 'blocked' | 'queued' {
  const pipeline = ticket.pipeline

  // If no pipeline, use ticket status
  if (!pipeline || pipeline.steps.length === 0) {
    if (ticket.status === 'completed' || ticket.status === 'closed') return 'completed'
    if (ticket.status === 'blocked') return 'blocked'
    if (ticket.status === 'in_progress') return 'in-progress'
    return 'queued'
  }

  const steps = pipeline.steps
  const allCompleted = steps.every(s => s.status === 'completed')
  const anyRunning = steps.some(s => s.status === 'running')
  const anyAwaiting = steps.some(s => s.status === 'awaiting_approval')
  const anyFailed = steps.some(s => s.status === 'failed')

  if (allCompleted) return 'completed'
  if (anyFailed || ticket.status === 'blocked') return 'blocked'
  if (anyRunning || anyAwaiting) return 'in-progress'
  return 'queued'
}

/**
 * Layout nodes using dagre algorithm
 */
export function getLayoutedElements(
  tickets: GraphTicket[],
  expandedIds: Set<string>,
  sliceId: string
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({
    rankdir: 'TB',
    nodesep: 80,
    ranksep: 100,
    marginx: 40,
    marginy: 40,
  })

  // Filter to only tickets in this slice
  const sliceTickets = tickets.filter(t => t.slice_id === sliceId)

  // Add nodes with dimensions based on expand state
  sliceTickets.forEach(ticket => {
    const isExpanded = expandedIds.has(ticket.ticket_id)
    const stepsCount = ticket.pipeline?.steps.length || 5

    g.setNode(ticket.ticket_id, {
      width: isExpanded ? NODE_WIDTH_EXPANDED : NODE_WIDTH_COLLAPSED,
      height: isExpanded ? getExpandedHeight(stepsCount) : NODE_HEIGHT_COLLAPSED,
    })
  })

  // Add edges for dependencies within this slice
  sliceTickets.forEach(ticket => {
    const blockedBy = ticket.blocked_by_tickets || []
    blockedBy.forEach(depId => {
      // Only add edge if dependency is in this slice
      if (sliceTickets.some(t => t.ticket_id === depId)) {
        g.setEdge(depId, ticket.ticket_id)
      }
    })
  })

  dagre.layout(g)

  // Convert to React Flow format
  const nodes: Node[] = sliceTickets.map(ticket => {
    const node = g.node(ticket.ticket_id)
    const isExpanded = expandedIds.has(ticket.ticket_id)

    return {
      id: ticket.ticket_id,
      type: isExpanded ? 'expandedTicket' : 'ticket',
      position: {
        x: node.x - node.width / 2,
        y: node.y - node.height / 2,
      },
      data: {
        ticket,
        expanded: isExpanded,
        status: deriveTicketStatus(ticket),
      },
    }
  })

  // Create edges with styling based on dependency status
  const edges: Edge[] = []
  sliceTickets.forEach(ticket => {
    const blockedBy = ticket.blocked_by_tickets || []
    blockedBy.forEach(depId => {
      if (!sliceTickets.some(t => t.ticket_id === depId)) return

      const source = sliceTickets.find(t => t.ticket_id === depId)
      const sourceStatus = source ? deriveTicketStatus(source) : 'queued'
      const targetStatus = deriveTicketStatus(ticket)
      const isResolved = sourceStatus === 'completed'
      const isBlocking = targetStatus === 'blocked' && !isResolved

      edges.push({
        id: `${depId}->${ticket.ticket_id}`,
        source: depId,
        target: ticket.ticket_id,
        type: 'smoothstep',
        animated: !isResolved && targetStatus !== 'queued',
        style: {
          stroke: isResolved ? '#22c55e' : isBlocking ? '#ef4444' : '#3f3f46',
          strokeWidth: 2,
          opacity: targetStatus === 'queued' ? 0.4 : 1,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isResolved ? '#22c55e' : isBlocking ? '#ef4444' : '#3f3f46',
        },
      })
    })
  })

  return { nodes, edges }
}

/**
 * Find cross-slice dependencies for a ticket
 */
export function getCrossSliceDependencies(
  ticket: GraphTicket,
  allTickets: GraphTicket[]
): Array<{ ticketId: string; sliceId: string }> {
  const blockedBy = ticket.blocked_by_tickets || []
  return blockedBy
    .map(depId => {
      const dep = allTickets.find(t => t.ticket_id === depId)
      if (!dep || dep.slice_id === ticket.slice_id) return null
      return { ticketId: depId, sliceId: dep.slice_id }
    })
    .filter((d): d is { ticketId: string; sliceId: string } => d !== null)
}
