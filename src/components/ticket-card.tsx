"use client"

import * as React from "react"
import Link from "next/link"
import { Bug, CheckCircle2, Wrench, Star } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Ticket, TicketStatus, TicketType } from "@/lib/types"
import { cn } from "@/lib/utils"

interface TicketCardProps {
  ticket: Ticket
  epicId: string
  sliceId: string
}

const statusConfig: Record<TicketStatus, { label: string; className: string }> = {
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

const typeConfig: Record<TicketType, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  task: {
    label: "Task",
    icon: CheckCircle2,
  },
  bug: {
    label: "Bug",
    icon: Bug,
  },
  feature: {
    label: "Feature",
    icon: Star,
  },
  chore: {
    label: "Chore",
    icon: Wrench,
  },
}

export function TicketCard({ ticket, epicId, sliceId }: TicketCardProps) {
  const statusInfo = statusConfig[ticket.status]
  const typeInfo = typeConfig[ticket.type]
  const TypeIcon = typeInfo.icon

  return (
    <Link href={`/epic/${epicId}/slice/${sliceId}/ticket/${ticket.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <TypeIcon className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
              <CardTitle className="text-base font-medium leading-tight">
                {ticket.title}
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{typeInfo.label}</span>
            <span className="text-muted-foreground">•</span>
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-xs font-medium",
                statusInfo.className
              )}
            >
              {statusInfo.label}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
