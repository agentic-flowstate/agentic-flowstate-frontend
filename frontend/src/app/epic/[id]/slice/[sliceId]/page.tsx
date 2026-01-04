"use client"

import * as React from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TicketList } from "@/components/ticket-list"
import { getSliceById, getEpicById, getTicketsBySliceId } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { SliceStatus } from "@/lib/types"

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
  const slice = getSliceById(sliceId)
  const epic = slice ? getEpicById(slice.epicId) : undefined
  const tickets = slice ? getTicketsBySliceId(slice.id) : []

  if (!slice || !epic) {
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
        {/* Slice Header */}
        <div className="mb-8">
          {/* Epic Context */}
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              Epic: <span className="font-medium">{epic.title}</span>
            </p>
          </div>

          {/* Slice Title and Status */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-3xl font-bold">{slice.title}</h1>
            <span
              className={cn(
                "px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap",
                statusInfo.className
              )}
            >
              {statusInfo.label}
            </span>
          </div>
          <p className="text-lg text-muted-foreground">{slice.description}</p>
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
    </div>
  )
}
