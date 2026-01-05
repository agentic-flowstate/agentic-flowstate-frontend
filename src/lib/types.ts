export type TicketStatus = "open" | "in_progress" | "completed" | "blocked" | "closed"
export type TicketType = "task" | "bug" | "feature" | "chore"
export type TicketPriority = "low" | "medium" | "high" | "critical"

export interface Epic {
  epic_id: string
  title: string
  notes?: string
  created_at_iso: string
  updated_at_iso: string
}

export interface Slice {
  slice_id: string
  epic_id: string
  title: string
  notes?: string
  created_at_iso: string
  updated_at_iso: string
}

export interface Ticket {
  ticket_id: string
  epic_id: string
  slice_id: string
  title: string
  intent: string
  description?: string
  type: TicketType
  status: TicketStatus
  priority?: TicketPriority
  assignee?: string
  notes?: string
  blocks_tickets?: string[]
  blocked_by_tickets?: string[]
  caused_by_tickets?: string[]
  created_at: number
  updated_at: number
  created_at_iso: string
  updated_at_iso: string
}

export interface Organization {
  id: string
  name: string
  displayName: string
}
