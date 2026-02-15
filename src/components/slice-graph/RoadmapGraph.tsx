"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

import type { GraphTicket, Epic, Slice } from '@/lib/types'
import { TicketNode } from './TicketNode'
import { getRoadmapLayoutedElements } from './roadmap-layout'
import { Plus, Minus, Maximize, Lock, Unlock } from 'lucide-react'

const nodeTypes: NodeTypes = {
  ticket: TicketNode,
}

interface RoadmapGraphProps {
  tickets: GraphTicket[]
  epics: Epic[]
  slices: Slice[]
  selectedTicketId?: string | null
  centerOnTicketId?: string | null
  processingTicketIds?: Set<string>
  onTicketClick?: (ticket: GraphTicket) => void
  onPaneClick?: () => void
}

export function RoadmapGraph({
  tickets,
  epics,
  slices,
  selectedTicketId,
  centerOnTicketId,
  processingTicketIds,
  onTicketClick,
  onPaneClick,
}: RoadmapGraphProps) {
  // Synchronous layout (no ELK)
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => getRoadmapLayoutedElements(tickets, epics, slices),
    [tickets, epics, slices]
  )

  // Add selection and processing state to nodes
  const nodesWithState = useMemo(() => {
    return layoutedNodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        isSelected: node.id === selectedTicketId,
        isProcessing: processingTicketIds?.has(node.id) ?? false,
      },
    }))
  }, [layoutedNodes, selectedTicketId, processingTicketIds])

  const [nodes, setNodes, onNodesChange] = useNodesState(nodesWithState)
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges)

  // Sync React Flow state when layout or selection changes
  useEffect(() => {
    setNodes(nodesWithState)
  }, [nodesWithState, setNodes])

  useEffect(() => {
    setEdges(layoutedEdges)
  }, [layoutedEdges, setEdges])

  // Click on ticket
  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const ticket = (node.data as { ticket: GraphTicket }).ticket
      onTicketClick?.(ticket)
    },
    [onTicketClick]
  )

  // Click on empty pane
  const handlePaneClick = useCallback(() => {
    onPaneClick?.()
  }, [onPaneClick])

  if (tickets.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-sm">No tickets in this organization</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full relative">
      <ReactFlowProvider>
        <RoadmapGraphInner
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          nodeTypes={nodeTypes}
          centerOnTicketId={centerOnTicketId}
        />
      </ReactFlowProvider>
    </div>
  )
}

interface RoadmapGraphInnerProps {
  nodes: Node[]
  edges: Edge[]
  onNodesChange: ReturnType<typeof useNodesState>[2]
  onEdgesChange: ReturnType<typeof useEdgesState>[2]
  onNodeClick: NodeMouseHandler
  onPaneClick: () => void
  nodeTypes: NodeTypes
  centerOnTicketId?: string | null
}

function RoadmapGraphInner({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodeClick,
  onPaneClick,
  nodeTypes,
  centerOnTicketId,
}: RoadmapGraphInnerProps) {
  const { zoomIn, zoomOut, fitView, setCenter, getNodes } = useReactFlow()
  const [isLocked, setIsLocked] = useState(false)
  const [flashingButton, setFlashingButton] = useState<string | null>(null)
  const lastCenteredRef = useRef<string | null>(null)

  // Center on a specific ticket node once when requested
  useEffect(() => {
    if (!centerOnTicketId || centerOnTicketId === lastCenteredRef.current) return
    const node = getNodes().find(n => n.id === centerOnTicketId)
    if (!node || node.position.x === undefined) return
    lastCenteredRef.current = centerOnTicketId
    const x = node.position.x + (node.width ?? 200) / 2
    const y = node.position.y + (node.height ?? 60) / 2
    setCenter(x, y, { zoom: 1.2, duration: 400 })
  }, [centerOnTicketId, getNodes, setCenter])

  const flash = (button: string) => {
    setFlashingButton(button)
    setTimeout(() => setFlashingButton(null), 150)
  }

  const handleZoomIn = () => { flash('zoomIn'); zoomIn() }
  const handleZoomOut = () => { flash('zoomOut'); zoomOut() }
  const handleFitView = () => { flash('fitView'); fitView({ padding: 0.2 }) }

  const buttonClass = (id: string, isToggle = false, isActive = false) => {
    const base = "p-1.5 transition-colors duration-150"
    if (flashingButton === id) {
      if (id === 'zoomIn') return `${base} text-blue-400`
      if (id === 'zoomOut') return `${base} text-red-400`
      return `${base} text-white`
    }
    if (isToggle && isActive) {
      if (id === 'lock') return `${base} text-red-400`
      return `${base} text-white`
    }
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
      minZoom={0.05}
      maxZoom={1.5}
      proOptions={{ hideAttribution: true }}
      nodesDraggable={!isLocked}
      nodesConnectable={!isLocked}
      elementsSelectable={!isLocked}
    >
      <Background color="#27272a" gap={24} size={1} />

      {/* Custom minimal controls */}
      <div className="absolute bottom-3 left-3 flex items-center gap-1 z-10">
        <button onClick={handleZoomIn} title="Zoom in" className={buttonClass('zoomIn')}>
          <Plus className="w-4 h-4" strokeWidth={1.5} />
        </button>
        <button onClick={handleZoomOut} title="Zoom out" className={buttonClass('zoomOut')}>
          <Minus className="w-4 h-4" strokeWidth={1.5} />
        </button>
        <button onClick={handleFitView} title="Fit view" className={buttonClass('fitView')}>
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

      {/* Legend */}
      <div className="absolute bottom-3 right-3 flex items-center gap-3 text-[10px] text-zinc-500 z-10">
        <div className="flex items-center gap-1">
          <div className="w-4 h-0.5" style={{ backgroundColor: '#8b5cf6' }} />
          <span>trunk</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-0.5" style={{ borderTop: '2px dashed #8b5cf6' }} />
          <span>branch</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-0.5 bg-zinc-600" />
          <span>task</span>
        </div>
      </div>
    </ReactFlow>
  )
}
