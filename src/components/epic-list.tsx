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
      <div className="flex items-center justify-center py-24 border-2 border-dashed border-border/40 rounded-xl bg-card/20">
        <div className="text-center px-4 space-y-3 max-w-md">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <span className="text-3xl">📋</span>
          </div>
          <p className="text-lg font-medium text-foreground">
            No epics yet
          </p>
          <p className="text-sm text-muted-foreground">
            Epics will appear here once created. Use the MCP tools to create your first epic.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {epics.map((epic, index) => (
        <div
          key={epic.epic_id}
          className="animate-in fade-in slide-in-from-bottom-2"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <EpicCard epic={epic} />
        </div>
      ))}
    </div>
  )
}
