"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import ReactFlow, {
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type NodeMouseHandler,
  type NodeTypes,
} from 'reactflow'
import 'reactflow/dist/style.css'

import type { GraphTicket, PipelineStep, Slice } from '@/lib/types'
import { TicketNode } from './TicketNode'
import { ExpandedTicketNode } from './ExpandedTicketNode'
import { getLayoutedElements } from './utils'
import { Plus, Minus, Maximize, Lock, Unlock, Expand } from 'lucide-react'

const nodeTypes: NodeTypes = {
  ticket: TicketNode,
  expandedTicket: ExpandedTicketNode,
}

interface SliceGraphProps {
  slice: Slice
  tickets: GraphTicket[]
  allTickets: GraphTicket[] // All tickets across slices for cross-slice dep detection
  onTicketClick?: (ticket: GraphTicket) => void
  onStepClick?: (ticket: GraphTicket, step: PipelineStep) => void
  onCrossSliceClick?: (ticketId: string, sliceId: string) => void
}

export function SliceGraph({
  slice,
  tickets,
  allTickets,
  onTicketClick,
  onStepClick,
  onCrossSliceClick,
}: SliceGraphProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Calculate layout
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => getLayoutedElements(tickets, expandedIds, slice.slice_id),
    [tickets, expandedIds, slice.slice_id]
  )

  // Add callbacks and allTickets reference to node data
  const nodesWithCallbacks = useMemo(
    () =>
      layoutedNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          allTickets,
          onStepClick,
          onCrossSliceClick,
        },
      })),
    [layoutedNodes, allTickets, onStepClick, onCrossSliceClick]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(nodesWithCallbacks)
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges)

  // Re-layout when dependencies change
  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = getLayoutedElements(
      tickets,
      expandedIds,
      slice.slice_id
    )

    // Add callbacks to new nodes
    const nodesWithData = newNodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        allTickets,
        onStepClick,
        onCrossSliceClick,
      },
    }))

    setNodes(nodesWithData)
    setEdges(newEdges)
  }, [tickets, expandedIds, slice.slice_id, allTickets, onStepClick, onCrossSliceClick, setNodes, setEdges])

  // Toggle expand/collapse on node click
  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const ticket = (node.data as { ticket: GraphTicket }).ticket

      // Toggle expansion
      setExpandedIds((prev) => {
        const next = new Set(prev)
        if (next.has(ticket.ticket_id)) {
          next.delete(ticket.ticket_id)
        } else {
          next.add(ticket.ticket_id)
        }
        return next
      })

      // Also call the parent click handler
      onTicketClick?.(ticket)
    },
    [onTicketClick]
  )

  const toggleExpandAll = useCallback(() => {
    setExpandedIds((prev) => {
      if (prev.size === tickets.length) {
        return new Set()
      }
      return new Set(tickets.map((t) => t.ticket_id))
    })
  }, [tickets])

  const allExpanded = expandedIds.size === tickets.length

  const sliceTickets = tickets.filter((t) => t.slice_id === slice.slice_id)

  if (sliceTickets.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-sm">No tickets in this slice</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full relative">
      <ReactFlowProvider>
        <SliceGraphInner
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          allExpanded={allExpanded}
          onToggleExpand={toggleExpandAll}
        />
      </ReactFlowProvider>
    </div>
  )
}

interface SliceGraphInnerProps {
  nodes: typeof useNodesState extends (init: infer T) => [infer T, ...unknown[]] ? T : never
  edges: typeof useEdgesState extends (init: infer T) => [infer T, ...unknown[]] ? T : never
  onNodesChange: ReturnType<typeof useNodesState>[2]
  onEdgesChange: ReturnType<typeof useEdgesState>[2]
  onNodeClick: NodeMouseHandler
  nodeTypes: NodeTypes
  allExpanded: boolean
  onToggleExpand: () => void
}

function SliceGraphInner({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodeClick,
  nodeTypes,
  allExpanded,
  onToggleExpand,
}: SliceGraphInnerProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  const [isLocked, setIsLocked] = useState(false)
  const [flashingButton, setFlashingButton] = useState<string | null>(null)

  const flash = (button: string) => {
    setFlashingButton(button)
    setTimeout(() => setFlashingButton(null), 150)
  }

  const handleZoomIn = () => {
    flash('zoomIn')
    zoomIn()
  }

  const handleZoomOut = () => {
    flash('zoomOut')
    zoomOut()
  }

  const handleFitView = () => {
    flash('fitView')
    fitView({ padding: 0.2 })
  }

  const handleToggleExpand = () => {
    flash('expand')
    onToggleExpand()
  }

  const buttonClass = (id: string, isToggle = false, isActive = false) => {
    const base = "p-1.5 transition-colors duration-150"

    // Flash colors per button
    if (flashingButton === id) {
      if (id === 'zoomIn') return `${base} text-blue-400`
      if (id === 'zoomOut') return `${base} text-red-400`
      return `${base} text-white`
    }

    // Lock stays red when active
    if (isToggle && isActive) {
      if (id === 'lock') return `${base} text-red-400`
      return `${base} text-white`
    }

    // Hover colors
    if (id === 'zoomIn') return `${base} text-zinc-500 hover:text-blue-400`
    if (id === 'zoomOut') return `${base} text-zinc-500 hover:text-red-400`

    return `${base} text-zinc-500 hover:text-white`
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.3}
      maxZoom={1.5}
      proOptions={{ hideAttribution: true }}
      nodesDraggable={!isLocked}
      nodesConnectable={!isLocked}
      elementsSelectable={!isLocked}
    >
      <Background color="#27272a" gap={24} size={1} />

      {/* Custom minimal controls */}
      <div className="absolute bottom-3 left-3 flex items-center gap-1 z-10">
        <button
          onClick={handleZoomIn}
          title="Zoom in"
          className={buttonClass('zoomIn')}
        >
          <Plus className="w-4 h-4" strokeWidth={1.5} />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom out"
          className={buttonClass('zoomOut')}
        >
          <Minus className="w-4 h-4" strokeWidth={1.5} />
        </button>
        <button
          onClick={handleFitView}
          title="Fit view"
          className={buttonClass('fitView')}
        >
          <Maximize className="w-4 h-4" strokeWidth={1.5} />
        </button>
        <button
          onClick={() => setIsLocked(!isLocked)}
          title={isLocked ? "Unlock" : "Lock"}
          className={buttonClass('lock', true, isLocked)}
        >
          {isLocked ? (
            <Lock className="w-4 h-4" strokeWidth={1.5} />
          ) : (
            <Unlock className="w-4 h-4" strokeWidth={1.5} />
          )}
        </button>
        <button
          onClick={handleToggleExpand}
          title={allExpanded ? "Collapse all" : "Expand all"}
          className={buttonClass('expand')}
        >
          <Expand className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>
    </ReactFlow>
  )
}
