import { MarkerType, type Node, type Edge } from 'reactflow'
import type { GraphTicket, Epic, Slice } from '@/lib/types'
import { NODE_WIDTH_COLLAPSED, NODE_HEIGHT_COLLAPSED } from './utils'
import { deriveTicketStatus } from './utils'

// Layout constants
const TRUNK_X = 500
const MILESTONE_W = 180
const MILESTONE_H = 180
const TASK_W = NODE_WIDTH_COLLAPSED   // 200
const TASK_H = NODE_HEIGHT_COLLAPSED  // 130
const VERTICAL_GAP = 120
const TASK_GAP_X = 80
const TASK_GAP_Y = 40
const BRANCH_OFFSET_X = -450

/**
 * Custom roadmap layout: milestones with roadmap_position form a vertical trunk,
 * tasks branch off to the right, branch milestones go to the left.
 */
export function getRoadmapLayoutedElements(
  tickets: GraphTicket[],
  epics: Epic[],
  slices: Slice[]
): { nodes: Node[]; edges: Edge[] } {
  if (tickets.length === 0) {
    return { nodes: [], edges: [] }
  }

  const sliceLookup: Record<string, Slice> = {}
  for (const s of slices) sliceLookup[s.slice_id] = s
  const epicLookup: Record<string, Epic> = {}
  for (const e of epics) epicLookup[e.epic_id] = e
  const ticketLookup: Record<string, GraphTicket> = {}
  for (const t of tickets) ticketLookup[t.ticket_id] = t

  // Separate trunk milestones from branch milestones and tasks
  const trunkMilestones: GraphTicket[] = []
  const branchMilestones: GraphTicket[] = []
  const tasks: GraphTicket[] = []

  for (const t of tickets) {
    if (t.ticket_type === 'milestone') {
      if (t.roadmap_position != null) {
        trunkMilestones.push(t)
      } else {
        branchMilestones.push(t)
      }
    } else {
      tasks.push(t)
    }
  }

  // Sort trunk by roadmap_position ascending
  trunkMilestones.sort((a, b) => (a.roadmap_position ?? 0) - (b.roadmap_position ?? 0))

  // Group tasks by milestone_id
  const tasksByMilestone: Record<string, GraphTicket[]> = {}
  for (const task of tasks) {
    const mid = task.milestone_id || task.blocked_by?.find(id => {
      const dep = ticketLookup[id]
      return dep?.ticket_type === 'milestone'
    }) || '_unassigned'
    if (!tasksByMilestone[mid]) {
      tasksByMilestone[mid] = []
    }
    tasksByMilestone[mid].push(task)
  }

  const nodes: Node[] = []
  const edges: Edge[] = []
  const positionOf: Record<string, { x: number; y: number }> = {}

  let currentY = 40

  // Place trunk milestones top to bottom
  for (let i = 0; i < trunkMilestones.length; i++) {
    const milestone = trunkMilestones[i]
    const milestoneTasks = tasksByMilestone[milestone.ticket_id] || []

    // Place milestone diamond at center
    const mx = TRUNK_X
    const my = currentY
    positionOf[milestone.ticket_id] = { x: mx, y: my }

    const slice = sliceLookup[milestone.slice_id]
    const epic = epicLookup[milestone.epic_id]

    nodes.push({
      id: milestone.ticket_id,
      type: 'ticket',
      position: { x: mx, y: my },
      data: {
        ticket: milestone,
        expanded: false,
        status: deriveTicketStatus(milestone),
        sliceTitle: slice?.title,
        epicTitle: epic?.title,
        allTickets: tickets,
        isRoadmapTrunk: true,
      },
    })

    // Place tasks to the right, stacked vertically
    let taskY = my
    const taskX = mx + MILESTONE_W + TASK_GAP_X
    for (const task of milestoneTasks) {
      positionOf[task.ticket_id] = { x: taskX, y: taskY }
      const tSlice = sliceLookup[task.slice_id]
      const tEpic = epicLookup[task.epic_id]

      nodes.push({
        id: task.ticket_id,
        type: 'ticket',
        position: { x: taskX, y: taskY },
        data: {
          ticket: task,
          expanded: false,
          status: deriveTicketStatus(task),
          sliceTitle: tSlice?.title,
          epicTitle: tEpic?.title,
          allTickets: tickets,
        },
      })

      // Edge: task -> milestone (horizontal)
      edges.push({
        id: `task-${task.ticket_id}->${milestone.ticket_id}`,
        source: task.ticket_id,
        target: milestone.ticket_id,
        type: 'smoothstep',
        style: {
          stroke: '#3f3f46',
          strokeWidth: 1.5,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#3f3f46',
        },
      })

      taskY += TASK_H + TASK_GAP_Y
    }

    // Calculate how tall this row is
    const tasksBlockHeight = milestoneTasks.length > 0
      ? milestoneTasks.length * (TASK_H + TASK_GAP_Y) - TASK_GAP_Y
      : 0
    const rowHeight = Math.max(MILESTONE_H, tasksBlockHeight)

    // Trunk spine edge to next milestone
    if (i < trunkMilestones.length - 1) {
      edges.push({
        id: `trunk-${milestone.ticket_id}->${trunkMilestones[i + 1].ticket_id}`,
        source: milestone.ticket_id,
        target: trunkMilestones[i + 1].ticket_id,
        type: 'smoothstep',
        style: {
          stroke: '#8b5cf6',
          strokeWidth: 3,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#8b5cf6',
        },
      })
    }

    currentY += rowHeight + VERTICAL_GAP
  }

  // Place branch milestones to the left of their trunk parent
  // Track the next available Y per trunk parent to prevent overlap
  let branchNextY = currentY
  for (const branch of branchMilestones) {
    // Find trunk parent via blocked_by
    let parentId: string | null = null

    if (branch.blocked_by) {
      for (const depId of branch.blocked_by) {
        if (positionOf[depId]) {
          parentId = depId
          break
        }
      }
    }

    // Also check if any trunk milestone blocks this one
    if (!parentId) {
      for (const trunk of trunkMilestones) {
        if (trunk.blocks?.includes(branch.ticket_id)) {
          parentId = trunk.ticket_id
          break
        }
      }
    }

    const branchTasks = tasksByMilestone[branch.ticket_id] || []

    const bx = TRUNK_X + BRANCH_OFFSET_X
    const by = branchNextY
    positionOf[branch.ticket_id] = { x: bx, y: by }

    const slice = sliceLookup[branch.slice_id]
    const epic = epicLookup[branch.epic_id]

    nodes.push({
      id: branch.ticket_id,
      type: 'ticket',
      position: { x: bx, y: by },
      data: {
        ticket: branch,
        expanded: false,
        status: deriveTicketStatus(branch),
        sliceTitle: slice?.title,
        epicTitle: epic?.title,
        allTickets: tickets,
      },
    })

    // Branch tasks further left
    let branchTaskY = by
    const branchTaskX = bx - TASK_W - TASK_GAP_X
    for (const task of branchTasks) {
      positionOf[task.ticket_id] = { x: branchTaskX, y: branchTaskY }
      const tSlice = sliceLookup[task.slice_id]
      const tEpic = epicLookup[task.epic_id]

      nodes.push({
        id: task.ticket_id,
        type: 'ticket',
        position: { x: branchTaskX, y: branchTaskY },
        data: {
          ticket: task,
          expanded: false,
          status: deriveTicketStatus(task),
          sliceTitle: tSlice?.title,
          epicTitle: tEpic?.title,
          allTickets: tickets,
        },
      })

      edges.push({
        id: `task-${task.ticket_id}->${branch.ticket_id}`,
        source: task.ticket_id,
        target: branch.ticket_id,
        type: 'smoothstep',
        style: {
          stroke: '#3f3f46',
          strokeWidth: 1.5,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#3f3f46',
        },
      })

      branchTaskY += TASK_H + TASK_GAP_Y
    }

    // Dashed edge from branch to trunk parent
    if (parentId) {
      edges.push({
        id: `branch-${branch.ticket_id}->${parentId}`,
        source: branch.ticket_id,
        target: parentId,
        type: 'smoothstep',
        style: {
          stroke: '#8b5cf6',
          strokeWidth: 2,
          strokeDasharray: '6,4',
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#8b5cf6',
        },
      })
    }

    // Advance branchNextY past this branch + its tasks
    const branchBlockHeight = Math.max(MILESTONE_H, branchTasks.length > 0
      ? branchTasks.length * (TASK_H + TASK_GAP_Y) - TASK_GAP_Y
      : 0)
    branchNextY += branchBlockHeight + VERTICAL_GAP
  }

  // Place unassigned tasks (no milestone) at the bottom
  const unassigned = tasksByMilestone['_unassigned'] || []
  if (unassigned.length > 0) {
    let uy = currentY + 40
    for (const task of unassigned) {
      positionOf[task.ticket_id] = { x: TRUNK_X + MILESTONE_W + TASK_GAP_X, y: uy }
      const slice = sliceLookup[task.slice_id]
      const epic = epicLookup[task.epic_id]

      nodes.push({
        id: task.ticket_id,
        type: 'ticket',
        position: { x: TRUNK_X + MILESTONE_W + TASK_GAP_X, y: uy },
        data: {
          ticket: task,
          expanded: false,
          status: deriveTicketStatus(task),
          sliceTitle: slice?.title,
          epicTitle: epic?.title,
          allTickets: tickets,
        },
      })

      uy += TASK_H + TASK_GAP_Y
    }
  }

  // Add cross-milestone task dependency edges (thin, animated)
  const nodeIdSet: Record<string, boolean> = {}
  for (const n of nodes) nodeIdSet[n.id] = true
  for (const task of tasks) {
    if (!task.blocked_by) continue
    for (const depId of task.blocked_by) {
      if (!nodeIdSet[depId]) continue
      const dep = ticketLookup[depId]
      // Skip edges to own milestone (already drawn above)
      if (dep?.ticket_type === 'milestone' && dep.ticket_id === task.milestone_id) continue
      // Skip if we already have this edge
      const edgeId = `dep-${depId}->${task.ticket_id}`
      if (edges.some(e => e.id === edgeId)) continue

      const source = ticketLookup[depId]
      const sourceStatus = source ? deriveTicketStatus(source) : 'queued'
      const isResolved = sourceStatus === 'completed'

      edges.push({
        id: edgeId,
        source: depId,
        target: task.ticket_id,
        type: 'smoothstep',
        animated: !isResolved,
        style: {
          stroke: isResolved ? '#22c55e' : '#71717a',
          strokeWidth: 1,
          opacity: 0.6,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isResolved ? '#22c55e' : '#71717a',
        },
      })
    }
  }

  return { nodes, edges }
}
