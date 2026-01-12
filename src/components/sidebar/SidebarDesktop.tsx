"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronDown, ChevronRight, Menu, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Epic, Slice } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useOrganization } from '@/contexts/organization-context'
import { OrganizationSelector } from '../organization-selector'

export interface SidebarProps {
  epics: Epic[]
  slices: Slice[]
  selectedEpicIds: Set<string>
  selectedSliceIds: Set<string>
  onEpicToggle: (epicId: string) => void
  onSliceToggle: (sliceId: string) => void
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
  onSliceToggle
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [width, setWidth] = useState(SIDEBAR_DEFAULT_WIDTH)
  const [isResizing, setIsResizing] = useState(false)
  const [isEpicsOpen, setIsEpicsOpen] = useState(true)
  const [isSlicesOpen, setIsSlicesOpen] = useState(true)
  const { organizations, selectedOrg, selectOrg } = useOrganization()
  const sidebarRef = useRef<HTMLDivElement>(null)

  // Load collapsed state and width from localStorage
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

  // Handle resize drag
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

  // Get slices for selected epics
  const visibleSlices = slices.filter(slice => selectedEpicIds.has(slice.epic_id))

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
        <>
          {/* Organization Section */}
          <div className="p-3 border-b">
            <div className="text-xs font-medium text-muted-foreground mb-2">Organization</div>
            <OrganizationSelector
              organizations={organizations}
              selectedOrg={selectedOrg}
              onSelectOrg={selectOrg}
            />
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto">
            {/* Epics Section */}
            <Collapsible open={isEpicsOpen} onOpenChange={setIsEpicsOpen}>
              <div className="border-b">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent/50">
                    <div className="flex items-center gap-2">
                      {isEpicsOpen ? (
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      )}
                      <span className="text-xs font-medium text-muted-foreground">
                        Epics ({epics.length})
                      </span>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-3 pb-3 space-y-1">
                    {epics.length === 0 ? (
                      <div className="text-xs text-muted-foreground py-2 px-2">
                        No epics available
                      </div>
                    ) : (
                      epics.map((epic) => {
                        const isSelected = selectedEpicIds.has(epic.epic_id)
                        const sliceCount = epic.slice_count || 0
                        const ticketCount = epic.ticket_count || 0
                        return (
                          <div
                            key={epic.epic_id}
                            className={cn(
                              "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors",
                              "hover:bg-accent/50"
                            )}
                            onClick={() => onEpicToggle(epic.epic_id)}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => onEpicToggle(epic.epic_id)}
                              className="h-3.5 w-3.5"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <div className={cn(
                                  "w-1.5 h-1.5 rounded-full flex-shrink-0",
                                  isSelected ? "bg-primary" : "bg-muted-foreground"
                                )} />
                                <span className="text-xs font-mono truncate">
                                  {epic.epic_id}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {sliceCount > 0 && (
                                <span className="px-1.5 py-0.5 bg-gray-500/20 text-gray-600 dark:text-gray-400 rounded-full text-[10px] font-medium">
                                  {sliceCount}
                                </span>
                              )}
                              {ticketCount > 0 && (
                                <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-full text-[10px] font-medium">
                                  {ticketCount}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Slices Section - Only show if at least one epic is selected */}
            {selectedEpicIds.size > 0 && (
              <Collapsible open={isSlicesOpen} onOpenChange={setIsSlicesOpen}>
                <div className="border-b">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent/50">
                      <div className="flex items-center gap-2">
                        {isSlicesOpen ? (
                          <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span className="text-xs font-medium text-muted-foreground">
                          Slices ({visibleSlices.length})
                        </span>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-3 pb-3 space-y-1">
                      {visibleSlices.length === 0 ? (
                        <div className="text-xs text-muted-foreground py-2 px-2">
                          No slices in selected epics
                        </div>
                      ) : (
                        visibleSlices.map((slice) => {
                          const isSelected = selectedSliceIds.has(slice.slice_id)
                          const ticketCount = slice.ticket_count || 0
                          return (
                            <div
                              key={slice.slice_id}
                              className={cn(
                                "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors",
                                "hover:bg-accent/50"
                              )}
                              onClick={() => onSliceToggle(slice.slice_id)}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => onSliceToggle(slice.slice_id)}
                                className="h-3.5 w-3.5"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <div className={cn(
                                    "w-1.5 h-1.5 rounded-full flex-shrink-0",
                                    isSelected ? "bg-green-500" : "bg-muted-foreground"
                                  )} />
                                  <span className="text-xs font-mono truncate">
                                    {slice.slice_id}
                                  </span>
                                </div>
                                {/* Show parent epic ID for clarity */}
                                <div className="text-[10px] text-muted-foreground pl-3 truncate">
                                  {slice.epic_id}
                                </div>
                              </div>
                              {ticketCount > 0 && (
                                <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-full text-[10px] font-medium flex-shrink-0">
                                  {ticketCount}
                                </span>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )}
          </div>

          {/* Selection summary at bottom */}
          {(selectedEpicIds.size > 0 || selectedSliceIds.size > 0) && (
            <div className="p-3 border-t bg-muted/30">
              <div className="text-[10px] text-muted-foreground space-y-0.5">
                {selectedEpicIds.size > 0 && (
                  <div>{selectedEpicIds.size} epic{selectedEpicIds.size !== 1 ? 's' : ''} selected</div>
                )}
                {selectedSliceIds.size > 0 && (
                  <div>{selectedSliceIds.size} slice{selectedSliceIds.size !== 1 ? 's' : ''} selected</div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
