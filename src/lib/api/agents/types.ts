/**
 * Agent Types and Interfaces
 */

import type { OrganizationId } from "@/contexts/organization-context"
import { API_BASE } from '@/lib/api/config'

// Agent API calls go directly to Rust API server
// When accessed via HTTPS (Tailscale), use port 8443
// When accessed via HTTP (localhost), use port 8001
export function getAgentApiBase(): string {
  if (typeof window === 'undefined') return API_BASE

  const isSecure = window.location.protocol === 'https:'
  const host = window.location.hostname

  if (isSecure) {
    return `https://${host}:8443`
  }
  return `http://${host}:8001`
}

export const AGENT_API_BASE = typeof window !== 'undefined' ? getAgentApiBase() : API_BASE

// Get current organization from localStorage (client-side only)
export function getCurrentOrg(): OrganizationId | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem('selected-organization')
  return stored as OrganizationId | null
}

export type AgentType = 'vendor-research' | 'technical-research' | 'competitive-research' | 'planning' | 'execution' | 'evaluation' | 'email' | 'ticket-assistant'

/** All valid current agent types */
export const CURRENT_AGENT_TYPES: AgentType[] = ['vendor-research', 'technical-research', 'competitive-research', 'planning', 'execution', 'evaluation', 'email', 'ticket-assistant']

/** Check if a string is a valid current AgentType */
export function isValidAgentType(type: string): type is AgentType {
  return CURRENT_AGENT_TYPES.includes(type as AgentType)
}

export type AgentRunStatus = 'running' | 'completed' | 'failed' | 'cancelled'

/** Structured email output parsed from agent response */
export interface EmailOutput {
  to: string
  cc?: string
  subject: string
  body: string
  notes?: string
}

export interface AgentRun {
  session_id: string
  ticket_id: string
  epic_id: string
  slice_id: string
  /** Agent type as string to support legacy types in history */
  agent_type: string
  status: AgentRunStatus
  started_at: string
  completed_at?: string
  input_message: string
  output_summary?: string
  /** Structured email output (only for email agent type) */
  email_output?: EmailOutput
}

export interface RunAgentRequest {
  agent_type: AgentType
  previous_session_id?: string
  selected_session_ids?: string[]  // For email agent: inject context from these sessions
  custom_input_message?: string  // For ticket-assistant: user's question
  step_id?: string  // Explicit pipeline step ID for pipeline-aware streaming
}

export interface RunAgentResponse {
  session_id: string
  status: string
}

// Streaming event types
export type StreamEventType = 'text' | 'tool_use' | 'tool_result' | 'thinking' | 'status' | 'result'

export interface TextEvent {
  type: 'text'
  content: string
}

export interface ToolUseEvent {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ToolResultEvent {
  type: 'tool_result'
  tool_use_id: string
  content: string
  is_error: boolean
}

export interface ThinkingEvent {
  type: 'thinking'
  content: string
}

export interface StatusEvent {
  type: 'status'
  status: string
  message?: string
}

export interface ResultEvent {
  type: 'result'
  session_id: string
  status: string
  is_error: boolean
}

export interface ReplayCompleteEvent {
  type: 'replay_complete'
  total_events: number
  agent_status: string
}

export type StreamEvent = TextEvent | ToolUseEvent | ToolResultEvent | ThinkingEvent | StatusEvent | ResultEvent | ReplayCompleteEvent

/**
 * Get display info for an agent type
 */
export function getAgentTypeInfo(type: AgentType): {
  label: string
  description: string
  color: string
} {
  switch (type) {
    case 'vendor-research':
      return { label: 'Vendor Research', description: 'Research data providers and services', color: 'text-blue-500' }
    case 'technical-research':
      return { label: 'Technical Research', description: 'Research implementation approaches', color: 'text-purple-500' }
    case 'competitive-research':
      return { label: 'Competitive Research', description: 'Analyze competitors and alternatives', color: 'text-yellow-500' }
    case 'planning':
      return { label: 'Planning', description: 'Create implementation plan', color: 'text-orange-500' }
    case 'execution':
      return { label: 'Execution', description: 'Implement the changes', color: 'text-green-500' }
    case 'evaluation':
      return { label: 'Evaluation', description: 'Review and validate', color: 'text-red-500' }
    case 'email':
      return { label: 'Email', description: 'Generate email draft', color: 'text-cyan-500' }
    case 'ticket-assistant':
      return { label: 'Ticket Assistant', description: 'Answer questions and provide guidance', color: 'text-emerald-500' }
  }
}

/**
 * Get display info for any agent type string (including legacy types)
 */
export function getAgentTypeDisplayInfo(type: string): {
  label: string
  color: string
  isLegacy: boolean
} {
  if (CURRENT_AGENT_TYPES.includes(type as AgentType)) {
    const info = getAgentTypeInfo(type as AgentType)
    return { label: info.label, color: info.color, isLegacy: false }
  }

  // Legacy type - format nicely and mark as legacy
  const label = type
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return { label: `${label} (legacy)`, color: 'text-muted-foreground', isLegacy: true }
}

/**
 * Get status display info
 */
export function getStatusInfo(status: AgentRunStatus): {
  label: string
  color: string
} {
  switch (status) {
    case 'running':
      return { label: 'Running', color: 'text-blue-500' }
    case 'completed':
      return { label: 'Completed', color: 'text-green-500' }
    case 'failed':
      return { label: 'Failed', color: 'text-red-500' }
    case 'cancelled':
      return { label: 'Cancelled', color: 'text-gray-500' }
  }
}
