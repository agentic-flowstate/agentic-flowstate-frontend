import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { OrganizationProvider } from '@/contexts/organization-context'
import { AgentStateProvider } from '@/contexts/agent-state-context'
import { AppShell } from '@/components/app-shell'

export const metadata: Metadata = {
  title: 'Agentic Ticketing',
  description: 'Multi-organization epic and ticket management',
  other: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Force reload CSS on page load in development
              if (process.env.NODE_ENV === 'development') {
                window.addEventListener('load', () => {
                  const links = document.querySelectorAll('link[rel="stylesheet"]');
                  links.forEach(link => {
                    const href = link.getAttribute('href');
                    if (href) {
                      link.setAttribute('href', href + '?v=' + Date.now());
                    }
                  });
                });
              }
            `
          }}
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <OrganizationProvider>
            <AgentStateProvider>
              <AppShell>
                {children}
              </AppShell>
            </AgentStateProvider>
          </OrganizationProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
