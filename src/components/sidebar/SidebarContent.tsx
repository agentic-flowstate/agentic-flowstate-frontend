"use client"

import React, { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Epic, Slice } from '@/lib/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useOrganization } from '@/contexts/organization-context'
import { OrganizationSelector } from '../organization-selector'

export interface SidebarContentProps {
  epics: Epic[]
  slices: Slice[]
  selectedEpicIds: Set<string>
  selectedSliceIds: Set<string>
  onEpicToggle: (epicId: string) => void
  onSliceToggle: (sliceId: string) => void
  viewMode?: 'slice' | 'org' | 'roadmap'
  compact?: boolean
}

export function SidebarContent({
  epics,
  slices,
  selectedEpicIds,
  selectedSliceIds,
  onEpicToggle,
  onSliceToggle,
  viewMode = 'slice',
  compact = false,
}: SidebarContentProps) {
  const [isEpicsOpen, setIsEpicsOpen] = useState(true)
  const [isSlicesOpen, setIsSlicesOpen] = useState(true)
  const { organizations, selectedOrg, selectOrg } = useOrganization()

  const visibleSlices = slices.filter(slice => selectedEpicIds.has(slice.epic_id))

  const checkboxSize = compact ? "h-3.5 w-3.5" : "h-4 w-4"
  const itemPadding = compact ? "py-1.5" : "py-2"
  const textSize = compact ? "text-xs" : "text-sm"
  const itemHover = compact ? "hover:bg-accent/50" : "hover:bg-accent/50 active:bg-accent"

  return (
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
                    const isOrgView = viewMode === 'org'
                    return (
                      <div
                        key={epic.epic_id}
                        className={cn(
                          "flex items-center gap-2 px-2 rounded-md cursor-pointer transition-colors",
                          itemPadding,
                          itemHover,
                        )}
                        onClick={() => onEpicToggle(epic.epic_id)}
                      >
                        {!isOrgView && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => onEpicToggle(epic.epic_id)}
                            className={checkboxSize}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full flex-shrink-0",
                              isOrgView ? "bg-muted-foreground" : (isSelected ? "bg-primary" : "bg-muted-foreground")
                            )} />
                            <span className={cn(textSize, "font-mono truncate")}>
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

        {/* Slices Section - Only show in slice view when at least one epic is selected */}
        {viewMode === 'slice' && selectedEpicIds.size > 0 && (
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
                            "flex items-center gap-2 px-2 rounded-md cursor-pointer transition-colors",
                            itemPadding,
                            itemHover,
                          )}
                          onClick={() => onSliceToggle(slice.slice_id)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => onSliceToggle(slice.slice_id)}
                            className={checkboxSize}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <div className={cn(
                                "w-1.5 h-1.5 rounded-full flex-shrink-0",
                                isSelected ? "bg-green-500" : "bg-muted-foreground"
                              )} />
                              <span className={cn(textSize, "font-mono truncate")}>
                                {slice.slice_id}
                              </span>
                            </div>
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

      {/* Selection summary at bottom - only show in slice view */}
      {viewMode === 'slice' && (selectedEpicIds.size > 0 || selectedSliceIds.size > 0) && (
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
  )
}
