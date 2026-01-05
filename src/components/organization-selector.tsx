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
import type { Organization } from "@/contexts/organization-context"

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
          variant="ghost"
          size="sm"
          role="combobox"
          className="h-8 px-2 py-1 text-xs font-mono text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
        >
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
            <span>
              {selectedOrg ? selectedOrg.id : "org"}
            </span>
            <ChevronsUpDown className="ml-1 h-3 w-3 opacity-50" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48 bg-zinc-900 border-zinc-800">
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => onSelectOrg(org)}
            className="flex items-center justify-between text-xs font-mono text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 focus:bg-zinc-800/50"
          >
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                selectedOrg?.id === org.id ? "bg-emerald-500" : "bg-zinc-600"
              )} />
              <span>{org.id}</span>
            </div>
            {selectedOrg?.id === org.id && (
              <Check className="h-3 w-3 text-emerald-500" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
