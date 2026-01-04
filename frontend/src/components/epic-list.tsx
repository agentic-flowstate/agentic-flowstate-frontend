"use client"

import * as React from "react"
import { Epic } from "@/lib/types"
import { EpicCard } from "@/components/epic-card"

interface EpicListProps {
  epics: Epic[]
}

export function EpicList({ epics }: EpicListProps) {
  if (epics.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground text-lg">
          No epics found for this organization
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {epics.map((epic) => (
        <EpicCard key={epic.id} epic={epic} />
      ))}
    </div>
  )
}
