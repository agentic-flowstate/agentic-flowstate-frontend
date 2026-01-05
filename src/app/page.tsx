"use client"

import * as React from "react"
import { EpicList } from "@/components/epic-list"
import { Skeleton } from "@/components/ui/skeleton"
import { getEpics } from "@/lib/api/tickets"
import { Epic } from "@/lib/types"
import { useOrganization } from "@/contexts/organization-context"

export default function Home() {
  const [epics, setEpics] = React.useState<Epic[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const { selectedOrg } = useOrganization()

  // Reload epics when organization changes
  React.useEffect(() => {
    async function loadEpics() {
      try {
        setIsLoading(true)
        setError(null)
        const epicsList = await getEpics()
        setEpics(epicsList)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load epics"
        console.error("Failed to load epics:", err)
        setError(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }

    if (selectedOrg) {
      loadEpics()
    }
  }, [selectedOrg])

  return (
    <>
      <div className="mb-8 space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Epics</h2>
        <p className="text-muted-foreground text-lg">
          View and manage epics in {selectedOrg?.displayName || 'your organization'}
        </p>
      </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="border border-border/50 rounded-lg p-6 bg-card/30 backdrop-blur-sm">
                <Skeleton className="h-7 w-3/4 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-5/6 mb-6" />
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center space-y-3 max-w-md">
              <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <p className="text-lg font-medium text-destructive">
                {error}
              </p>
              <p className="text-sm text-muted-foreground">
                MCP tools are required to load data. Please ensure the MCP server is running.
              </p>
            </div>
          </div>
        )}

      {/* Epic List */}
      {!isLoading && !error && <EpicList epics={epics} />}
    </>
  )
}
