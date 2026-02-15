import ELK from 'elkjs/lib/elk.bundled.js'
import { MarkerType, type Node, type Edge } from 'reactflow'
import type { GraphTicket, PipelineStep, Epic, Slice } from '@/lib/types'

const elk = new ELK()

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
export function getAgentIcon(agentType: string): string {
  switch (agentType) {
    case 'vendor-research': return '🏢'
    case 'technical-research': return '🔍'
    case 'competitive-research': return '📊'
    case 'research': return '🔍'
    case 'planning': return '📋'
    case 'execution': return '⚡'
    case 'evaluation': return '🔎'
    case 'email': return '📧'
    case 'build': return '🔨'
    default: return '⚙️'
  }
}

/**
 * Get display name for agent type
 */
export function getAgentName(agentType: string): string {
  switch (agentType) {
    case 'vendor-research': return 'Vendor Research'
    case 'technical-research': return 'Technical Research'
    case 'competitive-research': return 'Competitive Research'
    case 'research': return 'Research'
    case 'planning': return 'Plan Review'
    case 'execution': return 'Execute'
    case 'evaluation': return 'Evaluate'
    case 'email': return 'Email'
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
  if (!pipeline || !pipeline.steps || pipeline.steps.length === 0) {
    if (ticket.status === 'completed' || ticket.status === 'closed') return 'completed'
    if (ticket.status === 'blocked') return 'blocked'
    if (ticket.status === 'in_progress' || ticket.status === 'pending-enrichment') return 'in-progress'
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
 * Layout nodes using ELK layered algorithm (slice view)
 */
export async function getLayoutedElements(
  tickets: GraphTicket[],
  expandedIds: Set<string>,
  sliceId: string
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  // Filter to only tickets in this slice
  const sliceTickets = tickets.filter(t => t.slice_id === sliceId)

  if (sliceTickets.length === 0) {
    return { nodes: [], edges: [] }
  }

  // Build ELK graph
  const elkNodes = sliceTickets.map(ticket => {
    const isExpanded = expandedIds.has(ticket.ticket_id)
    const stepsCount = ticket.pipeline?.steps?.length || 5
    return {
      id: ticket.ticket_id,
      width: isExpanded ? NODE_WIDTH_EXPANDED : NODE_WIDTH_COLLAPSED,
      height: isExpanded ? getExpandedHeight(stepsCount) : NODE_HEIGHT_COLLAPSED,
    }
  })

  const sliceTicketIds = new Set(sliceTickets.map(t => t.ticket_id))
  const elkEdges: { id: string; sources: string[]; targets: string[] }[] = []
  sliceTickets.forEach(ticket => {
    const blockedBy = ticket.blocked_by || []
    blockedBy.forEach(depId => {
      if (sliceTicketIds.has(depId)) {
        elkEdges.push({
          id: `${depId}->${ticket.ticket_id}`,
          sources: [depId],
          targets: [ticket.ticket_id],
        })
      }
    })
  })

  const elkGraph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.spacing.nodeNodeBetweenLayers': '100',
      'elk.spacing.nodeNode': '80',
      'elk.padding': '[top=40,left=40,bottom=40,right=40]',
    },
    children: elkNodes,
    edges: elkEdges,
  }

  const layout = await elk.layout(elkGraph)

  // Convert to React Flow format — ELK returns top-left positions directly
  const nodes: Node[] = (layout.children || []).map(elkNode => {
    const ticket = sliceTickets.find(t => t.ticket_id === elkNode.id)!
    const isExpanded = expandedIds.has(ticket.ticket_id)

    return {
      id: ticket.ticket_id,
      type: isExpanded ? 'expandedTicket' : 'ticket',
      position: {
        x: elkNode.x!,
        y: elkNode.y!,
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
    const blockedBy = ticket.blocked_by || []
    blockedBy.forEach(depId => {
      if (!sliceTicketIds.has(depId)) return

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
 * Layout all tickets for the org using ELK layered algorithm
 */
export async function getOrgLayoutedElements(
  tickets: GraphTicket[],
  epics: Epic[],
  slices: Slice[]
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  if (tickets.length === 0) {
    return { nodes: [], edges: [] }
  }

  const sliceMap: Record<string, Slice> = {}
  for (const s of slices) sliceMap[s.slice_id] = s
  const epicMap: Record<string, Epic> = {}
  for (const e of epics) epicMap[e.epic_id] = e

  // Build ELK graph
  const elkNodes = tickets.map(ticket => ({
    id: ticket.ticket_id,
    width: NODE_WIDTH_COLLAPSED,
    height: NODE_HEIGHT_COLLAPSED,
  }))

  const ticketIds = new Set(tickets.map(t => t.ticket_id))
  const elkEdges: { id: string; sources: string[]; targets: string[] }[] = []
  tickets.forEach(ticket => {
    const blockedBy = ticket.blocked_by || []
    blockedBy.forEach(depId => {
      if (ticketIds.has(depId)) {
        elkEdges.push({
          id: `${depId}->${ticket.ticket_id}`,
          sources: [depId],
          targets: [ticket.ticket_id],
        })
      }
    })
  })

  const elkGraph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.spacing.nodeNodeBetweenLayers': '80',
      'elk.spacing.nodeNode': '60',
      'elk.padding': '[top=40,left=40,bottom=40,right=40]',
    },
    children: elkNodes,
    edges: elkEdges,
  }

  const layout = await elk.layout(elkGraph)

  // Convert to React Flow format
  const nodes: Node[] = (layout.children || []).map(elkNode => {
    const ticket = tickets.find(t => t.ticket_id === elkNode.id)!
    const slice = sliceMap[ticket.slice_id]
    const epic = epicMap[ticket.epic_id]

    return {
      id: ticket.ticket_id,
      type: 'ticket',
      position: {
        x: elkNode.x!,
        y: elkNode.y!,
      },
      data: {
        ticket,
        expanded: false,
        status: deriveTicketStatus(ticket),
        sliceTitle: slice?.title,
        epicTitle: epic?.title,
        allTickets: tickets,
      },
    }
  })

  // Create edges with styling
  const edges: Edge[] = []
  tickets.forEach(ticket => {
    const blockedBy = ticket.blocked_by || []
    blockedBy.forEach(depId => {
      if (!ticketIds.has(depId)) return

      const source = tickets.find(t => t.ticket_id === depId)
      const sourceStatus = source ? deriveTicketStatus(source) : 'queued'
      const targetStatus = deriveTicketStatus(ticket)
      const isResolved = sourceStatus === 'completed'
      const isBlocking = targetStatus === 'blocked' && !isResolved
      const isCrossSlice = source?.slice_id !== ticket.slice_id

      edges.push({
        id: `${depId}->${ticket.ticket_id}`,
        source: depId,
        target: ticket.ticket_id,
        type: 'smoothstep',
        animated: !isResolved && targetStatus !== 'queued',
        style: {
          stroke: isResolved ? '#22c55e' : isBlocking ? '#ef4444' : isCrossSlice ? '#f59e0b' : '#3f3f46',
          strokeWidth: isCrossSlice ? 2.5 : 2,
          opacity: targetStatus === 'queued' ? 0.4 : 1,
          strokeDasharray: isCrossSlice ? '5,5' : undefined,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isResolved ? '#22c55e' : isBlocking ? '#ef4444' : isCrossSlice ? '#f59e0b' : '#3f3f46',
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
  const blockedBy = ticket.blocked_by || []
  return blockedBy
    .map(depId => {
      const dep = allTickets.find(t => t.ticket_id === depId)
      if (!dep || dep.slice_id === ticket.slice_id) return null
      return { ticketId: depId, sliceId: dep.slice_id }
    })
    .filter((d): d is { ticketId: string; sliceId: string } => d !== null)
}
