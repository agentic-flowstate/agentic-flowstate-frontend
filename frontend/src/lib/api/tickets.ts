/**
 * Data Access Layer for Ticketing System
 *
 * This module provides async functions to access ticketing data via MCP tools.
 * No mock data, no fallbacks - MCP tools are the sole data source.
 */

import { Epic, Slice, Ticket } from "@/lib/types"

/**
 * Call MCP tool and handle errors
 */
async function callMCPTool<T>(toolName: string, params: Record<string, string> = {}): Promise<T> {
  try {
    // @ts-ignore - MCP runtime injected at runtime
    if (typeof window !== 'undefined' && window.mcpClient) {
      // @ts-ignore
      const result = await window.mcpClient.callTool(toolName, params)
      return result as T
    }
    throw new Error('MCP client not available')
  } catch (error) {
    throw new Error(`MCP tool ${toolName} failed: ${error instanceof Error ? error.message : 'unknown error'}`)
  }
}

/**
 * Get all epics
 * Uses MCP tool: list_epics
 * @returns Promise resolving to list of all epics
 */
export async function getEpics(): Promise<Epic[]> {
  return callMCPTool<Epic[]>('mcp__agentic-mcp__list_epics')
}

/**
 * Get a single epic by ID
 * Note: MCP doesn't have a get_epic tool, so we list all and filter
 * @param epicId - Epic ID to retrieve
 * @returns Promise resolving to epic or undefined if not found
 */
export async function getEpic(epicId: string): Promise<Epic | undefined> {
  const epics = await getEpics()
  return epics.find(epic => epic.id === epicId)
}

/**
 * Get all slices for a specific epic
 * Uses MCP tool: list_slices
 * @param epicId - Epic ID to filter slices
 * @returns Promise resolving to list of slices for the epic
 */
export async function getSlices(epicId: string): Promise<Slice[]> {
  return callMCPTool<Slice[]>('mcp__agentic-mcp__list_slices', { epic_id: epicId })
}

/**
 * Get a single slice by ID
 * Note: MCP doesn't have a get_slice tool, so we need the epic_id to list and filter
 * This requires the caller to pass epicId as well
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
 * Uses MCP tool: list_tickets
 * @param epicId - Epic ID to filter tickets
 * @param sliceId - Optional slice ID to further filter tickets
 * @returns Promise resolving to list of tickets
 */
export async function getTickets(epicId: string, sliceId?: string): Promise<Ticket[]> {
  const params: Record<string, string> = { epic_id: epicId }
  if (sliceId) {
    params.slice_id = sliceId
  }
  return callMCPTool<Ticket[]>('mcp__agentic-mcp__list_tickets', params)
}

/**
 * Get a single ticket by composite key
 * Uses MCP tool: get_ticket
 * @param epicId - Epic ID
 * @param sliceId - Slice ID
 * @param ticketId - Ticket ID
 * @returns Promise resolving to ticket or undefined if not found
 */
export async function getTicket(epicId: string, sliceId: string, ticketId: string): Promise<Ticket | undefined> {
  try {
    return await callMCPTool<Ticket>('mcp__agentic-mcp__get_ticket', {
      epic_id: epicId,
      slice_id: sliceId,
      ticket_id: ticketId
    })
  } catch (error) {
    // get_ticket returns undefined if not found
    return undefined
  }
}

/**
 * Delete a ticket
 * Uses MCP tool: delete_ticket
 * @param epicId - Epic ID
 * @param sliceId - Slice ID
 * @param ticketId - Ticket ID
 * @returns Promise resolving when deletion is complete
 */
export async function deleteTicket(epicId: string, sliceId: string, ticketId: string): Promise<void> {
  await callMCPTool<void>('mcp__agentic-mcp__delete_ticket', {
    epic_id: epicId,
    slice_id: sliceId,
    ticket_id: ticketId
  })
}

/**
 * Delete a slice and all its tickets
 * Uses MCP tool: delete_slice
 * @param epicId - Epic ID
 * @param sliceId - Slice ID
 * @returns Promise resolving when deletion is complete
 */
export async function deleteSlice(epicId: string, sliceId: string): Promise<void> {
  await callMCPTool<void>('mcp__agentic-mcp__delete_slice', {
    epic_id: epicId,
    slice_id: sliceId
  })
}

/**
 * Delete an epic and all its slices and tickets
 * Uses MCP tool: delete_epic
 * @param epicId - Epic ID
 * @returns Promise resolving when deletion is complete
 */
export async function deleteEpic(epicId: string): Promise<void> {
  await callMCPTool<void>('mcp__agentic-mcp__delete_epic', {
    epic_id: epicId
  })
}
