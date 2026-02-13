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
  type Node,
  type Edge,
} from 'reactflow'
import 'reactflow/dist/style.css'

import type { GraphTicket, PipelineStep, Slice } from '@/lib/types'
import { TicketNode } from './TicketNode'
import { getLayoutedElements } from './utils'
import { Plus, Minus, Maximize, Lock, Unlock } from 'lucide-react'

const nodeTypes: NodeTypes = {
  ticket: TicketNode,
}

interface SliceGraphProps {
  slice: Slice
  tickets: GraphTicket[]
  allTickets: GraphTicket[] // All tickets across slices for cross-slice dep detection
  selectedTicketId?: string | null
  processingTicketIds?: Set<string>
  onTicketClick?: (ticket: GraphTicket) => void
  onPaneClick?: () => void // Called when clicking on empty canvas
  onStepClick?: (ticket: GraphTicket, step: PipelineStep) => void
  onCrossSliceClick?: (ticketId: string, sliceId: string) => void
}

export function SliceGraph({
  slice,
  tickets,
  allTickets,
  selectedTicketId,
  processingTicketIds,
  onTicketClick,
  onPaneClick,
  onStepClick,
  onCrossSliceClick,
}: SliceGraphProps) {
  const expandedIds = new Set<string>()

  const [layoutedNodes, setLayoutedNodes] = useState<Node[]>([])
  const [layoutedEdges, setLayoutedEdges] = useState<Edge[]>([])

  // Async ELK layout
  useEffect(() => {
    let cancelled = false

    getLayoutedElements(tickets, expandedIds, slice.slice_id).then(({ nodes, edges }) => {
      if (!cancelled) {
        setLayoutedNodes(nodes)
        setLayoutedEdges(edges)
      }
    })

    return () => { cancelled = true }
  }, [tickets, slice.slice_id])

  // Add callbacks, allTickets reference, and selection/processing state to node data
  const nodesWithCallbacks = useMemo(
    () =>
      layoutedNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          allTickets,
          onStepClick,
          onCrossSliceClick,
          isSelected: node.id === selectedTicketId,
          isProcessing: processingTicketIds?.has(node.id) ?? false,
        },
      })),
    [layoutedNodes, allTickets, onStepClick, onCrossSliceClick, selectedTicketId, processingTicketIds]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(nodesWithCallbacks)
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges)

  // Sync React Flow state when layout or callbacks change
  useEffect(() => {
    setNodes(nodesWithCallbacks)
  }, [nodesWithCallbacks, setNodes])

  useEffect(() => {
    setEdges(layoutedEdges)
  }, [layoutedEdges, setEdges])

  // Click on ticket - just open drawer
  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const ticket = (node.data as { ticket: GraphTicket }).ticket
      onTicketClick?.(ticket)
    },
    [onTicketClick]
  )

  // Click on empty pane - close drawer
  const handlePaneClick = useCallback(() => {
    onPaneClick?.()
  }, [onPaneClick])

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
          onPaneClick={handlePaneClick}
          nodeTypes={nodeTypes}
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
  onPaneClick: () => void
  nodeTypes: NodeTypes
}

function SliceGraphInner({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodeClick,
  onPaneClick,
  nodeTypes,
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
      onPaneClick={onPaneClick}
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
      </div>
    </ReactFlow>
  )
}
