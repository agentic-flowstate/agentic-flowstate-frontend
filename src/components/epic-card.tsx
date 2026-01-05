"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Calendar, Clock } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Epic } from "@/lib/types"

interface EpicCardProps {
  epic: Epic
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function EpicCard({ epic }: EpicCardProps) {
  const router = useRouter()

  const handleClick = () => {
    router.push(`/epic/${epic.epic_id}`)
  }

  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={handleClick}
    >
      <CardHeader>
        <CardTitle className="text-xl">{epic.title}</CardTitle>
        {epic.notes && (
          <CardDescription className="line-clamp-2">
            {epic.notes}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatDate(epic.created_at_iso)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatDate(epic.updated_at_iso)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
