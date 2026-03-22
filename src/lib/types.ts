export type TicketStatus = "open" | "in_progress" | "done" | "blocked"
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
  repository?: string
  artifact_path?: string
  blocks?: string[]
  blocked_by?: string[]
  caused_by?: string[]
  /** For tasks: the milestone this task belongs to */
  milestone_id?: string | null
  /** Artifact IDs for attached documentation */
  documentation?: string[]
  /** For milestones: position on the roadmap trunk (0 = top). null/undefined = branch */
  roadmap_position?: number | null
  created_at: number
  updated_at: number
  created_at_iso: string
  updated_at_iso: string
}

export interface ArtifactDocSummary {
  artifact_id: string
  title: string
  artifact_type: string
}

export interface ArtifactSummary {
  artifact_id: string
  title: string
  artifact_type: string
  created_by: string
  source_step_id?: string
  organization: string
  epic_id?: string
  slice_id?: string
  ticket_id?: string
  agent_run_id?: string
  content_length: number
  created_at: number
  updated_at: number
  created_at_iso: string
  updated_at_iso: string
}

export interface Artifact extends Omit<ArtifactSummary, 'content_length'> {
  content: string
}

export interface DocumentSummary {
  document_id: string
  filename: string
  mime_type: string
  size_bytes: number
  description?: string
  document_type: string
  organization: string
  epic_id?: string
  slice_id?: string
  ticket_id?: string
  created_by: string
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

export interface EmailAttachment {
  id: number
  email_id: number
  filename: string
  content_type: string
  size_bytes: number
  stored_path?: string
}

export interface EmailListResponse {
  emails: Email[]
  total: number
  unread: number
}

export interface EmailAccount {
  id: number
  user_id: string
  email: string
  imap_host: string
  imap_port: number
  aws_profile?: string
  aws_region: string
  display_name?: string
  is_active: boolean
  last_fetch_at_iso?: string
  last_fetch_status?: string
  last_fetch_error?: string
  created_at_iso: string
  updated_at_iso: string
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

export interface EmailThread {
  thread_id: string
  subject?: string
  participants: string[]
  message_count: number
  unread_count: number
  latest_received_at: number
  latest_received_at_iso: string
  latest_snippet?: string
}

export interface SystemLog {
  id: number
  level: string
  component: string
  message: string
  detail?: string
  user_id?: string
  session_id?: string
  created_at: number
  created_at_iso: string
}

// Graph types for React Flow
export interface GraphTicket extends Ticket {}

export interface CrossSliceDependency {
  ticket_id: string
  slice_id: string
  slice_title?: string
}
