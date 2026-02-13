"use client"

import React, { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ListTodo, HelpCircle, FileText } from 'lucide-react'

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: 'basis',
  },
})

interface Ticket {
  id: string
  title: string
  intent: string
  pipeline: string
  blockedBy?: string
}

interface Slice {
  id: string
  title: string
}

interface Proposal {
  organization: string
  epic: string
  slice: Slice
  tickets: Ticket[]
  graph: string
}

interface ParsedContent {
  proposals: Proposal[]
  clarifications: string[]
  summary: string | null
  plainText: string
}

function parseXmlContent(content: string): ParsedContent {
  const result: ParsedContent = {
    proposals: [],
    clarifications: [],
    summary: null,
    plainText: content,
  }

  // Extract all <proposal>...</proposal> blocks
  const proposalMatches = content.matchAll(/<proposal>([\s\S]*?)<\/proposal>/gi)
  for (const proposalMatch of proposalMatches) {
    const proposalXml = proposalMatch[1]

    // Parse organization
    const orgMatch = proposalXml.match(/<organization>([\s\S]*?)<\/organization>/i)
    const organization = orgMatch ? orgMatch[1].trim() : ''

    // Parse epic
    const epicMatch = proposalXml.match(/<epic>([\s\S]*?)<\/epic>/i)
    const epic = epicMatch ? epicMatch[1].trim() : ''

    // Parse slice
    const sliceMatch = proposalXml.match(/<slice>([\s\S]*?)<\/slice>/i)
    let slice: Slice = { id: '', title: '' }
    if (sliceMatch) {
      const sliceIdMatch = sliceMatch[1].match(/<id>([\s\S]*?)<\/id>/i)
      const sliceTitleMatch = sliceMatch[1].match(/<title>([\s\S]*?)<\/title>/i)
      slice = {
        id: sliceIdMatch ? sliceIdMatch[1].trim() : '',
        title: sliceTitleMatch ? sliceTitleMatch[1].trim() : '',
      }
    }

    // Parse tickets
    const tickets: Ticket[] = []
    const ticketMatches = proposalXml.matchAll(/<ticket\s+id="([^"]+)"\s+pipeline="([^"]+)"(?:\s+blocked_by="([^"]+)")?>([\s\S]*?)<\/ticket>/gi)
    for (const match of ticketMatches) {
      const ticketContent = match[4]
      const titleMatch = ticketContent.match(/<title>([\s\S]*?)<\/title>/i)
      const intentMatch = ticketContent.match(/<intent>([\s\S]*?)<\/intent>/i)
      tickets.push({
        id: match[1],
        pipeline: match[2],
        blockedBy: match[3] || undefined,
        title: titleMatch ? titleMatch[1].trim() : '',
        intent: intentMatch ? intentMatch[1].trim() : '',
      })
    }

    // Parse graph (mermaid)
    const graphMatch = proposalXml.match(/<graph>([\s\S]*?)<\/graph>/i)
    let graph = ''
    if (graphMatch) {
      // Extract mermaid code from markdown code block
      const mermaidMatch = graphMatch[1].match(/```mermaid\s*([\s\S]*?)```/i)
      graph = mermaidMatch ? mermaidMatch[1].trim() : graphMatch[1].trim()
    }

    result.proposals.push({ organization, epic, slice, tickets, graph })
  }

  // Remove all proposals from plain text
  result.plainText = content.replace(/<proposal>[\s\S]*?<\/proposal>/gi, '').trim()

  // Extract <clarifications>...</clarifications>
  const clarificationsMatch = content.match(/<clarifications>([\s\S]*?)<\/clarifications>/i)
  if (clarificationsMatch) {
    const clarificationText = clarificationsMatch[1].trim()
    // Parse bullet points
    result.clarifications = clarificationText
      .split('\n')
      .map(line => line.replace(/^[-*]\s*/, '').trim())
      .filter(line => line.length > 0)

    // Remove clarifications from plain text
    result.plainText = result.plainText.replace(/<clarifications>[\s\S]*?<\/clarifications>/i, '').trim()
  }

  // Extract <summary>...</summary>
  const summaryMatch = content.match(/<summary>([\s\S]*?)<\/summary>/i)
  if (summaryMatch) {
    result.summary = summaryMatch[1].trim()
    // Remove summary from plain text
    result.plainText = result.plainText.replace(/<summary>[\s\S]*?<\/summary>/i, '').trim()
  }

  return result
}

function MermaidDiagram({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const renderChart = async () => {
      if (!chart || !containerRef.current) return

      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`
        const { svg } = await mermaid.render(id, chart)
        setSvg(svg)
        setError(null)
      } catch (err) {
        console.error('Mermaid render error:', err)
        setError('Failed to render diagram')
      }
    }

    renderChart()
  }, [chart])

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
        {error}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="flex justify-center p-4 bg-muted/30 rounded-lg overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

function ProposalCard({ proposal }: { proposal: Proposal }) {
  return (
    <Card className="p-4 space-y-4">
      {/* Header: Organization / Epic / Slice */}
      <div className="text-sm font-medium">
        {proposal.organization} / {proposal.epic} / {proposal.slice.title}
      </div>

      {/* Dependency Graph */}
      {proposal.graph && (
        <MermaidDiagram chart={proposal.graph} />
      )}

      {/* Tickets */}
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
          <ListTodo className="h-3 w-3" />
          <span>Tickets ({proposal.tickets.length})</span>
        </div>
        <div className="space-y-2">
          {proposal.tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="p-3 bg-muted/50 rounded-lg border border-border"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{ticket.id}</span>
                    <Badge variant="outline" className={cn(
                      "text-xs",
                      ticket.pipeline === 'quick-fix' && "border-green-500/50 text-green-600",
                      ticket.pipeline === 'standard-dev' && "border-blue-500/50 text-blue-600",
                      ticket.pipeline === 'full-review' && "border-orange-500/50 text-orange-600",
                    )}>
                      {ticket.pipeline}
                    </Badge>
                    {ticket.blockedBy && (
                      <span className="text-xs text-muted-foreground">
                        blocked by {ticket.blockedBy}
                      </span>
                    )}
                  </div>
                  <div className="font-medium mt-1">{ticket.title}</div>
                  <div className="text-sm text-muted-foreground mt-0.5">{ticket.intent}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

function ClarificationsCard({ clarifications }: { clarifications: string[] }) {
  if (clarifications.length === 0) return null

  return (
    <Card className="p-4 border-dashed">
      <div className="flex items-center gap-2 text-sm font-medium mb-2">
        <HelpCircle className="h-4 w-4 text-muted-foreground" />
        <span>Clarifying Questions</span>
      </div>
      <ul className="space-y-1">
        {clarifications.map((q, i) => (
          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
            <span className="text-muted-foreground/50">-</span>
            <span>{q}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function SummaryCard({ summary }: { summary: string }) {
  return (
    <Card className="p-4 bg-muted/30">
      <div className="flex items-center gap-2 text-sm font-medium">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span>{summary}</span>
      </div>
    </Card>
  )
}

interface ProposalRendererProps {
  content: string
  className?: string
}

export function ProposalRenderer({ content, className }: ProposalRendererProps) {
  const parsed = parseXmlContent(content)

  // If no XML found, return null to fall back to default rendering
  if (parsed.proposals.length === 0 && parsed.clarifications.length === 0 && !parsed.summary) {
    return null
  }

  return (
    <div className={cn("space-y-4", className)}>
      {parsed.proposals.map((proposal, index) => (
        <ProposalCard key={`${proposal.organization}-${proposal.epic}-${proposal.slice.id}-${index}`} proposal={proposal} />
      ))}
      {parsed.summary && (
        <SummaryCard summary={parsed.summary} />
      )}
      {parsed.clarifications.length > 0 && (
        <ClarificationsCard clarifications={parsed.clarifications} />
      )}
      {/* Show any remaining plain text as markdown */}
      {parsed.plainText && (
        <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {parsed.plainText}
          </ReactMarkdown>
        </div>
      )}
    </div>
  )
}

export default ProposalRenderer
