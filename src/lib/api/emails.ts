import type { Email, EmailListResponse, Ticket } from '@/lib/types'

export async function fetchEmails(folder: 'INBOX' | 'Sent', limit = 100): Promise<EmailListResponse> {
  const response = await fetch(`/api/emails?limit=${limit}&folder=${folder}`, { credentials: 'include' })
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
  to: string[]
  cc?: string[]
  subject: string
  body_text: string
  body_html: string
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

export async function fetchTicket(epicId: string, sliceId: string, ticketId: string): Promise<Ticket> {
  const response = await fetch(`/api/epics/${epicId}/slices/${sliceId}/tickets/${ticketId}`, { credentials: 'include' })
  if (!response.ok) throw new Error(`Failed to fetch ticket: ${response.statusText}`)
  return response.json()
}
