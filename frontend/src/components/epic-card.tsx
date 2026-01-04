"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Calendar, Clock } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Epic, EpicStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

interface EpicCardProps {
  epic: Epic
}

const statusConfig: Record<EpicStatus, { label: string; className: string }> = {
  PENDING: {
    label: "Pending",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  },
  IN_PROGRESS: {
    label: "In Progress",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  BLOCKED: {
    label: "Blocked",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
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
  const statusInfo = statusConfig[epic.status]

  const handleClick = () => {
    router.push(`/epic/${epic.id}`)
  }

  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={handleClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2 mb-2">
          <CardTitle className="text-xl">{epic.title}</CardTitle>
          <span
            className={cn(
              "px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap",
              statusInfo.className
            )}
          >
            {statusInfo.label}
          </span>
        </div>
        <CardDescription className="line-clamp-2">
          {epic.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatDate(epic.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatDate(epic.updatedAt)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
