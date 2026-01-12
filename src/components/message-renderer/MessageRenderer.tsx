"use client"

import React from 'react'
import { Loader2, Terminal, MessageSquare, AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Circle, Wrench, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { MessageBlock } from '@/hooks/useAgentStream'
import { formatToolResult } from '@/hooks/useAgentStream'

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
          {/* User message */}
          {block.type === 'user' && (
            <div className="flex gap-3 justify-end">
              <div className="bg-primary text-primary-foreground px-4 py-3 rounded-lg max-w-[80%]">
                <p className="text-sm whitespace-pre-wrap">{block.content}</p>
              </div>
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
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
            <div className="ml-11">
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
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
        <div className="flex gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageSquare className="h-4 w-4 text-primary" />
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">{loadingMessage}</span>
          </div>
        </div>
      )}
    </>
  )
}

/** Default text block with markdown rendering */
function DefaultTextBlock({ content }: { content: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        <MessageSquare className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-muted rounded-lg px-4 py-3">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                code: ({ className, children }) => {
                  const isInline = !className
                  return isInline
                    ? <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
                    : <code className={cn("block bg-muted p-3 rounded text-sm font-mono overflow-x-auto", className)}>{children}</code>
                },
                pre: ({ children }) => <pre className="bg-muted p-3 rounded overflow-x-auto my-2">{children}</pre>,
                h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-lg font-bold mt-3 mb-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-base font-bold mt-2 mb-1">{children}</h3>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                a: ({ href, children }) => <a href={href} className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                blockquote: ({ children }) => <blockquote className="border-l-2 border-muted-foreground/30 pl-3 italic my-2">{children}</blockquote>,
              }}
            >{content}</ReactMarkdown>
          </div>
        </div>
      </div>
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
    <div className="ml-11 space-y-2">
      {/* Collapsible toggle for entire tool block */}
      <button
        onClick={() => onToggleToolsCollapsed(blockIndex)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
      >
        {block.toolsCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
        <Wrench className="h-4 w-4" />
        <span>
          {block.toolsCollapsed ? 'Show' : 'Hide'} tool calls ({block.toolCalls.length})
        </span>
        {/* Show status summary when collapsed */}
        {block.toolsCollapsed && (
          <span className="ml-2 flex items-center gap-1">
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
        "border rounded-lg overflow-hidden transition-colors ml-6",
        tool.status === 'running' ? "border-blue-500/50 bg-blue-500/5" :
        tool.status === 'error' ? "border-red-500/30" :
        tool.status === 'completed' ? "border-border" : "border-border"
      )}
    >
      {/* Tool header */}
      <button
        onClick={() => onToggleExpanded(blockIndex, tool.id)}
        className={cn(
          "w-full px-3 py-2 flex items-center gap-2 hover:bg-muted/70 transition-colors",
          tool.status === 'running' ? "bg-blue-500/10" : "bg-muted/50"
        )}
      >
        {tool.isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        {/* Status indicator */}
        {tool.status === 'running' && (
          <Loader2 className="h-4 w-4 animate-spin text-blue-500 shrink-0" />
        )}
        {tool.status === 'completed' && (
          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
        )}
        {tool.status === 'error' && (
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
        )}
        {tool.status === 'pending' && (
          <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <Terminal className="h-4 w-4 text-purple-500 shrink-0" />
        <span className="font-mono text-sm font-medium truncate">{tool.name}</span>
        {/* Right side status text */}
        <span className={cn(
          "ml-auto text-xs shrink-0",
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
          <div className="p-3 border-b border-border">
            <div className="text-xs font-medium text-muted-foreground mb-1">Input</div>
            <pre className="text-xs bg-muted/30 p-2 rounded overflow-x-auto max-h-48">
              {JSON.stringify(tool.input, null, 2)}
            </pre>
          </div>

          {/* Result */}
          <div className="p-3">
            <div className={cn(
              "text-xs font-medium mb-1",
              tool.status === 'error' ? "text-red-500" :
              tool.status === 'running' ? "text-blue-500" : "text-muted-foreground"
            )}>
              {tool.status === 'error' ? 'Error' :
               tool.status === 'running' ? 'Output' : 'Result'}
            </div>
            {tool.status === 'running' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Executing...
              </div>
            )}
            {tool.result !== undefined && (
              <pre className={cn(
                "text-xs p-2 rounded overflow-x-auto max-h-64 whitespace-pre-wrap break-words",
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
