import type { Email, EmailAccount, EmailAttachment, EmailListResponse, EmailThread, Ticket } from '@/lib/types'

export async function fetchEmailAccounts(): Promise<EmailAccount[]> {
  const response = await fetch('/api/email-accounts', { credentials: 'include' })
  if (!response.ok) throw new Error(`Failed to fetch email accounts: ${response.statusText}`)
  return response.json()
}

export interface CreateEmailAccountParams {
  email: string
  password: string
  imap_host?: string
  imap_port?: number
  aws_profile?: string
  aws_region?: string
  display_name?: string
}

export async function createEmailAccount(params: CreateEmailAccountParams): Promise<EmailAccount> {
  const response = await fetch('/api/email-accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    credentials: 'include',
  })
  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText)
    throw new Error(text)
  }
  return response.json()
}

export async function deleteEmailAccount(email: string): Promise<void> {
  const response = await fetch(`/api/email-accounts/${encodeURIComponent(email)}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!response.ok && response.status !== 204) {
    throw new Error(`Failed to delete email account: ${response.statusText}`)
  }
}

export async function syncEmailAccount(email: string): Promise<{ status: string; message: string }> {
  const response = await fetch(`/api/email-accounts/${encodeURIComponent(email)}/sync`, {
    method: 'POST',
    credentials: 'include',
  })
  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText)
    throw new Error(text)
  }
  return response.json()
}

export async function fetchEmails(folder: 'INBOX' | 'Sent', limit = 100, mailbox?: string): Promise<EmailListResponse> {
  let url = `/api/emails?limit=${limit}&folder=${folder}`
  if (mailbox) url += `&mailbox=${mailbox}`
  const response = await fetch(url, { credentials: 'include' })
  if (!response.ok) throw new Error(`Failed to fetch emails: ${response.statusText}`)
  return response.json()
}

export async function patchEmail(emailId: string | number, updates: { is_read?: boolean; is_starred?: boolean }): Promise<void> {
  const response = await fetch(`/api/emails/${emailId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
    credentials: 'include',
  })
  if (!response.ok) throw new Error(`Failed to update email: ${response.statusText}`)
}

export interface SendEmailParams {
  from: string
  to: string[]
  cc?: string[]
  subject: string
  body_text: string
  body_html: string
  in_reply_to?: string
  thread_id?: string
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const response = await fetch(`/api/emails/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    credentials: 'include',
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to send email: ${text}`)
  }
}

export async function fetchThreads(mailbox?: string, limit = 50): Promise<{ threads: EmailThread[] }> {
  let url = `/api/emails/threads?limit=${limit}`
  if (mailbox && mailbox !== 'all') url += `&mailbox=${mailbox}`
  const response = await fetch(url, { credentials: 'include' })
  if (!response.ok) throw new Error(`Failed to fetch threads: ${response.statusText}`)
  return response.json()
}

export async function fetchThreadEmails(threadId: string): Promise<Email[]> {
  const response = await fetch(`/api/emails/threads/${encodeURIComponent(threadId)}`, { credentials: 'include' })
  if (!response.ok) throw new Error(`Failed to fetch thread emails: ${response.statusText}`)
  return response.json()
}

export async function searchEmails(q: string, mailbox?: string, limit = 50): Promise<EmailListResponse> {
  let url = `/api/emails/search?q=${encodeURIComponent(q)}&limit=${limit}`
  if (mailbox && mailbox !== 'all') url += `&mailbox=${mailbox}`
  const response = await fetch(url, { credentials: 'include' })
  if (!response.ok) throw new Error(`Failed to search emails: ${response.statusText}`)
  return response.json()
}

export async function fetchAttachments(emailId: number): Promise<EmailAttachment[]> {
  const response = await fetch(`/api/emails/${emailId}/attachments`, { credentials: 'include' })
  if (!response.ok) throw new Error(`Failed to fetch attachments: ${response.statusText}`)
  return response.json()
}

export async function fetchTicket(epicId: string, sliceId: string, ticketId: string): Promise<Ticket> {
  const response = await fetch(`/api/epics/${epicId}/slices/${sliceId}/tickets/${ticketId}`, { credentials: 'include' })
  if (!response.ok) throw new Error(`Failed to fetch ticket: ${response.statusText}`)
  return response.json()
}
