"use client"

import React from 'react'
import { OrganizationSelector } from '@/components/organization-selector'
import { ThemeToggle } from '@/components/theme-toggle'
import { useOrganization } from '@/contexts/organization-context'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { organizations, selectedOrg, selectOrg } = useOrganization()

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95">
      {/* Global Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Agentic Ticketing
            </h1>

            {/* Organization Selector */}
            <OrganizationSelector
              organizations={organizations}
              selectedOrg={selectedOrg}
              onSelectOrg={selectOrg}
            />
          </div>

          {/* Theme Toggle */}
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        {children}
      </main>
    </div>
  )
}