import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'agentic-frontend',
  description: 'frontend repository',
}

export default function RootLayout({
  children,
}: {
  children: React.NodeNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
