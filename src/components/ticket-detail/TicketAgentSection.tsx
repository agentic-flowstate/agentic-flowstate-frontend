"use client"

import React from 'react'
import { Bot, Play, History, Clock, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  getAgentTypeInfo,
  getAgentTypeDisplayInfo,
  type AgentType,
  type AgentRun,
} from '@/lib/api/agents'

/** Static list of agent types available in the Agent Bank */
const AGENT_BANK_TYPES: AgentType[] = [
  'exa-research',
  'codebase-research',
  'planning',
  'execution',
  'evaluation',
  'doc-drafter',
  'doc-manager',
]

export interface TicketAgentSectionProps {
  isAgentRunning: boolean
  runningAgentType?: AgentType | string
  isCheckingActiveAgent: boolean
  completedAgentTypes: Set<string>
  archivedRuns: AgentRun[]
  onRunAgent: (agentType: AgentType) => void
  onViewArchivedRun: (run: AgentRun) => void
  variant?: 'desktop' | 'mobile'
}

export function TicketAgentSection({
  isAgentRunning,
  runningAgentType,
  isCheckingActiveAgent,
  completedAgentTypes,
  archivedRuns,
  onRunAgent,
  onViewArchivedRun,
  variant = 'desktop',
}: TicketAgentSectionProps) {
  const isMobile = variant === 'mobile'
  const iconSize = isMobile ? 'h-4 w-4' : 'h-3 w-3'
  const textSize = isMobile ? 'text-sm' : 'text-xs'
  const smallTextSize = isMobile ? 'text-xs' : 'text-[10px]'

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Bot className={cn(iconSize, "text-muted-foreground")} />
        <span className={cn(textSize, "font-medium text-muted-foreground")}>AGENT BANK</span>
      </div>

      {/* Agent type grid */}
      <div className={cn(
        "grid gap-2 mb-4",
        isMobile ? "grid-cols-2" : "grid-cols-2"
      )}>
        {AGENT_BANK_TYPES.map((agentType) => {
          const info = getAgentTypeInfo(agentType)
          const isCompleted = completedAgentTypes.has(agentType)
          const isThisAgentRunning = isAgentRunning && runningAgentType === agentType

          return (
            <Button
              key={agentType}
              variant="outline"
              size={isMobile ? "default" : "sm"}
              className={cn(
                "h-auto flex flex-col items-start gap-0.5 py-2 px-3 overflow-hidden min-w-0 whitespace-normal text-left",
                isCompleted && "border-green-500/50 bg-green-500/5",
                isThisAgentRunning && "border-blue-500/50 bg-blue-500/5",
              )}
              onClick={() => onRunAgent(agentType)}
              disabled={isCheckingActiveAgent}
            >
              <div className="flex items-center gap-1.5 w-full min-w-0">
                {isThisAgentRunning ? (
                  <Loader2 className={cn(iconSize, "shrink-0 animate-spin text-blue-500")} />
                ) : (
                  <Play className={cn(iconSize, "shrink-0", info.color)} />
                )}
                <span className={cn(textSize, "font-medium truncate")}>{info.label}</span>
              </div>
              <span className={cn(smallTextSize, "text-muted-foreground font-normal truncate w-full")}>
                {info.description}
              </span>
            </Button>
          )
        })}
      </div>

      {/* Agent History - archived/legacy runs */}
      {archivedRuns.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border">
          <div className="flex items-center gap-2 mb-2">
            <History className={cn(iconSize, "text-muted-foreground")} />
            <span className={cn(textSize, "font-medium text-muted-foreground")}>AGENT HISTORY</span>
          </div>
          <div className={cn(isMobile ? "space-y-2" : "space-y-1.5")}>
            {archivedRuns.map((run) => {
              const displayInfo = getAgentTypeDisplayInfo(run.agent_type)
              return (
                <button
                  key={run.session_id}
                  onClick={() => onViewArchivedRun(run)}
                  className={cn(
                    "w-full flex items-center text-left bg-muted/30 hover:bg-muted/50 rounded transition-colors",
                    isMobile ? "gap-3 px-3 py-2.5 rounded-lg" : "gap-2 px-2 py-1.5"
                  )}
                >
                  <Clock className={cn(iconSize, displayInfo.color)} />
                  <span className={cn(textSize, isMobile ? "flex-1" : "", displayInfo.color)}>
                    {displayInfo.label}
                  </span>
                  <span className={cn("text-muted-foreground", isMobile ? "ml-auto" : "ml-auto", smallTextSize)}>
                    {new Date(run.started_at).toLocaleDateString()}
                  </span>
                  <span className={cn(
                    smallTextSize,
                    run.status === 'completed' ? "text-green-500" : "text-red-500"
                  )}>
                    {run.status === 'completed' ? 'Done' : 'Failed'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
