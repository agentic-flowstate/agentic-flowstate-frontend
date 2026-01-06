"use client"

import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Menu, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Epic, Slice } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useOrganization } from '@/contexts/organization-context'
import { OrganizationSelector } from './organization-selector'
import { EpicCreationDialog } from './epic-creation-dialog'

interface SidebarProps {
  epics: Epic[]
  slices: Slice[]
  selectedEpic: Epic | null
  selectedSlice: Slice | null
  onEpicSelect: (epic: Epic | null) => void
  onSliceSelect: (slice: Slice | null) => void
  onEpicCreated: (epic: Epic) => void
}

const SIDEBAR_WIDTH = 260
const SIDEBAR_COLLAPSED_WIDTH = 48

export function Sidebar({
  epics,
  slices,
  selectedEpic,
  selectedSlice,
  onEpicSelect,
  onSliceSelect,
  onEpicCreated
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { organizations, selectedOrg, selectOrg } = useOrganization()

  // Load collapsed state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed')
    if (stored === 'true') {
      setIsCollapsed(true)
    }
  }, [])

  const toggleCollapsed = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem('sidebar-collapsed', String(newState))
  }

  return (
    <div
      className={cn(
        "relative h-full bg-background border-r transition-all duration-200 flex-shrink-0",
        "flex flex-col mt-12",
        "hidden md:flex" // Hide on mobile, show on medium screens and up
      )}
      style={{ width: isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH }}
    >
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

          {/* Epic Section */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-3 border-b">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-medium text-muted-foreground">Epic</div>
                <EpicCreationDialog onEpicCreated={onEpicCreated} />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between h-8 px-2 py-1 text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-accent"
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span className="truncate">
                        {selectedEpic ? selectedEpic.epic_id : "Select epic"}
                      </span>
                    </div>
                    <ChevronsUpDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  {epics.map((epic) => {
                    const sliceCount = epic.slice_count || 0
                    const ticketCount = epic.ticket_count || 0
                    return (
                      <DropdownMenuItem
                        key={epic.epic_id}
                        onClick={() => onEpicSelect(epic)}
                        className="flex items-center justify-between gap-2 text-xs font-mono"
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            selectedEpic?.epic_id === epic.epic_id ? "bg-primary" : "bg-muted-foreground"
                          )} />
                          <span className="truncate">{epic.epic_id}</span>
                        </div>
                        <div className="flex items-center gap-1">
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
                      </DropdownMenuItem>
                    )
                  })}
                  {epics.length === 0 && (
                    <div className="text-xs text-muted-foreground px-2 py-2">
                      No epics available
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Slice Section - Only show if epic is selected */}
            {selectedEpic && (
              <div className="p-3">
                <div className="text-xs font-medium text-muted-foreground mb-2">Slice</div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between h-8 px-2 py-1 text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-accent"
                    >
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <span className="truncate">
                          {selectedSlice ? selectedSlice.slice_id : "Select slice"}
                        </span>
                      </div>
                      <ChevronsUpDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    {slices.map((slice) => {
                      const ticketCount = slice.ticket_count || 0
                      return (
                        <DropdownMenuItem
                          key={slice.slice_id}
                          onClick={() => onSliceSelect(slice)}
                          className="flex items-center justify-between gap-2 text-xs font-mono"
                        >
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              selectedSlice?.slice_id === slice.slice_id ? "bg-green-500" : "bg-muted-foreground"
                            )} />
                            <span className="truncate">{slice.slice_id}</span>
                          </div>
                          {ticketCount > 0 && (
                            <span className="ml-auto px-1.5 py-0.5 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-full text-[10px] font-medium">
                              {ticketCount}
                            </span>
                          )}
                        </DropdownMenuItem>
                      )
                    })}
                    {slices.length === 0 && (
                      <div className="text-xs text-muted-foreground px-2 py-2">
                        No slices in this epic
                      </div>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </>
      )}

      {/* No additional content when collapsed - just the toggle button at top */}
    </div>
  )
}