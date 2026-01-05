"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Calendar, Clock } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Slice } from "@/lib/types"

interface SliceCardProps {
  slice: Slice
  epicId: string
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function SliceCard({ slice, epicId }: SliceCardProps) {
  const router = useRouter()

  const handleClick = () => {
    router.push(`/epic/${epicId}/slice/${slice.slice_id}`)
  }

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleClick}
    >
      <CardHeader>
        <CardTitle className="text-lg">{slice.title}</CardTitle>
        {slice.notes && (
          <CardDescription className="line-clamp-2">
            {slice.notes}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatDate(slice.created_at_iso)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatDate(slice.updated_at_iso)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
