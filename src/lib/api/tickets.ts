/**
 * Data Access Layer for Ticketing System
 *
 * This module provides async functions to access ticketing data via Next.js API routes.
 * All calls go to relative /api/* endpoints handled by Next.js.
 * Organization context is passed via headers to all API calls.
 */

import { Epic, Slice, Ticket } from "@/lib/types"
import type { OrganizationId } from "@/contexts/organization-context"

// Use relative URLs for Next.js API routes
const API_BASE_URL = ''

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
    const url = `${API_BASE_URL}${path}`
    const currentOrg = getCurrentOrg()

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Organization': currentOrg || 'telemetryops', // Default to telemetryops
        ...options?.headers,
      },
    })

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`
      try {
        const errorData = await response.json()
        errorMessage = errorData.detail || errorData.error || errorMessage
      } catch {
        // If response isn't JSON, use status text
        errorMessage = response.statusText || errorMessage
      }
      throw new Error(errorMessage)
    }

    // Handle empty responses (like DELETE)
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
 * Get all epics
 * @returns Promise resolving to list of all epics
 */
export async function getEpics(): Promise<Epic[]> {
  const response = await callAPI<{ epics: Epic[] }>('/api/epics')
  return response.epics || []
}

/**
 * Get a single epic by ID
 * @param epicId - Epic ID to retrieve
 * @returns Promise resolving to epic or undefined if not found
 */
export async function getEpic(epicId: string): Promise<Epic | undefined> {
  const epics = await getEpics()
  return epics.find(epic => epic.epic_id === epicId)
}

/**
 * Get all slices for a specific epic
 * @param epicId - Epic ID to filter slices
 * @returns Promise resolving to list of slices for the epic
 */
export async function getSlices(epicId: string): Promise<Slice[]> {
  return callAPI<Slice[]>(`/api/epics/${encodeURIComponent(epicId)}/slices`)
}

/**
 * Get a single slice by ID
 * @param epicId - Epic ID containing the slice
 * @param sliceId - Slice ID to retrieve
 * @returns Promise resolving to slice or undefined if not found
 */
export async function getSlice(epicId: string, sliceId: string): Promise<Slice | undefined> {
  const slices = await getSlices(epicId)
  return slices.find(slice => slice.slice_id === sliceId)
}

/**
 * Get all tickets for a specific epic or slice
 * @param epicId - Epic ID to filter tickets
 * @param sliceId - Slice ID to filter tickets
 * @returns Promise resolving to list of tickets
 */
export async function getTickets(epicId: string, sliceId: string): Promise<Ticket[]> {
  return callAPI<Ticket[]>(`/api/epics/${encodeURIComponent(epicId)}/slices/${encodeURIComponent(sliceId)}/tickets`)
}

/**
 * Get a single ticket by composite key
 * @param epicId - Epic ID
 * @param sliceId - Slice ID
 * @param ticketId - Ticket ID
 * @returns Promise resolving to ticket or undefined if not found
 */
export async function getTicket(epicId: string, sliceId: string, ticketId: string): Promise<Ticket | undefined> {
  try {
    return await callAPI<Ticket>(`/api/epics/${encodeURIComponent(epicId)}/slices/${encodeURIComponent(sliceId)}/tickets/${encodeURIComponent(ticketId)}`)
  } catch (error) {
    // Return undefined for 404s
    if (error instanceof Error && error.message.includes('404')) {
      return undefined
    }
    throw error
  }
}

/**
 * Create a new ticket
 * @param epicId - Epic ID
 * @param sliceId - Slice ID
 * @param ticket - Ticket data (without id, which will be generated)
 * @returns Promise resolving to created ticket
 */
export async function createTicket(
  epicId: string,
  sliceId: string,
  ticket: Omit<Ticket, 'ticket_id' | 'epic_id' | 'slice_id' | 'created_at' | 'updated_at' | 'created_at_iso' | 'updated_at_iso'>
): Promise<Ticket> {
  return callAPI<Ticket>(`/api/epics/${encodeURIComponent(epicId)}/slices/${encodeURIComponent(sliceId)}/tickets`, {
    method: 'POST',
    body: JSON.stringify(ticket)
  })
}

/**
 * Update ticket status
 * @param epicId - Epic ID
 * @param sliceId - Slice ID
 * @param ticketId - Ticket ID
 * @param status - New status value
 * @returns Promise resolving to updated ticket
 */
export async function updateTicketStatus(
  epicId: string,
  sliceId: string,
  ticketId: string,
  status: string
): Promise<Ticket> {
  return callAPI<Ticket>(`/api/epics/${encodeURIComponent(epicId)}/slices/${encodeURIComponent(sliceId)}/tickets/${encodeURIComponent(ticketId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  })
}

/**
 * Delete a ticket
 * @param epicId - Epic ID
 * @param sliceId - Slice ID
 * @param ticketId - Ticket ID
 * @returns Promise resolving when deletion is complete
 */
export async function deleteTicket(epicId: string, sliceId: string, ticketId: string): Promise<void> {
  await callAPI<void>(`/api/epics/${encodeURIComponent(epicId)}/slices/${encodeURIComponent(sliceId)}/tickets/${encodeURIComponent(ticketId)}`, {
    method: 'DELETE'
  })
}

/**
 * Add a relationship to a ticket
 * @param epicId - Epic ID
 * @param sliceId - Slice ID
 * @param ticketId - Ticket ID
 * @param relationshipType - Type of relationship (blocks, blocked_by, caused_by)
 * @param targetTicketId - ID of the related ticket
 * @returns Promise resolving to updated ticket
 */
export async function addTicketRelationship(
  epicId: string,
  sliceId: string,
  ticketId: string,
  relationshipType: 'blocks' | 'blocked_by' | 'caused_by',
  targetTicketId: string
): Promise<Ticket> {
  return callAPI<Ticket>(`/api/epics/${encodeURIComponent(epicId)}/slices/${encodeURIComponent(sliceId)}/tickets/${encodeURIComponent(ticketId)}/relationships`, {
    method: 'POST',
    body: JSON.stringify({
      relationship_type: relationshipType,
      target_ticket_id: targetTicketId
    })
  })
}

/**
 * Remove a relationship from a ticket
 * @param epicId - Epic ID
 * @param sliceId - Slice ID
 * @param ticketId - Ticket ID
 * @param relationshipType - Type of relationship (blocks, blocked_by, caused_by)
 * @param targetTicketId - ID of the related ticket to remove
 * @returns Promise resolving to updated ticket
 */
export async function removeTicketRelationship(
  epicId: string,
  sliceId: string,
  ticketId: string,
  relationshipType: 'blocks' | 'blocked_by' | 'caused_by',
  targetTicketId: string
): Promise<Ticket> {
  return callAPI<Ticket>(`/api/epics/${encodeURIComponent(epicId)}/slices/${encodeURIComponent(sliceId)}/tickets/${encodeURIComponent(ticketId)}/relationships`, {
    method: 'DELETE',
    body: JSON.stringify({
      relationship_type: relationshipType,
      target_ticket_id: targetTicketId
    })
  })
}