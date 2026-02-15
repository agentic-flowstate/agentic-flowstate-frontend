"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Loader2, Terminal, AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Circle, Wrench, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import mermaid from 'mermaid'
import type { MessageBlock } from '@/hooks/useAgentStream'
import { formatToolResult } from '@/hooks/useAgentStream'

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

interface MessageRendererProps {
  messages: MessageBlock[]
  onToggleToolExpanded: (blockIndex: number, toolId: string) => void
  onToggleToolsCollapsed: (blockIndex: number) => void
  /** Optional custom renderer for text blocks (e.g., email parsing) */
  renderTextBlock?: (block: MessageBlock, index: number) => React.ReactNode | null
  /** Show loading state */
  isLoading?: boolean
  loadingMessage?: string
}

/**
 * Shared component for rendering agent message blocks.
 * Used by AgentRunModal and workspace-manager.
 */
export function MessageRenderer({
  messages,
  onToggleToolExpanded,
  onToggleToolsCollapsed,
  renderTextBlock,
  isLoading,
  loadingMessage = 'Thinking...',
}: MessageRendererProps) {
  return (
    <>
      {messages.map((block, blockIndex) => (
        <div key={blockIndex}>
          {/* User message - iMessage style bubble on right */}
          {block.type === 'user' && (
            <div className="flex flex-col items-end">
              <div className="bg-primary text-primary-foreground px-4 py-2.5 rounded-2xl rounded-br-md max-w-[85%] sm:max-w-[75%] shadow-sm">
                <p className="text-sm whitespace-pre-wrap break-words">{block.content}</p>
              </div>
              {block.timestamp && (
                <span className="text-[10px] text-muted-foreground/50 mt-0.5 mr-1">{block.timestamp}</span>
              )}
              <CopyButton content={block.content || ''} align="right" />
            </div>
          )}

          {/* Text block */}
          {block.type === 'text' && block.content && (
            renderTextBlock ? (
              renderTextBlock(block, blockIndex) ?? <DefaultTextBlock content={block.content} />
            ) : (
              <DefaultTextBlock content={block.content} />
            )
          )}

          {/* Tool calls block */}
          {block.type === 'tool_calls' && block.toolCalls && block.toolCalls.length > 0 && (
            <ToolCallsBlock
              block={block}
              blockIndex={blockIndex}
              onToggleToolExpanded={onToggleToolExpanded}
              onToggleToolsCollapsed={onToggleToolsCollapsed}
            />
          )}

          {/* Thinking block */}
          {block.type === 'thinking' && block.content && (
            <div className="max-w-[85%] sm:max-w-[75%]">
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl rounded-bl-md">
                <div className="text-xs font-medium text-yellow-600 dark:text-yellow-400 mb-1">
                  Thinking
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {block.content}
                </p>
              </div>
            </div>
          )}

          {/* Status block */}
          {block.type === 'status' && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              <span>{block.message || block.status}</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          )}
        </div>
      ))}

      {/* Loading indicator */}
      {isLoading && messages.length > 0 && messages[messages.length - 1]?.type === 'user' && (
        <div className="flex justify-start">
          <div className="bg-muted px-4 py-2.5 rounded-2xl rounded-bl-md shadow-sm">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>{loadingMessage}</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/** Copy button component */
function CopyButton({ content, align = 'left' }: { content: string; align?: 'left' | 'right' }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    // Try modern clipboard API first, fallback to execCommand for HTTP
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(content)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = content
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "mt-1 p-1 text-muted-foreground/60 hover:text-muted-foreground transition-colors",
        align === 'right' ? 'mr-1' : 'ml-1'
      )}
      title="Copy message"
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </button>
  )
}

/** Mermaid diagram renderer */
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
      className="flex justify-center p-4 bg-background/30 rounded-lg overflow-x-auto my-2"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

/** Shared markdown component overrides */
export const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li className="leading-relaxed">{children}</li>,
  code: ({ className, children }: { className?: string; children?: React.ReactNode }) => {
    const isInline = !className
    return isInline
      ? <code className="bg-background/50 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
      : <code className={cn("block bg-background/50 p-2 rounded text-xs font-mono overflow-x-auto", className)}>{children}</code>
  },
  pre: ({ children }: { children?: React.ReactNode }) => <pre className="bg-background/50 p-2 rounded overflow-x-auto my-2 text-xs">{children}</pre>,
  h1: ({ children }: { children?: React.ReactNode }) => <h1 className="text-lg font-bold mt-3 mb-2">{children}</h1>,
  h2: ({ children }: { children?: React.ReactNode }) => <h2 className="text-base font-bold mt-2 mb-1">{children}</h2>,
  h3: ({ children }: { children?: React.ReactNode }) => <h3 className="text-sm font-bold mt-2 mb-1">{children}</h3>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold">{children}</strong>,
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => <a href={href} className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
  blockquote: ({ children }: { children?: React.ReactNode }) => <blockquote className="border-l-2 border-muted-foreground/30 pl-3 italic my-2">{children}</blockquote>,
}

/** Default text block with markdown + mermaid rendering - iMessage style bubble on left */
function DefaultTextBlock({ content }: { content: string }) {
  // Split content on mermaid code blocks to render them as diagrams
  const segments = content.split(/(```mermaid[\s\S]*?```)/g)
  const hasMermaid = segments.some(s => s.startsWith('```mermaid'))

  return (
    <div className="flex flex-col items-start">
      <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[85%] sm:max-w-[75%] shadow-sm">
        <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
          {hasMermaid ? (
            segments.map((segment, i) => {
              const mermaidMatch = segment.match(/^```mermaid\s*([\s\S]*?)```$/)
              if (mermaidMatch) {
                return <MermaidDiagram key={i} chart={mermaidMatch[1].trim()} />
              }
              if (!segment.trim()) return null
              return (
                <ReactMarkdown key={i} remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {segment}
                </ReactMarkdown>
              )
            })
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {content}
            </ReactMarkdown>
          )}
        </div>
      </div>
      <CopyButton content={content} align="left" />
    </div>
  )
}

/** Tool calls block with collapsible UI */
function ToolCallsBlock({
  block,
  blockIndex,
  onToggleToolExpanded,
  onToggleToolsCollapsed,
}: {
  block: MessageBlock
  blockIndex: number
  onToggleToolExpanded: (blockIndex: number, toolId: string) => void
  onToggleToolsCollapsed: (blockIndex: number) => void
}) {
  if (!block.toolCalls) return null

  return (
    <div className="max-w-[95%] sm:max-w-[85%] space-y-2">
      {/* Collapsible toggle for entire tool block */}
      <button
        onClick={() => onToggleToolsCollapsed(blockIndex)}
        className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
      >
        {block.toolsCollapsed ? (
          <ChevronRight className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0" />
        )}
        <Wrench className="h-4 w-4 shrink-0" />
        <span className="truncate">
          {block.toolsCollapsed ? 'Show' : 'Hide'} tools ({block.toolCalls.length})
        </span>
        {/* Show status summary when collapsed */}
        {block.toolsCollapsed && (
          <span className="ml-1 flex items-center gap-1 shrink-0">
            {block.toolCalls.some(t => t.status === 'running') && (
              <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
            )}
            {block.toolCalls.some(t => t.status === 'error') && (
              <AlertCircle className="h-3 w-3 text-red-500" />
            )}
            {block.toolCalls.every(t => t.status === 'completed') && (
              <CheckCircle2 className="h-3 w-3 text-green-500" />
            )}
          </span>
        )}
      </button>

      {/* Individual tool calls - only shown when not collapsed */}
      {!block.toolsCollapsed && block.toolCalls.map((tool) => (
        <ToolCallItem
          key={tool.id}
          tool={tool}
          blockIndex={blockIndex}
          onToggleExpanded={onToggleToolExpanded}
        />
      ))}
    </div>
  )
}

/** Individual tool call item */
function ToolCallItem({
  tool,
  blockIndex,
  onToggleExpanded,
}: {
  tool: NonNullable<MessageBlock['toolCalls']>[number]
  blockIndex: number
  onToggleExpanded: (blockIndex: number, toolId: string) => void
}) {
  return (
    <div
      className={cn(
        "border rounded-xl overflow-hidden transition-colors",
        tool.status === 'running' ? "border-blue-500/50 bg-blue-500/5" :
        tool.status === 'error' ? "border-red-500/30" :
        tool.status === 'completed' ? "border-border" : "border-border"
      )}
    >
      {/* Tool header */}
      <button
        onClick={() => onToggleExpanded(blockIndex, tool.id)}
        className={cn(
          "w-full px-2 sm:px-3 py-2 flex items-center gap-1.5 sm:gap-2 hover:bg-muted/70 transition-colors",
          tool.status === 'running' ? "bg-blue-500/10" : "bg-muted/50"
        )}
      >
        {tool.isExpanded ? (
          <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
        )}
        {/* Status indicator */}
        {tool.status === 'running' && (
          <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin text-blue-500 shrink-0" />
        )}
        {tool.status === 'completed' && (
          <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 shrink-0" />
        )}
        {tool.status === 'error' && (
          <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 shrink-0" />
        )}
        {tool.status === 'pending' && (
          <Circle className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
        )}
        <Terminal className="h-3 w-3 sm:h-4 sm:w-4 text-purple-500 shrink-0 hidden sm:block" />
        <span className="font-mono text-xs sm:text-sm font-medium truncate">{tool.name}</span>
        {/* Right side status text - hidden on very small screens */}
        <span className={cn(
          "ml-auto text-xs shrink-0 hidden xs:block",
          tool.status === 'running' ? "text-blue-500" :
          tool.status === 'error' ? "text-red-500" :
          tool.status === 'completed' ? "text-green-500" : "text-muted-foreground"
        )}>
          {tool.status === 'running' && 'Running...'}
          {tool.status === 'completed' && 'Done'}
          {tool.status === 'error' && 'Error'}
          {tool.status === 'pending' && 'Pending'}
        </span>
      </button>

      {/* Tool details */}
      {tool.isExpanded && (
        <div className="border-t border-border">
          {/* Input */}
          <div className="p-2 sm:p-3 border-b border-border">
            <div className="text-xs font-medium text-muted-foreground mb-1">Input</div>
            <pre className="text-[10px] sm:text-xs bg-muted/30 p-2 rounded overflow-x-auto max-h-32 sm:max-h-48">
              {JSON.stringify(tool.input, null, 2)}
            </pre>
          </div>

          {/* Result */}
          <div className="p-2 sm:p-3">
            <div className={cn(
              "text-xs font-medium mb-1",
              tool.status === 'error' ? "text-red-500" :
              tool.status === 'running' ? "text-blue-500" : "text-muted-foreground"
            )}>
              {tool.status === 'error' ? 'Error' :
               tool.status === 'running' ? 'Output' : 'Result'}
            </div>
            {tool.status === 'running' && (
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Executing...
              </div>
            )}
            {tool.result !== undefined && (
              <pre className={cn(
                "text-[10px] sm:text-xs p-2 rounded overflow-x-auto max-h-48 sm:max-h-64 whitespace-pre-wrap break-words",
                tool.status === 'error' ? "bg-red-500/10" : "bg-muted/30"
              )}>
                {formatToolResult(tool.result, tool.name)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default MessageRenderer
