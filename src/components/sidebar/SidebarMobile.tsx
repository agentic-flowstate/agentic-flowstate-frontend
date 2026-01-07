"use client"

import React, { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Epic, Slice } from '@/lib/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useOrganization } from '@/contexts/organization-context'
import { OrganizationSelector } from '../organization-selector'
import { SidebarProps } from './SidebarDesktop'

interface SidebarMobileProps extends SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function SidebarMobile({
  epics,
  slices,
  selectedEpicIds,
  selectedSliceIds,
  onEpicToggle,
  onSliceToggle,
  isOpen,
  onClose
}: SidebarMobileProps) {
  const [isEpicsOpen, setIsEpicsOpen] = useState(true)
  const [isSlicesOpen, setIsSlicesOpen] = useState(true)
  const { organizations, selectedOrg, selectOrg } = useOrganization()

  // Get slices for selected epics
  const visibleSlices = slices.filter(slice => selectedEpicIds.has(slice.epic_id))

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="left" className="w-[300px] p-0 pt-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="text-sm font-medium">Navigation</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-[calc(100%-57px)]">
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
                              "flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer transition-colors",
                              "hover:bg-accent/50 active:bg-accent"
                            )}
                            onClick={() => onEpicToggle(epic.epic_id)}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => onEpicToggle(epic.epic_id)}
                              className="h-4 w-4"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <div className={cn(
                                  "w-1.5 h-1.5 rounded-full flex-shrink-0",
                                  isSelected ? "bg-primary" : "bg-muted-foreground"
                                )} />
                                <span className="text-sm font-mono truncate">
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
                                "flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer transition-colors",
                                "hover:bg-accent/50 active:bg-accent"
                              )}
                              onClick={() => onSliceToggle(slice.slice_id)}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => onSliceToggle(slice.slice_id)}
                                className="h-4 w-4"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <div className={cn(
                                    "w-1.5 h-1.5 rounded-full flex-shrink-0",
                                    isSelected ? "bg-green-500" : "bg-muted-foreground"
                                  )} />
                                  <span className="text-sm font-mono truncate">
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
        </div>
      </SheetContent>
    </Sheet>
  )
}
