"use client"

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Mail, LayoutDashboard, Mic, Bot } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { useOrganization } from '@/contexts/organization-context'
import { cn } from '@/lib/utils'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { selectedOrg } = useOrganization()
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal Technical Header */}
      <header className="fixed top-0 z-50 w-full h-12 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="h-full px-4 flex items-center justify-between">
          {/* Left side - Org indicator and nav */}
          <div className="flex items-center gap-4 min-w-0 flex-1 overflow-x-auto">
            <span className="text-xs font-mono text-muted-foreground shrink-0">
              [{selectedOrg?.id || 'no-org'}]
            </span>
            <nav className="flex items-center gap-1 shrink-0">
              <Link
                href="/workspace"
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                  pathname === '/workspace' || pathname === '/'
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                Workspace
              </Link>
              <Link
                href="/emails"
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                  pathname === '/emails'
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <Mail className="h-3.5 w-3.5" />
                Emails
              </Link>
              <Link
                href="/workspace/transcripts"
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                  pathname === '/workspace/transcripts'
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <Mic className="h-3.5 w-3.5" />
                Transcripts
              </Link>
              <Link
                href="/workspace-manager"
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                  pathname === '/workspace-manager'
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <Bot className="h-3.5 w-3.5" />
                Planner
              </Link>
            </nav>
          </div>

          {/* Right side - Theme toggle only */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content - positioned below fixed header */}
      <main className="fixed top-12 left-0 right-0 bottom-0 overflow-hidden">
        {children}
      </main>
    </div>
  )
}