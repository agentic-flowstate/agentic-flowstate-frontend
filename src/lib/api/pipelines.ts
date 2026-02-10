/**
 * Pipeline API functions
 *
 * API calls for ticket pipeline management - step approvals, rejections, and agent run details.
 */

import type { TicketPipeline, PipelineStepDetail } from "@/lib/types"
import type { OrganizationId } from "@/contexts/organization-context"

// Get current organization from localStorage (client-side only)
function getCurrentOrg(): OrganizationId | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem('selected-organization')
  return stored as OrganizationId | null
}

/**
 * Call API endpoint and handle errors
 */
async function callAPI<T>(path: string, options?: RequestInit): Promise<T> {
  try {
    const currentOrg = getCurrentOrg()

    const response = await fetch(path, {
      ...options,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'X-Organization': currentOrg || 'telemetryops',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`
      try {
        const errorData = await response.json()
        errorMessage = errorData.detail || errorData.error || errorMessage
      } catch {
        errorMessage = response.statusText || errorMessage
      }
      throw new Error(errorMessage)
    }

    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return undefined as unknown as T
    }

    return await response.json()
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Unable to connect to API routes')
    }
    throw new Error(`API call failed: ${error instanceof Error ? error.message : 'unknown error'}`)
  }
}

/**
 * Get pipeline state for a ticket
 */
export async function getTicketPipeline(ticketId: string): Promise<TicketPipeline | null> {
  try {
    return await callAPI<TicketPipeline>(`/api/tickets/${encodeURIComponent(ticketId)}/pipeline`)
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      return null
    }
    throw error
  }
}

/**
 * Get detailed step info including agent run data
 */
export async function getPipelineStepDetail(
  ticketId: string,
  stepId: string
): Promise<PipelineStepDetail | null> {
  try {
    return await callAPI<PipelineStepDetail>(
      `/api/tickets/${encodeURIComponent(ticketId)}/pipeline/steps/${encodeURIComponent(stepId)}/agent-run`
    )
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      return null
    }
    throw error
  }
}

/**
 * Approve a pipeline step that's awaiting approval
 */
export async function approveStep(
  ticketId: string,
  stepId: string
): Promise<TicketPipeline> {
  return callAPI<TicketPipeline>(
    `/api/tickets/${encodeURIComponent(ticketId)}/pipeline/steps/${encodeURIComponent(stepId)}/approve`,
    { method: 'POST' }
  )
}

/**
 * Reject a pipeline step with feedback
 */
export async function rejectStep(
  ticketId: string,
  stepId: string,
  feedback: string
): Promise<TicketPipeline> {
  return callAPI<TicketPipeline>(
    `/api/tickets/${encodeURIComponent(ticketId)}/pipeline/steps/${encodeURIComponent(stepId)}/reject`,
    {
      method: 'POST',
      body: JSON.stringify({ feedback })
    }
  )
}

/**
 * Start pipeline execution in the background (no modal/streaming)
 */
export async function runPipeline(ticketId: string): Promise<{ started: boolean; message: string; session_id?: string }> {
  return callAPI(`/api/tickets/${encodeURIComponent(ticketId)}/pipeline/run`, {
    method: 'POST',
  })
}

/**
 * Retry a failed or skipped pipeline step.
 * Resets the step to queued, un-skips downstream steps, cleans up old runs, and auto-starts.
 */
export async function retryPipelineStep(
  ticketId: string,
  stepId: string
): Promise<{ step: unknown; pipeline_status: string; session_id?: string; retried: boolean }> {
  return callAPI(
    `/api/tickets/${encodeURIComponent(ticketId)}/pipeline/steps/${encodeURIComponent(stepId)}/retry`,
    { method: 'POST' }
  )
}

/**
 * Get pipelines for multiple tickets at once (batch)
 */
export async function getTicketPipelines(ticketIds: string[]): Promise<Record<string, TicketPipeline>> {
  if (ticketIds.length === 0) return {}

  // Fetch all pipelines in parallel
  const results = await Promise.allSettled(
    ticketIds.map(async (id) => {
      const pipeline = await getTicketPipeline(id)
      return { id, pipeline }
    })
  )

  const pipelines: Record<string, TicketPipeline> = {}
  results.forEach((result) => {
    if (result.status === 'fulfilled' && result.value.pipeline) {
      pipelines[result.value.id] = result.value.pipeline
    }
  })

  return pipelines
}
