"use client"

import React from 'react'
import { ThemeToggle } from '@/components/theme-toggle'
import { useOrganization } from '@/contexts/organization-context'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { selectedOrg } = useOrganization()

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal Technical Header */}
      <header className="fixed top-0 z-50 w-full h-12 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="h-full px-4 flex items-center justify-between">
          {/* Left side - Org indicator */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-muted-foreground">
              [{selectedOrg?.id || 'no-org'}]
            </span>
          </div>

          {/* Right side - Theme toggle only */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content - with top padding for fixed header */}
      <main className="pt-12 min-h-screen">
        {children}
      </main>
    </div>
  )
}