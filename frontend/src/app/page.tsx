"use client"

import * as React from "react"
import { OrganizationSelector } from "@/components/organization-selector"
import { EpicList } from "@/components/epic-list"
import { ThemeToggle } from "@/components/theme-toggle"
import { getOrganizations, getEpicsByOrganization } from "@/lib/mock-data"
import { Organization } from "@/lib/types"

export default function Home() {
  const [selectedOrg, setSelectedOrg] = React.useState<Organization | null>(null)
  const organizations = getOrganizations()
  const epics = selectedOrg ? getEpicsByOrganization(selectedOrg.id) : []

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
        {/* Organization Selector Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Select Organization</h2>
          <OrganizationSelector
            organizations={organizations}
            selectedOrg={selectedOrg}
            onSelectOrg={setSelectedOrg}
          />
        </div>

        {/* Epic List Section */}
        {selectedOrg && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">{selectedOrg.displayName} Epics</h2>
              <p className="text-muted-foreground">
                View and manage epics for {selectedOrg.displayName}
              </p>
            </div>
            <EpicList epics={epics} />
          </div>
        )}

        {/* Empty State */}
        {!selectedOrg && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <p className="text-lg text-muted-foreground mb-2">
                Select an organization to view its epics
              </p>
              <p className="text-sm text-muted-foreground">
                Choose from {organizations.length} available organizations above
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
