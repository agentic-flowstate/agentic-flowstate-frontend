/**
 * Agent API - Re-exports all agent-related functions and types
 */

// Types
export type {
  AgentType,
  AgentRunStatus,
  EmailOutput,
  AgentRun,
  RunAgentRequest,
  RunAgentResponse,
  StreamEventType,
  TextEvent,
  ToolUseEvent,
  ToolResultEvent,
  ThinkingEvent,
  StatusEvent,
  ResultEvent,
  ReplayCompleteEvent,
  StreamEvent,
} from './types'

export {
  AGENT_API_BASE,
  getCurrentOrg,
  CURRENT_AGENT_TYPES,
  isValidAgentType,
  getAgentTypeInfo,
  getAgentTypeDisplayInfo,
  getStatusInfo,
} from './types'

// Agent runs
export {
  runAgent,
  getAgentRuns,
  getAgentRun,
  getActiveAgentRun,
} from './runs'

// Streaming
export {
  reconnectAgentStream,
  streamAgentRun,
  streamAgentRunStructured,
  sendMessageToAgent,
} from './stream'

// Drafts
export type {
  CreateDraftRequest,
  UpdateDraftRequest,
} from './drafts'

export {
  createDraft,
  listDrafts,
  getDraft,
  updateDraft,
  deleteDraft,
  sendDraft,
} from './drafts'

// Thread-ticket linking
export {
  getTicketsForThread,
  linkThreadToTicket,
  unlinkThreadFromTicket,
} from './threads'
