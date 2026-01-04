"use client"

import * as React from "react"
import { Building2, Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Organization } from "@/lib/types"

interface OrganizationSelectorProps {
  organizations: Organization[]
  selectedOrg: Organization | null
  onSelectOrg: (org: Organization) => void
}

export function OrganizationSelector({
  organizations,
  selectedOrg,
  onSelectOrg,
}: OrganizationSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-[280px] justify-between"
        >
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span>
              {selectedOrg ? selectedOrg.displayName : "Select organization"}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[280px]">
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => onSelectOrg(org)}
            className="flex items-center justify-between"
          >
            <span>{org.displayName}</span>
            {selectedOrg?.id === org.id && (
              <Check className="h-4 w-4" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
