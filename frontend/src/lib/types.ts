export type EpicStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED"
export type SliceStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED"
export type TicketStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED"
export type TicketType = "task" | "bug" | "feature" | "chore"

export interface Epic {
  id: string
  title: string
  description: string
  status: EpicStatus
  organization: string
  createdAt: string
  updatedAt: string
}

export interface Slice {
  id: string
  epicId: string
  title: string
  description: string
  status: SliceStatus
  createdAt: string
  updatedAt: string
}

export interface Ticket {
  id: string
  sliceId: string
  title: string
  type: TicketType
  status: TicketStatus
  intent: string
  notes: string
  blocks: string[]
  blockedBy: string[]
  causedBy: string | null
  createdAt: string
  updatedAt: string
}

export interface Organization {
  id: string
  name: string
  displayName: string
}
