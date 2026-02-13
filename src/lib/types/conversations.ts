import type { MessageBlock } from '@/hooks/useAgentStream'

// API response types
export interface ApiConversation {
  id: string
  session_id: string | null
  organization: string
  title: string
  started_at: string
  updated_at: string
  message_count?: number
  messages?: ApiMessage[]
}

export interface ApiMessage {
  id: string
  conversation_id: string
  role: string
  content: string
  tool_uses?: Array<{
    id: string
    name: string
    input?: Record<string, unknown>
    result?: string
    is_error?: boolean
  }>
  created_at: number
  message_index: number
}

export interface StoredConversation {
  id: string
  sessionId: string | null
  organization: string
  title: string
  startedAt: string
  messageCount: number
  blocks: MessageBlock[]
}

// Convert API conversation to local format
export function apiToLocal(api: ApiConversation): StoredConversation {
  const blocks: MessageBlock[] = []
  for (const m of api.messages || []) {
    if (m.role === 'user') {
      blocks.push({ type: 'user', content: m.content })
    } else if (m.role === 'assistant') {
      if (m.content) {
        blocks.push({ type: 'text', content: m.content })
      }
      if (m.tool_uses && m.tool_uses.length > 0) {
        blocks.push({
          type: 'tool_calls',
          toolCalls: m.tool_uses.map(t => ({
            id: t.id,
            name: t.name,
            input: t.input || {},
            result: t.result,
            isError: t.is_error,
            isExpanded: false,
            status: 'completed' as const
          })),
          toolsCollapsed: true
        })
      }
    }
  }
  return {
    id: api.id,
    sessionId: api.session_id,
    organization: api.organization,
    title: api.title,
    startedAt: api.started_at,
    messageCount: api.message_count ?? blocks.length,
    blocks,
  }
}
