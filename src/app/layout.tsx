import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { OrganizationProvider } from '@/contexts/organization-context'
import { AppShell } from '@/components/app-shell'

export const metadata: Metadata = {
  title: 'Agentic Ticketing',
  description: 'Multi-organization epic and ticket management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <OrganizationProvider>
            <AppShell>
              {children}
            </AppShell>
          </OrganizationProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
