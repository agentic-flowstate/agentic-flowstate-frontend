export type TicketStatus = "open" | "in_progress" | "completed" | "blocked" | "closed" | "pending-enrichment"
export type TicketType = "task" | "milestone"

export interface Epic {
  epic_id: string
  title: string
  organization: string
  notes?: string
  assignees?: string[]
  created_at_iso: string
  updated_at_iso: string
  slice_count?: number
  ticket_count?: number
}

export interface Slice {
  slice_id: string
  epic_id: string
  title: string
  notes?: string
  assignees?: string[]
  created_at_iso: string
  updated_at_iso: string
  ticket_count?: number
}

export interface Ticket {
  ticket_id: string
  epic_id: string
  slice_id: string
  title: string
  description?: string
  /** Agent-generated actionable guidance for this ticket */
  guidance?: string
  /** Type of ticket: task or milestone */
  ticket_type?: TicketType
  status: TicketStatus
  assignee?: string
  agent?: string
  pipeline?: Pipeline
  repository?: string
  artifact_path?: string
  blocks?: string[]
  blocked_by?: string[]
  caused_by?: string[]
  /** For tasks: the milestone this task belongs to */
  milestone_id?: string | null
  /** File path references for agent context */
  documentation?: string[]
  /** For milestones: position on the roadmap trunk (0 = top). null/undefined = branch */
  roadmap_position?: number | null
  created_at: number
  updated_at: number
  created_at_iso: string
  updated_at_iso: string
}

export interface Repository {
  name: string
  organization: string
  github_org: string
  description?: string
  repo_type: string
  default_branch: string
  local_path?: string
  created_at_iso: string
  updated_at_iso: string
}

export interface Organization {
  id: string
  name: string
  displayName: string
}

export interface Email {
  id: number
  message_id: string
  mailbox: string
  folder: string
  from_address: string
  from_name?: string
  to_addresses: string[]
  cc_addresses?: string[]
  subject?: string
  body_text?: string
  body_html?: string
  received_at: number
  is_read: boolean
  is_starred: boolean
  thread_id?: string
  in_reply_to?: string
  labels?: string[]
  received_at_iso: string
  created_at_iso: string
}

export interface EmailListResponse {
  emails: Email[]
  total: number
  unread: number
}

export interface TranscriptSession {
  session_id: string
  guild_id: string
  channel_name?: string
  started_at: string
  ended_at?: string
  is_active: boolean
  participant_count: number
  created_at_iso: string
}

export interface TranscriptEntry {
  id: number
  session_id: string
  user_id: string
  username: string
  text: string
  timestamp: string
  created_at: number
}

export interface TranscriptSessionsResponse {
  sessions: TranscriptSession[]
}

export interface TranscriptEntriesResponse {
  entries: TranscriptEntry[]
  session: TranscriptSession
}

export interface EmailDraft {
  id: number
  session_id?: string
  ticket_id?: string
  epic_id?: string
  slice_id?: string
  from_address: string
  to_address: string
  cc_address?: string
  subject: string
  body: string
  notes?: string
  status: 'draft' | 'sent' | 'discarded'
  created_at_iso: string
  updated_at_iso: string
}

export interface DraftListResponse {
  drafts: EmailDraft[]
  total: number
}

export interface EmailThreadTicket {
  id: number
  thread_id: string
  ticket_id: string
  epic_id?: string
  slice_id?: string
  created_at_iso: string
}

export interface ThreadTicketsResponse {
  thread_id: string
  tickets: EmailThreadTicket[]
}

// Pipeline Types (matches backend models.rs)
export type PipelineStepStatus = "queued" | "running" | "awaiting_approval" | "completed" | "failed" | "skipped"
export type ExecutionType = "auto" | "manual"

export interface PipelineStep {
  step_id: string
  agent_type: string
  execution_type: ExecutionType
  status: PipelineStepStatus
  inputs?: Record<string, unknown>
  outputs?: Record<string, unknown>
  agent_run_id?: string
  started_at?: string
  completed_at?: string
  name?: string
}

export interface Pipeline {
  origin_template_id?: string
  customized?: boolean
  steps: PipelineStep[]
  status?: string
  current_step_index?: number
}

// Alias for backward compatibility
export type TicketPipeline = Pipeline

export interface PipelineStepDetail {
  step: PipelineStep
  agent_run?: {
    run_id: string
    status: string
    outputs?: Record<string, unknown>
    tool_calls?: Array<{
      tool_name: string
      arguments: Record<string, unknown>
      result?: unknown
    }>
    error?: string
  }
}

// Graph types for React Flow
export interface GraphTicket extends Ticket {
  // pipeline already inherited from Ticket
}

export interface CrossSliceDependency {
  ticket_id: string
  slice_id: string
  slice_title?: string
}
