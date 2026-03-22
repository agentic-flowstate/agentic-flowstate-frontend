import type { DmConversation, DmMessage, DmContact } from '@/lib/types/dms'

export async function listDms(): Promise<DmConversation[]> {
  const res = await fetch('/api/dms', { credentials: 'include' })
  if (!res.ok) throw new Error(`Failed to list DMs: ${res.status}`)
  const data = await res.json()
  return data.dms
}

export async function createDm(recipientId: string): Promise<DmConversation> {
  const res = await fetch('/api/dms', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient_id: recipientId }),
  })
  if (!res.ok) throw new Error(`Failed to create DM: ${res.status}`)
  return res.json()
}

export async function listMessages(
  dmId: string,
  limit = 50,
  before?: number
): Promise<DmMessage[]> {
  const params = new URLSearchParams({ limit: String(limit) })
  if (before) params.set('before', String(before))
  const res = await fetch(`/api/dms/${dmId}/messages?${params}`, {
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`Failed to list messages: ${res.status}`)
  const data = await res.json()
  return data.messages
}

export async function sendMessage(
  dmId: string,
  content: string,
  files?: File[]
): Promise<DmMessage> {
  if (files && files.length > 0) {
    // Multipart upload with files
    const formData = new FormData()
    formData.append('content', content)
    for (const file of files) {
      formData.append('files', file)
    }
    const res = await fetch(`/api/dms/${dmId}/messages`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })
    if (!res.ok) throw new Error(`Failed to send message: ${res.status}`)
    return res.json()
  }

  // Text-only: use JSON endpoint
  const res = await fetch(`/api/dms/${dmId}/messages/json`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
  if (!res.ok) throw new Error(`Failed to send message: ${res.status}`)
  return res.json()
}

export async function markRead(dmId: string): Promise<void> {
  await fetch(`/api/dms/${dmId}/read`, {
    method: 'POST',
    credentials: 'include',
  })
}

export async function listContacts(): Promise<DmContact[]> {
  const res = await fetch('/api/dms/contacts', { credentials: 'include' })
  if (!res.ok) throw new Error(`Failed to list contacts: ${res.status}`)
  const data = await res.json()
  return data.contacts
}

export function getAttachmentUrl(dmId: string, attachmentId: string): string {
  return `/api/dms/${dmId}/attachments/${attachmentId}`
}
