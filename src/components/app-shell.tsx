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
    <div className="min-h-screen bg-zinc-950">
      {/* Minimal Technical Header */}
      <header className="fixed top-0 z-50 w-full h-12 bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800/50">
        <div className="h-full px-4 flex items-center justify-between">
          {/* Left side - Compact controls */}
          <div className="flex items-center gap-3">
            <OrganizationSelector
              organizations={organizations}
              selectedOrg={selectedOrg}
              onSelectOrg={selectOrg}
            />

            {/* Org indicator */}
            {selectedOrg && (
              <div className="text-xs text-zinc-500 font-mono">
                [{selectedOrg.displayName}]
              </div>
            )}
          </div>

          {/* Right side - Minimal theme toggle */}
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content - with top padding for fixed header */}
      <main className="pt-12 min-h-screen">
        {children}
      </main>
    </div>
  )
}