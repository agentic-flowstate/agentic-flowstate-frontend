"use client"

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Mail, LayoutDashboard, Video, Bot, User, ChevronDown, LogOut, Heart } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { useOrganization } from '@/contexts/organization-context'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { selectedOrg } = useOrganization()
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.replace('/login')
  }

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
                href="/meetings"
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                  pathname.startsWith('/meetings')
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <Video className="h-3.5 w-3.5" />
                Meetings
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
              {user?.user_id === 'alex' && (
                <Link
                  href="/life"
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                    pathname === '/life'
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <Heart className="h-3.5 w-3.5" />
                  Life
                </Link>
              )}
            </nav>
          </div>

          {/* Right side - User menu + Theme toggle */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
                <User className="h-3.5 w-3.5" />
                <span>{user?.name || 'Unknown'}</span>
                <ChevronDown className="h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  {user?.user_id}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
