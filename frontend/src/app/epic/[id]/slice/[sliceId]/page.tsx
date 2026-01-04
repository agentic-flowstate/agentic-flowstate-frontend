"use client"

import * as React from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TicketList } from "@/components/ticket-list"
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
import { getSlice, getEpic, getTickets, deleteSlice } from "@/lib/api/tickets"
import { cn } from "@/lib/utils"
import { Epic, Slice, SliceStatus, Ticket } from "@/lib/types"

const statusConfig: Record<SliceStatus, { label: string; className: string }> = {
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

export default function SlicePage() {
  const router = useRouter()
  const params = useParams()
  const sliceId = params.sliceId as string
  const epicId = params.id as string

  const [slice, setSlice] = React.useState<Slice | undefined>(undefined)
  const [epic, setEpic] = React.useState<Epic | undefined>(undefined)
  const [tickets, setTickets] = React.useState<Ticket[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [notFound, setNotFound] = React.useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  React.useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        const sliceData = await getSlice(epicId, sliceId)

        if (!sliceData) {
          setNotFound(true)
          return
        }

        setSlice(sliceData)

        const [epicData, ticketsData] = await Promise.all([
          getEpic(epicId),
          getTickets(epicId, sliceId),
        ])

        if (!epicData) {
          setNotFound(true)
          return
        }

        setEpic(epicData)
        setTickets(ticketsData)
      } catch (error) {
        console.error("Failed to load slice data:", error)
        setNotFound(true)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [epicId, sliceId])

  const handleDelete = async () => {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await deleteSlice(epicId, sliceId)
      router.push(`/epic/${epicId}`)
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete slice')
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
          <Skeleton className="h-4 w-64 mb-6" />
          <div className="mb-8">
            <Skeleton className="h-9 w-2/3 mb-4" />
            <Skeleton className="h-5 w-full mb-2" />
            <Skeleton className="h-5 w-4/5" />
          </div>
          <div className="mb-6">
            <Skeleton className="h-8 w-24 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-5 w-5 mt-1" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    )
  }

  if (notFound || !slice || !epic) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Slice not found</h1>
          <Button onClick={() => router.push("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </div>
    )
  }

  const statusInfo = statusConfig[slice.status]

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => router.push(`/epic/${epicId}`)}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to {epic.title}
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
              <BreadcrumbPage>{slice.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Slice Header */}
        <div className="mb-8">
          {/* Slice Title and Status */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-3xl font-bold">{slice.title}</h1>
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap",
                  statusInfo.className
                )}
              >
                {statusInfo.label}
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Slice
              </Button>
            </div>
          </div>
          <p className="text-lg text-muted-foreground">{slice.description}</p>
          {deleteError && (
            <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-200">
              {deleteError}
            </div>
          )}
        </div>

        {/* Tickets Section */}
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Tickets</h2>
            <p className="text-muted-foreground">
              {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"} for
              this slice
            </p>
          </div>
          <TicketList tickets={tickets} epicId={epicId} sliceId={sliceId} />
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Slice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{slice.title}&quot;?
              <br />
              <strong>This will delete all {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'} in this slice.</strong>
              <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? "Deleting..." : "Delete Slice"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
