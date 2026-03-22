export interface DmConversation {
  id: string
  user_id_1: string
  user_id_2: string
  other_user_id: string
  other_user_name: string
  last_message: string | null
  unread_count: number
  created_at: number
  updated_at: number
}

export interface DmMessage {
  id: string
  dm_id: string
  sender_id: string
  content: string
  attachments?: DmAttachment[]
  created_at: number
}

export interface DmAttachment {
  id: string
  message_id: string
  filename: string
  content_type: string
  size_bytes: number
}

export interface DmContact {
  user_id: string
  name: string
}
