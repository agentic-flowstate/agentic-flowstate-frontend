"use client"

import { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { GraphTicket, PipelineStep, PipelineStepDetail } from '@/lib/types'
import { getPipelineStepDetail, approveStep, rejectStep } from '@/lib/api/pipelines'
import { getAgentIcon, getAgentName } from './utils'
import { cn } from '@/lib/utils'
import { Check, X, Loader2, AlertTriangle } from 'lucide-react'

interface ApprovalDrawerProps {
  ticket: GraphTicket | null
  step: PipelineStep | null
  isOpen: boolean
  onClose: () => void
  onApprovalComplete: () => void
}

export function ApprovalDrawer({
  ticket,
  step,
  isOpen,
  onClose,
  onApprovalComplete,
}: ApprovalDrawerProps) {
  const [detail, setDetail] = useState<PipelineStepDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)

  // Load step detail when drawer opens
  useEffect(() => {
    if (!isOpen || !ticket || !step) {
      setDetail(null)
      setError(null)
      setFeedback('')
      setShowRejectForm(false)
      return
    }

    async function loadDetail() {
      setLoading(true)
      setError(null)
      try {
        const data = await getPipelineStepDetail(ticket!.ticket_id, step!.step_id)
        setDetail(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load step details')
      } finally {
        setLoading(false)
      }
    }

    loadDetail()
  }, [isOpen, ticket, step])

  const handleApprove = async () => {
    if (!ticket || !step) return

    setActionLoading(true)
    setError(null)
    try {
      await approveStep(ticket.ticket_id, step.step_id)
      onApprovalComplete()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve step')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!ticket || !step || !feedback.trim()) return

    setActionLoading(true)
    setError(null)
    try {
      await rejectStep(ticket.ticket_id, step.step_id, feedback)
      onApprovalComplete()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject step')
    } finally {
      setActionLoading(false)
    }
  }

  if (!ticket || !step) return null

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="text-xl">{getAgentIcon(step.agent_type)}</span>
            {getAgentName(step.agent_type)} - Approval Required
          </SheetTitle>
          <SheetDescription>
            <span className="font-mono text-xs">{ticket.ticket_id}</span>
            <span className="mx-2">·</span>
            {ticket.title}
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Step details */}
          {!loading && detail && (
            <>
              {/* Agent run outputs */}
              {detail.agent_run?.outputs && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Agent Outputs</h4>
                  <div className="bg-muted rounded-lg p-4 overflow-x-auto">
                    <pre className="text-xs font-mono whitespace-pre-wrap">
                      {JSON.stringify(detail.agent_run.outputs, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Tool calls */}
              {detail.agent_run?.tool_calls && detail.agent_run.tool_calls.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Tool Calls Made</h4>
                  <div className="space-y-2">
                    {detail.agent_run.tool_calls.map((call, i) => (
                      <div key={i} className="bg-muted rounded-lg p-3">
                        <div className="font-mono text-xs font-medium text-primary mb-1">
                          {call.tool_name}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {JSON.stringify(call.arguments)}
                        </div>
                        {call.result !== undefined && (
                          <div className="mt-2 pt-2 border-t border-border text-[10px]">
                            <span className="text-muted-foreground">Result: </span>
                            <span>
                              {(() => {
                                const result = call.result
                                const str = typeof result === 'string' ? result : JSON.stringify(result)
                                return str.slice(0, 200) + (str.length > 200 ? '...' : '')
                              })()}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error if any */}
              {detail.agent_run?.error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-destructive mb-1">Error</h4>
                  <p className="text-xs text-destructive/80">{detail.agent_run.error}</p>
                </div>
              )}

              {/* No data message */}
              {!detail.agent_run && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No agent run data available for this step
                </div>
              )}
            </>
          )}

          {/* Reject form */}
          {showRejectForm && (
            <div className="space-y-3">
              <label className="text-sm font-medium">Rejection Feedback</label>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Explain why this step needs to be revised..."
                rows={4}
              />
            </div>
          )}
        </div>

        <SheetFooter className="flex gap-2">
          {!showRejectForm ? (
            <>
              <Button
                variant="outline"
                onClick={() => setShowRejectForm(true)}
                disabled={actionLoading}
              >
                <X className="h-4 w-4 mr-1" />
                Reject
              </Button>
              <Button
                onClick={handleApprove}
                disabled={actionLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Check className="h-4 w-4 mr-1" />
                )}
                Approve
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setShowRejectForm(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={actionLoading || !feedback.trim()}
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <X className="h-4 w-4 mr-1" />
                )}
                Submit Rejection
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
