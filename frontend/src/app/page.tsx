"use client"

import * as React from "react"
import { EpicList } from "@/components/epic-list"
import { ThemeToggle } from "@/components/theme-toggle"
import { Skeleton } from "@/components/ui/skeleton"
import { getEpics } from "@/lib/api/tickets"
import { Epic } from "@/lib/types"

export default function Home() {
  const [epics, setEpics] = React.useState<Epic[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Load all epics on mount
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
    loadEpics()
  }, [])

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Agentic Frontend</h1>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Epics</h2>
          <p className="text-muted-foreground">
            View and manage all epics
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="border rounded-lg p-6">
                <Skeleton className="h-6 w-3/4 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-5/6 mb-4" />
                <Skeleton className="h-5 w-24" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <p className="text-lg text-red-600 dark:text-red-400 mb-2">
                {error}
              </p>
              <p className="text-sm text-muted-foreground">
                MCP tools are required to load data
              </p>
            </div>
          </div>
        )}

        {/* Epic List */}
        {!isLoading && !error && <EpicList epics={epics} />}
      </main>
    </div>
  )
}
