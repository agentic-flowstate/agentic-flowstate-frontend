"use client"

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Mail, LayoutDashboard, Video, Bot, User, LogOut, Home, Volume2, MessageCircle, BookOpen, Shield } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { useOrganization } from '@/contexts/organization-context'
import { useAuth, isAdmin } from '@/contexts/auth-context'
import { DmProvider, useDm } from '@/contexts/dm-context'
import { EmailProvider, useEmail } from '@/contexts/email-context'
import { DmChatWidget } from '@/components/dm-chat-widget'
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
  return (
    <DmProvider>
      <EmailProvider>
        <AppShellInner>{children}</AppShellInner>
      </EmailProvider>
    </DmProvider>
  )
}

function AppShellInner({ children }: AppShellProps) {
  const { selectedOrg } = useOrganization()
  const { user, logout } = useAuth()
  const { totalUnread, chatWidgetOpen, openChatWidget, closeChatWidget } = useDm()
  const { totalUnread: emailUnread } = useEmail()
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
              {isAdmin(user) && (
                <Link
                  href="/home"
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                    pathname === '/home' || pathname === '/'
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <Home className="h-3.5 w-3.5" />
                  Home
                </Link>
              )}
              <Link
                href="/workspace"
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                  pathname === '/workspace'
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
                {emailUnread > 0 && (
                  <span className="ml-0.5 h-4 min-w-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                    {emailUnread > 99 ? '99+' : emailUnread}
                  </span>
                )}
              </Link>
              <Link
                href="/dms"
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                  pathname === '/dms'
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                DMs
                {totalUnread > 0 && (
                  <span className="ml-0.5 h-4 min-w-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                )}
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
                href="/tts"
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                  pathname === '/tts'
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <Volume2 className="h-3.5 w-3.5" />
                TTS
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
              <Link
                href="/library"
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                  pathname === '/library'
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <BookOpen className="h-3.5 w-3.5" />
                Library
              </Link>
              {isAdmin(user) && (
                <Link
                  href="/admin/logs"
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                    pathname === '/admin/logs'
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <Shield className="h-3.5 w-3.5" />
                  Admin
                </Link>
              )}
            </nav>
          </div>

          {/* Right side - DM trigger + User menu + Theme toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => chatWidgetOpen ? closeChatWidget() : openChatWidget()}
              className="relative flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {totalUnread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
                <User className="h-3.5 w-3.5" />
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

      {/* Floating DM chat widget */}
      <DmChatWidget />
    </div>
  )
}
