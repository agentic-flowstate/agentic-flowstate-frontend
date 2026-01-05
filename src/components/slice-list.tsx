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
      <div className="flex items-center justify-center py-16 border border-dashed rounded-lg">
        <div className="text-center px-4">
          <p className="text-muted-foreground">
            No slices yet
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            This epic has no slices
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {slices.map((slice) => (
        <SliceCard key={slice.slice_id} slice={slice} epicId={epicId} />
      ))}
    </div>
  )
}
