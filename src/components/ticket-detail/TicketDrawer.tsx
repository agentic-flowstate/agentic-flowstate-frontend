"use client"

import React, { useState } from 'react'
import { X, FileText, Copy, Check } from 'lucide-react'
import { Ticket } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { AgentRunModal } from '@/components/agent-run-modal'
import { useTicketDetail } from './useTicketDetail'
import { TicketAgentSection } from './TicketAgentSection'
import { TicketNotesSection } from './TicketNotesSection'
import { TicketRelationships } from './TicketRelationships'
import { TicketMetadata } from './TicketMetadata'
import { TicketHistory } from './TicketHistory'
import { TicketGuidanceSection } from './TicketGuidanceSection'

function CopyTicketId({ ticketId }: { ticketId: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
      onClick={() => {
        navigator.clipboard.writeText(ticketId)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      title="Copy ticket ID"
    >
      {ticketId}
      {copied ? <Check className="h-2.5 w-2.5 text-green-500" /> : <Copy className="h-2.5 w-2.5" />}
    </button>
  )
}

export interface TicketDetailProps {
  ticket: Ticket | null
  isOpen: boolean
  onClose: () => void
  activeAgentRun?: string | null
  onAgentRunChange?: (sessionId: string | null) => void
  onTicketUpdate?: (ticket: Ticket) => void
}

export function TicketDrawer({ ticket, isOpen, onClose, activeAgentRun, onAgentRunChange, onTicketUpdate }: TicketDetailProps) {
  const {
    notes,
    setNotes,
    isEditingNotes,
    setIsEditingNotes,
    isSavingNotes,
    handleSaveNotes,
    agentRuns,
    isCheckingActiveAgent,
    isAgentRunning,
    completedAgentTypes,
    archivedRuns,
    agentTypes,
    isModalOpen,
    modalAgentType,
    modalPreviousSessionId,
    shouldAutoStart,
    reconnectSessionId,
    handleOpenAssistant,
    handleRunAgent,
    handleRunPipeline,
    handleRetryStep,
    handleModalClose,
    handleAgentStart,
    handleModalComplete,
    handleViewArchivedRun,
    handleHistoryRunClick,
  } = useTicketDetail({ ticket, isOpen, activeAgentRun, onAgentRunChange, onTicketUpdate })

  if (!ticket) return null

  return (
    <>
      {/* Drawer */}
      <div
        className={cn(
          "fixed right-0 top-12 bottom-0 w-96 bg-background border-l border-border z-50",
          "transition-transform duration-200",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="h-14 border-b border-border flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <CopyTicketId ticketId={ticket.ticket_id} />
            <span className="text-xs text-muted-foreground">•</span>
            <span className={cn(
              "text-xs font-medium",
              ticket.status === 'completed' && "text-green-500",
              ticket.status === 'blocked' && "text-destructive",
              ticket.status === 'in_progress' && "text-blue-500",
              (!ticket.status || ticket.status === 'open') && "text-muted-foreground"
            )}>
              {(ticket.status || 'open').toUpperCase().replace('_', ' ')}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClose}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        {/* Content */}
        <div className="h-full overflow-y-auto pb-20">
          <div className="p-6 space-y-6">
            {/* Title */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">{ticket.title}</h2>
            </div>

            {/* Description */}
            {ticket.description && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">DESCRIPTION</span>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{ticket.description}</p>
              </div>
            )}

            {/* Guidance & Assistant Section */}
            <TicketGuidanceSection
              ticket={ticket}
              onOpenAssistant={handleOpenAssistant}
              onTicketUpdate={onTicketUpdate}
            />

            {/* Agent Runs Section */}
            <TicketAgentSection
              agentTypes={agentTypes}
              pipeline={ticket.pipeline}
              isAgentRunning={isAgentRunning}
              modalAgentType={modalAgentType}
              isCheckingActiveAgent={isCheckingActiveAgent}
              completedAgentTypes={completedAgentTypes}
              archivedRuns={archivedRuns}
              onRunAgent={handleRunAgent}
              onRunPipeline={handleRunPipeline}
              onRetryStep={handleRetryStep}
              onViewArchivedRun={handleViewArchivedRun}
              variant="desktop"
            />


            {/* Relationships */}
            <TicketRelationships ticket={ticket} variant="desktop" />

            {/* Metadata */}
            <TicketMetadata ticket={ticket} variant="desktop" />

            {/* Ticket History */}
            <TicketHistory
              epicId={ticket.epic_id}
              sliceId={ticket.slice_id}
              ticketId={ticket.ticket_id}
              onAgentRunClick={handleHistoryRunClick}
            />
          </div>
        </div>
      </div>

      {/* Agent Run Modal */}
      <AgentRunModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        ticket={ticket}
        agentType={modalAgentType}
        previousSessionId={modalPreviousSessionId}
        reconnectSessionId={reconnectSessionId}
        autoStart={shouldAutoStart}
        onStart={handleAgentStart}
        onComplete={handleModalComplete}
        agentRuns={agentRuns}
        onTicketUpdate={onTicketUpdate}
      />
    </>
  )
}
