/**
 * Email Draft API Functions
 */

import { AGENT_API_BASE } from './types'
import type { EmailDraft, DraftListResponse } from '@/lib/types'

export interface CreateDraftRequest {
  session_id?: string
  ticket_id?: string
  epic_id?: string
  slice_id?: string
  from_address?: string
  to_address: string
  cc_address?: string
  subject: string
  body: string
  notes?: string
}

export interface UpdateDraftRequest {
  from_address?: string
  to_address?: string
  cc_address?: string
  subject?: string
  body?: string
  notes?: string
}

/**
 * Create a new email draft
 */
export async function createDraft(req: CreateDraftRequest): Promise<EmailDraft> {
  const response = await fetch(`${AGENT_API_BASE}/api/drafts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to create draft: ${errorText}`)
  }

  return response.json()
}

/**
 * List all drafts
 */
export async function listDrafts(includeAll = false): Promise<DraftListResponse> {
  const params = includeAll ? '?include_all=true' : ''
  const response = await fetch(`${AGENT_API_BASE}/api/drafts${params}`)

  if (!response.ok) {
    throw new Error('Failed to list drafts')
  }

  return response.json()
}

/**
 * Get a specific draft
 */
export async function getDraft(id: number): Promise<EmailDraft> {
  const response = await fetch(`${AGENT_API_BASE}/api/drafts/${id}`)

  if (!response.ok) {
    throw new Error('Failed to get draft')
  }

  return response.json()
}

/**
 * Update a draft
 */
export async function updateDraft(id: number, req: UpdateDraftRequest): Promise<EmailDraft> {
  const response = await fetch(`${AGENT_API_BASE}/api/drafts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })

  if (!response.ok) {
    throw new Error('Failed to update draft')
  }

  return response.json()
}

/**
 * Delete a draft
 */
export async function deleteDraft(id: number): Promise<void> {
  const response = await fetch(`${AGENT_API_BASE}/api/drafts/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error('Failed to delete draft')
  }
}

/**
 * Send a draft via email
 */
export async function sendDraft(id: number): Promise<{ message_id: string; success: boolean }> {
  const response = await fetch(`${AGENT_API_BASE}/api/drafts/${id}/send`, {
    method: 'POST',
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to send draft: ${errorText}`)
  }

  return response.json()
}
