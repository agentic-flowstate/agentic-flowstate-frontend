"use client"

import * as React from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Bug, CheckCircle2, Wrench, Star, ExternalLink, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { getTicket, getSlice, getEpic, deleteTicket } from "@/lib/api/tickets"
import { cn } from "@/lib/utils"
import { Epic, Slice, Ticket, TicketStatus, TicketType } from "@/lib/types"

const statusConfig: Record<TicketStatus, { label: string; className: string }> = {
  open: {
    label: "Open",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  completed: {
    label: "Completed",
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  blocked: {
    label: "Blocked",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
  closed: {
    label: "Closed",
    className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
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

  const [ticket, setTicket] = React.useState<Ticket | undefined>(undefined)
  const [slice, setSlice] = React.useState<Slice | undefined>(undefined)
  const [epic, setEpic] = React.useState<Epic | undefined>(undefined)
  const [relatedTickets, setRelatedTickets] = React.useState<{
    blocks: (Ticket | undefined)[]
    blockedBy: (Ticket | undefined)[]
    causedBy: (Ticket | undefined)[]
  }>({ blocks: [], blockedBy: [], causedBy: [] })
  const [isLoading, setIsLoading] = React.useState(true)
  const [notFound, setNotFound] = React.useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  React.useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        const ticketData = await getTicket(epicId, sliceId, ticketId)

        if (!ticketData) {
          setNotFound(true)
          return
        }

        setTicket(ticketData)

        const [sliceData, epicData] = await Promise.all([
          getSlice(epicId, sliceId),
          getEpic(epicId),
        ])

        if (!sliceData || !epicData) {
          setNotFound(true)
          return
        }

        setSlice(sliceData)
        setEpic(epicData)

        // Load related tickets - we need to parse the composite IDs
        // Format: "epic_id#slice_id#ticket_id"
        const parseTicketId = (compositeId: string) => {
          const parts = compositeId.split('#')
          return parts.length === 3 ? { epicId: parts[0], sliceId: parts[1], ticketId: parts[2] } : null
        }

        const [blocksTickets, blockedByTickets, causedByTickets] = await Promise.all([
          Promise.all((ticketData.blocks_tickets || []).map((id) => {
            const parsed = parseTicketId(id)
            return parsed ? getTicket(parsed.epicId, parsed.sliceId, parsed.ticketId) : undefined
          })),
          Promise.all((ticketData.blocked_by_tickets || []).map((id) => {
            const parsed = parseTicketId(id)
            return parsed ? getTicket(parsed.epicId, parsed.sliceId, parsed.ticketId) : undefined
          })),
          Promise.all((ticketData.caused_by_tickets || []).map((id) => {
            const parsed = parseTicketId(id)
            return parsed ? getTicket(parsed.epicId, parsed.sliceId, parsed.ticketId) : undefined
          })),
        ])

        setRelatedTickets({
          blocks: blocksTickets,
          blockedBy: blockedByTickets,
          causedBy: causedByTickets,
        })
      } catch (error) {
        console.error("Failed to load ticket data:", error)
        setNotFound(true)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [epicId, sliceId, ticketId])

  const handleDelete = async () => {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await deleteTicket(epicId, sliceId, ticketId)
      router.push(`/epic/${epicId}/slice/${sliceId}`)
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete ticket')
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4">
            <Skeleton className="h-10 w-32" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-4 w-80 mb-6" />
          <div className="mb-8">
            <div className="flex items-start gap-3 mb-4">
              <Skeleton className="h-6 w-6 mt-1" />
              <div className="flex-1">
                <Skeleton className="h-9 w-2/3 mb-2" />
                <Skeleton className="h-5 w-48" />
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-5/6" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  if (notFound || !ticket || !slice || !epic) {
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

  // Get related tickets from state
  const blocksTickets = relatedTickets.blocks.filter(Boolean)
  const blockedByTickets = relatedTickets.blockedBy.filter(Boolean)
  const causedByTickets = relatedTickets.causedBy.filter(Boolean)

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
        {/* Breadcrumbs */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">Epics</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/epic/${epicId}`}>{epic.title}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/epic/${epicId}/slice/${sliceId}`}>{slice.title}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{ticket.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Ticket Header */}
        <div className="mb-8">
          <div className="flex items-start gap-3 mb-4">
            <TypeIcon className="h-6 w-6 mt-1 flex-shrink-0 text-muted-foreground" />
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4 mb-2">
                <h1 className="text-3xl font-bold">{ticket.title}</h1>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
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
          {deleteError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-200">
              {deleteError}
            </div>
          )}
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
          {(blocksTickets.length > 0 || blockedByTickets.length > 0 || causedByTickets.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Relationships</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Caused By */}
                {causedByTickets.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
                      Caused By ({causedByTickets.length})
                    </h3>
                    <div className="space-y-2">
                      {causedByTickets.map((causedTicket) => (
                        <Link
                          key={causedTicket!.ticket_id}
                          href={`/epic/${epicId}/slice/${causedTicket!.slice_id}/ticket/${causedTicket!.ticket_id}`}
                          className="block"
                        >
                          <div className="flex items-center gap-2 p-3 border rounded-lg hover:bg-accent transition-colors group">
                            <span className="flex-1 text-sm">{causedTicket!.title}</span>
                            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                          </div>
                        </Link>
                      ))}
                    </div>
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
                          key={blockedTicket!.ticket_id}
                          href={`/epic/${epicId}/slice/${blockedTicket!.slice_id}/ticket/${blockedTicket!.ticket_id}`}
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
                          key={blockingTicket!.ticket_id}
                          href={`/epic/${epicId}/slice/${blockingTicket!.slice_id}/ticket/${blockingTicket!.ticket_id}`}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ticket</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{ticket.title}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
