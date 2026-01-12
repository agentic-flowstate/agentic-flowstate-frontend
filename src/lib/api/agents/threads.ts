/**
 * Email Thread-Ticket Linking API Functions
 */

import { AGENT_API_BASE } from './types'
import type { ThreadTicketsResponse, EmailThreadTicket } from '@/lib/types'

/**
 * Get all tickets linked to an email thread
 */
export async function getTicketsForThread(threadId: string): Promise<ThreadTicketsResponse> {
  const response = await fetch(`${AGENT_API_BASE}/api/email-threads/${encodeURIComponent(threadId)}/tickets`)

  if (!response.ok) {
    throw new Error('Failed to get tickets for thread')
  }

  return response.json()
}

/**
 * Link an email thread to a ticket
 */
export async function linkThreadToTicket(
  threadId: string,
  ticketId: string,
  epicId?: string,
  sliceId?: string
): Promise<EmailThreadTicket> {
  const response = await fetch(`${AGENT_API_BASE}/api/email-threads/${encodeURIComponent(threadId)}/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticket_id: ticketId, epic_id: epicId, slice_id: sliceId }),
  })

  if (!response.ok) {
    throw new Error('Failed to link thread to ticket')
  }

  return response.json()
}

/**
 * Unlink an email thread from a ticket
 */
export async function unlinkThreadFromTicket(threadId: string, ticketId: string): Promise<void> {
  const response = await fetch(
    `${AGENT_API_BASE}/api/email-threads/${encodeURIComponent(threadId)}/tickets/${encodeURIComponent(ticketId)}`,
    { method: 'DELETE' }
  )

  if (!response.ok) {
    throw new Error('Failed to unlink thread from ticket')
  }
}
