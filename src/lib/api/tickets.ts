/**
 * Data Access Layer for Ticketing System
 *
 * This module provides async functions to access ticketing data via Next.js API routes.
 * API routes bridge to MCP tools server-side.
 * No mock data, no fallbacks - API routes are the sole data source.
 */

import { Epic, Slice, Ticket } from "@/lib/types"

/**
 * Call API route and handle errors
 */
async function callAPI<T>(path: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(path, options)
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    throw new Error(`API call failed: ${error instanceof Error ? error.message : 'unknown error'}`)
  }
}

/**
 * Get all epics
 * @returns Promise resolving to list of all epics
 */
export async function getEpics(): Promise<Epic[]> {
  return callAPI<Epic[]>('/api/epics')
}

/**
 * Get a single epic by ID
 * @param epicId - Epic ID to retrieve
 * @returns Promise resolving to epic or undefined if not found
 */
export async function getEpic(epicId: string): Promise<Epic | undefined> {
  const epics = await getEpics()
  return epics.find(epic => epic.id === epicId)
}

/**
 * Get all slices for a specific epic
 * @param epicId - Epic ID to filter slices
 * @returns Promise resolving to list of slices for the epic
 */
export async function getSlices(epicId: string): Promise<Slice[]> {
  return callAPI<Slice[]>(`/api/epics/${epicId}/slices`)
}

/**
 * Get a single slice by ID
 * @param epicId - Epic ID containing the slice
 * @param sliceId - Slice ID to retrieve
 * @returns Promise resolving to slice or undefined if not found
 */
export async function getSlice(epicId: string, sliceId: string): Promise<Slice | undefined> {
  const slices = await getSlices(epicId)
  return slices.find(slice => slice.id === sliceId)
}

/**
 * Get all tickets for a specific epic or slice
 * @param epicId - Epic ID to filter tickets
 * @param sliceId - Slice ID to filter tickets
 * @returns Promise resolving to list of tickets
 */
export async function getTickets(epicId: string, sliceId: string): Promise<Ticket[]> {
  return callAPI<Ticket[]>(`/api/epics/${epicId}/slices/${sliceId}/tickets`)
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
    return await callAPI<Ticket>(`/api/epics/${epicId}/slices/${sliceId}/tickets/${ticketId}`)
  } catch (error) {
    return undefined
  }
}

/**
 * Delete a ticket
 * @param epicId - Epic ID
 * @param sliceId - Slice ID
 * @param ticketId - Ticket ID
 * @returns Promise resolving when deletion is complete
 */
export async function deleteTicket(epicId: string, sliceId: string, ticketId: string): Promise<void> {
  await callAPI<void>(`/api/epics/${epicId}/slices/${sliceId}/tickets/${ticketId}`, {
    method: 'DELETE'
  })
}
