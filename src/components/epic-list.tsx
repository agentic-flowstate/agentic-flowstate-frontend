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
      <div className="flex items-center justify-center py-16 border border-dashed rounded-lg">
        <div className="text-center px-4">
          <p className="text-muted-foreground">
            No epics yet
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Epics will appear here once created
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {epics.map((epic) => (
        <EpicCard key={epic.epic_id} epic={epic} />
      ))}
    </div>
  )
}
