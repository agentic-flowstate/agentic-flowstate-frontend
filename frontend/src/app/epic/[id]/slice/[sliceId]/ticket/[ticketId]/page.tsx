"use client"

import * as React from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Bug, CheckCircle2, Wrench, Star, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getTicketById, getSliceById, getEpicById } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { TicketStatus, TicketType } from "@/lib/types"

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

export default function TicketDetailPage() {
  const router = useRouter()
  const params = useParams()
  const ticketId = params.ticketId as string
  const sliceId = params.sliceId as string
  const epicId = params.id as string

  const ticket = getTicketById(ticketId)
  const slice = ticket ? getSliceById(ticket.sliceId) : undefined
  const epic = slice ? getEpicById(slice.epicId) : undefined

  if (!ticket || !slice || !epic) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Ticket not found</h1>
          <Button onClick={() => router.push("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </div>
    )
  }

  const statusInfo = statusConfig[ticket.status]
  const typeInfo = typeConfig[ticket.type]
  const TypeIcon = typeInfo.icon

  // Get related tickets for relationships
  const blocksTickets = ticket.blocks.map(id => getTicketById(id)).filter(Boolean)
  const blockedByTickets = ticket.blockedBy.map(id => getTicketById(id)).filter(Boolean)
  const causedByTicket = ticket.causedBy ? getTicketById(ticket.causedBy) : null

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => router.push(`/epic/${epicId}/slice/${sliceId}`)}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to {slice.title}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            <Link href={`/epic/${epicId}`} className="hover:underline">
              Epic: {epic.title}
            </Link>
            {" → "}
            <Link href={`/epic/${epicId}/slice/${sliceId}`} className="hover:underline">
              Slice: {slice.title}
            </Link>
          </p>
        </div>

        {/* Ticket Header */}
        <div className="mb-8">
          <div className="flex items-start gap-3 mb-4">
            <TypeIcon className="h-6 w-6 mt-1 flex-shrink-0 text-muted-foreground" />
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{ticket.title}</h1>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{typeInfo.label}</span>
                <span className="text-muted-foreground">•</span>
                <span
                  className={cn(
                    "px-3 py-1 rounded-full text-sm font-medium",
                    statusInfo.className
                  )}
                >
                  {statusInfo.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Ticket Details */}
        <div className="grid gap-6 mb-8">
          {/* Intent */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Intent</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">{ticket.intent}</p>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {ticket.notes}
              </p>
            </CardContent>
          </Card>

          {/* Relationships */}
          {(blocksTickets.length > 0 || blockedByTickets.length > 0 || causedByTicket) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Relationships</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Caused By */}
                {causedByTicket && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
                      Caused By
                    </h3>
                    <Link
                      href={`/epic/${epicId}/slice/${causedByTicket.sliceId}/ticket/${causedByTicket.id}`}
                      className="block"
                    >
                      <div className="flex items-center gap-2 p-3 border rounded-lg hover:bg-accent transition-colors group">
                        <span className="flex-1 text-sm">{causedByTicket.title}</span>
                        <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </Link>
                  </div>
                )}

                {/* Blocks */}
                {blocksTickets.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
                      Blocks ({blocksTickets.length})
                    </h3>
                    <div className="space-y-2">
                      {blocksTickets.map((blockedTicket) => (
                        <Link
                          key={blockedTicket!.id}
                          href={`/epic/${epicId}/slice/${blockedTicket!.sliceId}/ticket/${blockedTicket!.id}`}
                          className="block"
                        >
                          <div className="flex items-center gap-2 p-3 border rounded-lg hover:bg-accent transition-colors group">
                            <span className="flex-1 text-sm">{blockedTicket!.title}</span>
                            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Blocked By */}
                {blockedByTickets.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
                      Blocked By ({blockedByTickets.length})
                    </h3>
                    <div className="space-y-2">
                      {blockedByTickets.map((blockingTicket) => (
                        <Link
                          key={blockingTicket!.id}
                          href={`/epic/${epicId}/slice/${blockingTicket!.sliceId}/ticket/${blockingTicket!.id}`}
                          className="block"
                        >
                          <div className="flex items-center gap-2 p-3 border rounded-lg hover:bg-accent transition-colors group">
                            <span className="flex-1 text-sm">{blockingTicket!.title}</span>
                            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
