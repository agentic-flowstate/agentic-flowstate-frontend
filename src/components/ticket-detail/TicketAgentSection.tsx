"use client"

import React from 'react'
import { Bot, Play, Loader2, Check, History, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  getAgentTypeInfo,
  getAgentTypeDisplayInfo,
  type AgentType,
  type AgentRun,
} from '@/lib/api/agents'

export interface TicketAgentSectionProps {
  agentTypes: AgentType[]
  isAgentRunning: boolean
  modalAgentType: AgentType | null
  isCheckingActiveAgent: boolean
  completedAgentTypes: Set<string>
  archivedRuns: AgentRun[]
  onRunAgent: (agentType: AgentType) => void
  onViewArchivedRun: (run: AgentRun) => void
  variant?: 'desktop' | 'mobile'
}

export function TicketAgentSection({
  agentTypes,
  isAgentRunning,
  modalAgentType,
  isCheckingActiveAgent,
  completedAgentTypes,
  archivedRuns,
  onRunAgent,
  onViewArchivedRun,
  variant = 'desktop',
}: TicketAgentSectionProps) {
  const isMobile = variant === 'mobile'
  const iconSize = isMobile ? 'h-4 w-4' : 'h-3 w-3'
  const largeIconSize = isMobile ? 'h-5 w-5' : 'h-3 w-3'
  const textSize = isMobile ? 'text-sm' : 'text-xs'
  const smallTextSize = isMobile ? 'text-xs' : 'text-[10px]'

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Bot className={cn(iconSize, "text-muted-foreground")} />
        <span className={cn(textSize, "font-medium text-muted-foreground")}>AI AGENTS</span>
      </div>

      {/* Agent Type Buttons */}
      <div className={cn(
        isMobile ? "grid grid-cols-1 gap-2" : "flex flex-col gap-2 mb-4"
      )}>
        {agentTypes.map((type) => {
          const info = getAgentTypeInfo(type)
          const isThisRunning = isAgentRunning && modalAgentType === type
          const isThisChecking = isCheckingActiveAgent
          const isThisCompleted = completedAgentTypes.has(type)

          return (
            <Button
              key={type}
              variant="outline"
              size={isMobile ? "lg" : "sm"}
              className={cn(
                "h-auto flex items-start gap-0.5",
                isMobile ? "py-3 gap-3" : "py-2 flex-col",
                isThisRunning && "border-blue-500 bg-blue-500/5",
                isThisCompleted && !isThisRunning && "border-green-500/50 bg-green-500/5"
              )}
              onClick={() => onRunAgent(type)}
              disabled={isThisChecking || (isAgentRunning && modalAgentType !== type)}
            >
              {isMobile ? (
                // Mobile layout - horizontal
                <>
                  {isThisRunning ? (
                    <Loader2 className={cn(largeIconSize, "animate-spin text-blue-500 shrink-0")} />
                  ) : isThisCompleted ? (
                    <Check className={cn(largeIconSize, "text-green-500 shrink-0")} />
                  ) : (
                    <Play className={cn(largeIconSize, info.color, "shrink-0")} />
                  )}
                  <div className="flex flex-col items-start text-left min-w-0 flex-1">
                    <span className={cn(textSize, "font-medium")}>{info.label}</span>
                    <span className={cn(smallTextSize, "text-muted-foreground font-normal truncate w-full")}>
                      {isThisRunning ? 'Tap to view output' : isThisCompleted ? 'Tap to view results' : info.description}
                    </span>
                  </div>
                  {isThisRunning && (
                    <span className={cn(smallTextSize, "text-blue-500 shrink-0")}>Running</span>
                  )}
                  {isThisCompleted && !isThisRunning && (
                    <span className={cn(smallTextSize, "text-green-500 shrink-0")}>Done</span>
                  )}
                </>
              ) : (
                // Desktop layout - vertical
                <>
                  <div className="flex items-center gap-1.5 w-full">
                    {isThisRunning ? (
                      <Loader2 className={cn(largeIconSize, "animate-spin text-blue-500")} />
                    ) : isThisCompleted ? (
                      <Check className={cn(largeIconSize, "text-green-500")} />
                    ) : (
                      <Play className={cn(largeIconSize, info.color)} />
                    )}
                    <span className={cn(textSize, "font-medium")}>{info.label}</span>
                    {isThisRunning && (
                      <span className={cn("ml-auto", smallTextSize, "text-blue-500")}>Running</span>
                    )}
                    {isThisCompleted && !isThisRunning && (
                      <span className={cn("ml-auto", smallTextSize, "text-green-500")}>Done</span>
                    )}
                  </div>
                  <span className={cn(smallTextSize, "text-muted-foreground font-normal")}>
                    {isThisRunning ? 'Click to view output' : isThisCompleted ? 'Click to view results' : info.description}
                  </span>
                </>
              )}
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
