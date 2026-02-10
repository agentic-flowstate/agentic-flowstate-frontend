"use client"

import React, { useState } from 'react'
import { Bot, Play, Loader2, Check, History, Clock, GitBranch, CircleDot, CircleCheck, CirclePause, CircleX, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  getAgentTypeDisplayInfo,
  type AgentType,
  type AgentRun,
} from '@/lib/api/agents'
import type { Pipeline, PipelineStep, PipelineStepStatus } from '@/lib/types'

// Helper to format template_id for display
function formatTemplateName(templateId: string): string {
  return templateId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Get icon for step status
function getStepStatusIcon(status: PipelineStepStatus, className: string) {
  switch (status) {
    case 'completed':
      return <CircleCheck className={cn(className, "text-green-500")} />
    case 'running':
      return <Loader2 className={cn(className, "animate-spin text-blue-500")} />
    case 'awaiting_approval':
      return <CirclePause className={cn(className, "text-yellow-500")} />
    case 'failed':
      return <CircleX className={cn(className, "text-red-500")} />
    case 'skipped':
      return <Circle className={cn(className, "text-muted-foreground")} />
    case 'queued':
    default:
      return <CircleDot className={cn(className, "text-muted-foreground")} />
  }
}

// Get status label for step
function getStepStatusLabel(status: PipelineStepStatus): { label: string; color: string } | null {
  switch (status) {
    case 'running':
      return { label: 'Running', color: 'text-blue-500' }
    case 'completed':
      return { label: 'Done', color: 'text-green-500' }
    case 'awaiting_approval':
      return { label: 'Needs Approval', color: 'text-yellow-500' }
    case 'failed':
      return { label: 'Failed', color: 'text-red-500' }
    default:
      return null
  }
}

export interface TicketAgentSectionProps {
  agentTypes: AgentType[]
  pipeline?: Pipeline
  isAgentRunning: boolean
  modalAgentType: AgentType | null
  isCheckingActiveAgent: boolean
  completedAgentTypes: Set<string>
  archivedRuns: AgentRun[]
  onRunAgent: (agentType: AgentType) => void
  onRunPipeline: () => Promise<void>
  onViewArchivedRun: (run: AgentRun) => void
  variant?: 'desktop' | 'mobile'
}

export function TicketAgentSection({
  agentTypes,
  pipeline,
  isAgentRunning,
  modalAgentType,
  isCheckingActiveAgent,
  completedAgentTypes,
  archivedRuns,
  onRunAgent,
  onRunPipeline,
  onViewArchivedRun,
  variant = 'desktop',
}: TicketAgentSectionProps) {
  const [isPipelineStarting, setIsPipelineStarting] = useState(false)
  const isMobile = variant === 'mobile'
  const iconSize = isMobile ? 'h-4 w-4' : 'h-3 w-3'
  const largeIconSize = isMobile ? 'h-5 w-5' : 'h-3 w-3'
  const textSize = isMobile ? 'text-sm' : 'text-xs'
  const smallTextSize = isMobile ? 'text-xs' : 'text-[10px]'

  // If we have pipeline steps, render those directly
  const hasPipelineSteps = pipeline?.steps && pipeline.steps.length > 0

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <GitBranch className={cn(iconSize, "text-muted-foreground")} />
        <span className={cn(textSize, "font-medium text-muted-foreground")}>PIPELINE</span>
        {pipeline?.template_id && (
          <Badge variant="outline" className={cn(smallTextSize, "ml-auto font-normal")}>
            {formatTemplateName(pipeline.template_id)}
          </Badge>
        )}
      </div>

      {/* Run Pipeline Button */}
      {hasPipelineSteps && (() => {
        const firstActionableStep = pipeline!.steps.find(s => s.status === 'queued' && s.execution_type === 'auto')
          ?? pipeline!.steps.find(s => s.status === 'queued')
        const allDone = pipeline!.steps.every(s => s.status === 'completed')
        const hasRunning = pipeline!.steps.some(s => s.status === 'running')

        if (firstActionableStep && !allDone && !hasRunning && !isAgentRunning) {
          return (
            <Button
              size={isMobile ? "lg" : "sm"}
              className={cn("w-full mb-3", isMobile ? "py-3" : "")}
              onClick={async () => {
                setIsPipelineStarting(true)
                try {
                  await onRunPipeline()
                } finally {
                  setIsPipelineStarting(false)
                }
              }}
              disabled={isCheckingActiveAgent || isPipelineStarting}
            >
              {isPipelineStarting ? (
                <Loader2 className={cn(iconSize, "mr-2 animate-spin")} />
              ) : (
                <Play className={cn(iconSize, "mr-2")} />
              )}
              {isPipelineStarting ? 'Starting...' : 'Run Pipeline'}
            </Button>
          )
        }
        return null
      })()}

      {/* Pipeline Steps */}
      <div className={cn(
        isMobile ? "grid grid-cols-1 gap-2" : "flex flex-col gap-2 mb-4"
      )}>
        {hasPipelineSteps ? (
          // Render actual pipeline steps
          pipeline!.steps.map((step, index) => {
            const isThisRunning = isAgentRunning && modalAgentType === step.agent_type
            const isThisChecking = isCheckingActiveAgent
            const statusInfo = getStepStatusLabel(step.status)
            const isManual = step.execution_type === 'manual'
            // Step is not ready if it's queued and a prior step hasn't completed
            const priorStep = index > 0 ? pipeline!.steps[index - 1] : null
            const isNotReady = step.status === 'queued' && priorStep != null && priorStep.status !== 'completed'

            return (
              <Button
                key={step.step_id}
                variant="outline"
                size={isMobile ? "lg" : "sm"}
                className={cn(
                  "h-auto flex items-start gap-0.5",
                  isMobile ? "py-3 gap-3" : "py-2 flex-col",
                  isThisRunning && "border-blue-500 bg-blue-500/5",
                  step.status === 'completed' && "border-green-500/50 bg-green-500/5",
                  step.status === 'awaiting_approval' && "border-yellow-500/50 bg-yellow-500/5",
                  step.status === 'failed' && "border-red-500/50 bg-red-500/5",
                  isNotReady && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => onRunAgent(step.agent_type as AgentType)}
                disabled={isThisChecking || (isAgentRunning && step.status !== 'completed' && step.status !== 'failed' && modalAgentType !== step.agent_type) || isNotReady}
              >
                {isMobile ? (
                  // Mobile layout - horizontal
                  <>
                    {isThisRunning ? (
                      <Loader2 className={cn(largeIconSize, "animate-spin text-blue-500 shrink-0")} />
                    ) : (
                      getStepStatusIcon(step.status, cn(largeIconSize, "shrink-0"))
                    )}
                    <div className="flex flex-col items-start text-left min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(smallTextSize, "text-muted-foreground font-mono")}>{index + 1}</span>
                        <span className={cn(textSize, "font-medium")}>{step.name || step.step_id}</span>
                        {isManual && (
                          <Badge variant="secondary" className={cn(smallTextSize, "py-0 px-1")}>manual</Badge>
                        )}
                      </div>
                      <span className={cn(smallTextSize, "text-muted-foreground font-normal truncate w-full")}>
                        {isThisRunning ? 'Tap to view output' : step.status === 'completed' ? 'Tap to view results' : step.agent_type}
                      </span>
                    </div>
                    {statusInfo && (
                      <span className={cn(smallTextSize, statusInfo.color, "shrink-0")}>{statusInfo.label}</span>
                    )}
                  </>
                ) : (
                  // Desktop layout - vertical
                  <>
                    <div className="flex items-center gap-1.5 w-full">
                      {isThisRunning ? (
                        <Loader2 className={cn(largeIconSize, "animate-spin text-blue-500")} />
                      ) : (
                        getStepStatusIcon(step.status, largeIconSize)
                      )}
                      <span className={cn(smallTextSize, "text-muted-foreground font-mono")}>{index + 1}</span>
                      <span className={cn(textSize, "font-medium")}>{step.name || step.step_id}</span>
                      {isManual && (
                        <Badge variant="secondary" className={cn(smallTextSize, "py-0 px-1")}>manual</Badge>
                      )}
                      {statusInfo && (
                        <span className={cn("ml-auto", smallTextSize, statusInfo.color)}>{statusInfo.label}</span>
                      )}
                    </div>
                    <span className={cn(smallTextSize, "text-muted-foreground font-normal")}>
                      {isThisRunning ? 'Click to view output' : step.status === 'completed' ? 'Click to view results' : step.agent_type}
                    </span>
                  </>
                )}
              </Button>
            )
          })
        ) : (
          // No pipeline - show empty state
          <div className={cn("text-center py-4 text-muted-foreground", textSize)}>
            No pipeline configured for this ticket
          </div>
        )}
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
