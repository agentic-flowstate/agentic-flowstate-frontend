"use client"

import React from 'react'
import { User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface AssigneeFilterProps {
  availableAssignees: string[]
  selectedAssignee: string | null
  onAssigneeChange: (assignee: string | null) => void
}

export function AssigneeFilter({
  availableAssignees,
  selectedAssignee,
  onAssigneeChange
}: AssigneeFilterProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 text-xs"
        >
          <User className="h-3 w-3 mr-1.5" />
          {selectedAssignee || 'All Assignees'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => onAssigneeChange(null)}
          className="text-xs"
        >
          All Assignees
        </DropdownMenuItem>
        {availableAssignees.map((assignee) => (
          <DropdownMenuItem
            key={assignee}
            onClick={() => onAssigneeChange(assignee)}
            className="text-xs"
          >
            {assignee}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}