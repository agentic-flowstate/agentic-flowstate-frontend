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
    <div className="min-h-screen">
      {/* Global Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          {/* Organization Selector */}
          <OrganizationSelector
            organizations={organizations}
            selectedOrg={selectedOrg}
            onSelectOrg={selectOrg}
          />

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