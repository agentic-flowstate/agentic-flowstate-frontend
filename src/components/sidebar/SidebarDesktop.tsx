"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, Menu, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { SidebarContent } from './SidebarContent'

export interface SidebarProps {
  epics: import('@/lib/types').Epic[]
  slices: import('@/lib/types').Slice[]
  selectedEpicIds: Set<string>
  selectedSliceIds: Set<string>
  onEpicToggle: (epicId: string) => void
  onSliceToggle: (sliceId: string) => void
  viewMode?: 'slice' | 'org' | 'roadmap'
}

const SIDEBAR_DEFAULT_WIDTH = 280
const SIDEBAR_MIN_WIDTH = 200
const SIDEBAR_MAX_WIDTH = 500
const SIDEBAR_COLLAPSED_WIDTH = 48

export function SidebarDesktop({
  epics,
  slices,
  selectedEpicIds,
  selectedSliceIds,
  onEpicToggle,
  onSliceToggle,
  viewMode = 'slice'
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [width, setWidth] = useState(SIDEBAR_DEFAULT_WIDTH)
  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const storedCollapsed = localStorage.getItem('sidebar-collapsed')
    if (storedCollapsed === 'true') {
      setIsCollapsed(true)
    }
    const storedWidth = localStorage.getItem('sidebar-width')
    if (storedWidth) {
      const parsed = parseInt(storedWidth, 10)
      if (parsed >= SIDEBAR_MIN_WIDTH && parsed <= SIDEBAR_MAX_WIDTH) {
        setWidth(parsed)
      }
    }
  }, [])

  const toggleCollapsed = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem('sidebar-collapsed', String(newState))
  }

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = e.clientX
      if (newWidth >= SIDEBAR_MIN_WIDTH && newWidth <= SIDEBAR_MAX_WIDTH) {
        setWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      localStorage.setItem('sidebar-width', String(width))
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, width])

  return (
    <div
      ref={sidebarRef}
      className={cn(
        "relative h-full bg-background border-r flex-shrink-0",
        "flex flex-col",
        "hidden md:flex",
        !isResizing && "transition-all duration-200"
      )}
      style={{ width: isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : width }}
    >
      {/* Resize handle */}
      {!isCollapsed && (
        <div
          className={cn(
            "absolute top-0 right-0 w-1 h-full cursor-col-resize group z-10",
            "hover:bg-primary/20",
            isResizing && "bg-primary/30"
          )}
          onMouseDown={handleMouseDown}
        >
          <div className="absolute top-1/2 -translate-y-1/2 right-0 w-3 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      )}
      {/* Collapse Toggle */}
      <div className="h-10 flex items-center justify-between px-3 border-b">
        {!isCollapsed && (
          <span className="text-xs font-medium text-muted-foreground">Navigation</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={toggleCollapsed}
        >
          {isCollapsed ? (
            <Menu className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>
      </div>

      {!isCollapsed && (
        <SidebarContent
          epics={epics}
          slices={slices}
          selectedEpicIds={selectedEpicIds}
          selectedSliceIds={selectedSliceIds}
          onEpicToggle={onEpicToggle}
          onSliceToggle={onSliceToggle}
          viewMode={viewMode}
          compact
        />
      )}
    </div>
  )
}
