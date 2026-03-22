"use client"

import React, { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { X, ArrowLeft, FileText } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { AgentRunModal } from '@/components/agent-run-modal'
import { CopyTicketId } from '@/components/copy-ticket-id'
import { useTicketDetail } from './useTicketDetail'
import { markdownComponents } from '@/components/message-renderer/MessageRenderer'
import { TicketAgentSection } from './TicketAgentSection'
import { TicketNotesSection } from './TicketNotesSection'
import { TicketRelationships } from './TicketRelationships'
import { TicketMetadata } from './TicketMetadata'
import { TicketHistory } from './TicketHistory'
import { TicketDetailProps } from './TicketDrawer'
import { TicketDocumentationSection } from './TicketDocumentationSection'
import { DocumentViewerModal } from './DocumentViewerModal'

export function TicketDetailMobile({ ticket, isOpen, onClose, activeAgentRun, onAgentRunChange, onTicketUpdate }: TicketDetailProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
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
    runningAgentInfo,
    completedAgentTypes,
    archivedRuns,
    isModalOpen,
    modalAgentType,
    modalPreviousSessionId,
    shouldAutoStart,
    reconnectSessionId,
    handleManageDocs,
    handleRunAgent,
    handleModalClose,
    handleAgentStart,
    handleModalComplete,
    handleViewArchivedRun,
    handleHistoryRunClick,
  } = useTicketDetail({ ticket, isOpen, activeAgentRun, onAgentRunChange, onTicketUpdate })

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const [viewArtifactId, setViewArtifactIdRaw] = useState<string | null>(
    () => searchParams.get('doc')
  )

  const setViewArtifactId = useCallback((id: string | null) => {
    setViewArtifactIdRaw(id)
    const params = new URLSearchParams(window.location.search)
    if (id) {
      params.set('doc', id)
    } else {
      params.delete('doc')
    }
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname
    router.replace(newUrl, { scroll: false })
  }, [router])

  if (!ticket || !isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background">
        {/* Header */}
        <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-background">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onClose}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex flex-col">
              <CopyTicketId ticketId={ticket.ticket_id} className="text-[10px]" />
              <span className={cn(
                "text-xs font-medium",
                ticket.status === 'done' && "text-green-500",
                ticket.status === 'blocked' && "text-destructive",
                ticket.status === 'in_progress' && "text-blue-500",
                (!ticket.status || ticket.status === 'open') && "text-muted-foreground"
              )}>
                {(ticket.status || 'open').toUpperCase().replace('_', ' ')}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="h-[calc(100%-56px)] overflow-y-auto">
          <div className="p-4 space-y-6">
            {/* Title */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">{ticket.title}</h2>
            </div>

            {/* Description */}
            {ticket.description && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">DESCRIPTION</span>
                </div>
                <div className="text-sm text-foreground prose-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{ticket.description}</ReactMarkdown>
                </div>
              </div>
            )}

            {/* Documentation Section */}
            <TicketDocumentationSection
              ticketId={ticket.ticket_id}
              documentation={ticket.documentation}
              onManageDocs={handleManageDocs}
              onViewDoc={setViewArtifactId}
              isAgentRunning={isAgentRunning}
              variant="mobile"
            />

            {/* Agent Bank */}
            <TicketAgentSection
              isAgentRunning={isAgentRunning}
              runningAgentType={runningAgentInfo?.agentType}
              isCheckingActiveAgent={isCheckingActiveAgent}
              completedAgentTypes={completedAgentTypes}
              archivedRuns={archivedRuns}
              onRunAgent={handleRunAgent}
              onViewArchivedRun={handleViewArchivedRun}
              variant="mobile"
            />

            {/* Notes */}
            {/* Relationships */}
            <TicketRelationships ticket={ticket} variant="mobile" />

            {/* Metadata */}
            <TicketMetadata ticket={ticket} variant="mobile" />

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
      />

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={!!viewArtifactId}
        onClose={() => setViewArtifactId(null)}
        ticketId={ticket.ticket_id}
        artifactId={viewArtifactId}
      />
    </>
  )
}
