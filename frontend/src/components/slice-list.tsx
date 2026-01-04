"use client"

import * as React from "react"
import { Slice } from "@/lib/types"
import { SliceCard } from "@/components/slice-card"

interface SliceListProps {
  slices: Slice[]
  epicId: string
}

export function SliceList({ slices, epicId }: SliceListProps) {
  if (slices.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground text-lg">
          No slices found for this epic
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {slices.map((slice) => (
        <SliceCard key={slice.id} slice={slice} epicId={epicId} />
      ))}
    </div>
  )
}
