"use client"

import { useState, useEffect } from 'react'
import { Mail, RefreshCw, Inbox, PenSquare, SendHorizonal, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Email, EmailListResponse, EmailDraft, Ticket as TicketType, EmailThreadTicket } from '@/lib/types'
import { listDrafts, updateDraft, deleteDraft, sendDraft, getTicketsForThread } from '@/lib/api/agents'
import {
  EmailList,
  DraftList,
  EmailDetail,
  ComposeEmail,
  DraftEditor,
  TicketDetailSheet,
} from '@/components/email'

const VERIFIED_FROM_ADDRESSES = ['jakeGreene@ballotradar.com']
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

type Folder = 'INBOX' | 'Sent' | 'Drafts'

interface ComposeState {
  from: string
  to: string
  cc: string
  subject: string
  body: string
}

export default function EmailsPage() {
  const [emailsByFolder, setEmailsByFolder] = useState<Record<'INBOX' | 'Sent', Email[]>>({
    'INBOX': [],
    'Sent': []
  })
  const [drafts, setDrafts] = useState<EmailDraft[]>([])
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [selectedDraft, setSelectedDraft] = useState<EmailDraft | null>(null)
  const [loadingFolders, setLoadingFolders] = useState<Record<Folder, boolean>>({
    'INBOX': true, 'Sent': true, 'Drafts': true
  })
  const [statsByFolder, setStatsByFolder] = useState<Record<'INBOX' | 'Sent', { total: number; unread: number }>>({
    'INBOX': { total: 0, unread: 0 },
    'Sent': { total: 0, unread: 0 }
  })
  const [showCompose, setShowCompose] = useState(false)
  const [sending, setSending] = useState(false)
  const [currentFolder, setCurrentFolder] = useState<Folder>('INBOX')
  const [compose, setCompose] = useState<ComposeState>({
    from: VERIFIED_FROM_ADDRESSES[0], to: '', cc: '', subject: '', body: ''
  })

  // Draft editing state
  const [editingDraft, setEditingDraft] = useState<EmailDraft | null>(null)
  const [draftEdits, setDraftEdits] = useState<ComposeState>({ from: VERIFIED_FROM_ADDRESSES[0], to: '', cc: '', subject: '', body: '' })
  const [linkedTicket, setLinkedTicket] = useState<TicketType | null>(null)
  const [savingDraft, setSavingDraft] = useState(false)
  const [sendingDraft, setSendingDraft] = useState(false)
  const [deletingDraft, setDeletingDraft] = useState(false)

  // Ticket modal state
  const [ticketModalOpen, setTicketModalOpen] = useState(false)
  const [ticketModalData, setTicketModalData] = useState<TicketType | null>(null)
  const [ticketModalLoading, setTicketModalLoading] = useState(false)

  // Email linked tickets state
  const [emailLinkedTickets, setEmailLinkedTickets] = useState<EmailThreadTicket[]>([])
  const [loadingEmailTickets, setLoadingEmailTickets] = useState(false)

  const emails = currentFolder === 'Drafts' ? [] : emailsByFolder[currentFolder as 'INBOX' | 'Sent']
  const loading = loadingFolders[currentFolder]

  const fetchEmails = async (folder: 'INBOX' | 'Sent') => {
    setLoadingFolders(prev => ({ ...prev, [folder]: true }))
    try {
      const response = await fetch(`${API_BASE}/api/emails?limit=100&folder=${folder}`)
      if (response.ok) {
        const data: EmailListResponse = await response.json()
        setEmailsByFolder(prev => ({ ...prev, [folder]: data.emails }))
        setStatsByFolder(prev => ({ ...prev, [folder]: { total: data.total, unread: data.unread } }))
      }
    } catch (error) {
      console.error('Failed to fetch emails:', error)
    } finally {
      setLoadingFolders(prev => ({ ...prev, [folder]: false }))
    }
  }

  const fetchDrafts = async () => {
    setLoadingFolders(prev => ({ ...prev, Drafts: true }))
    try {
      const data = await listDrafts()
      setDrafts(data.drafts)
    } catch (error) {
      console.error('Failed to fetch drafts:', error)
    } finally {
      setLoadingFolders(prev => ({ ...prev, Drafts: false }))
    }
  }

  const switchFolder = (folder: Folder) => {
    if (folder === currentFolder) return
    setCurrentFolder(folder)
    setSelectedEmail(null)
    setSelectedDraft(null)
    setEditingDraft(null)

    if (folder === 'Drafts') {
      if (drafts.length === 0 && !loadingFolders.Drafts) fetchDrafts()
    } else {
      if (emailsByFolder[folder].length === 0 && !loadingFolders[folder]) fetchEmails(folder)
    }
  }

  useEffect(() => {
    fetchEmails('INBOX')
    fetchEmails('Sent')
    fetchDrafts()
  }, [])

  const markAsRead = async (email: Email) => {
    if (email.is_read) return
    try {
      await fetch(`${API_BASE}/api/emails/${email.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: true })
      })
      setEmailsByFolder(prev => ({
        ...prev,
        [currentFolder]: prev[currentFolder as 'INBOX' | 'Sent'].map(e =>
          e.id === email.id ? { ...e, is_read: true } : e
        )
      }))
      setStatsByFolder(prev => ({
        ...prev,
        [currentFolder]: { ...prev[currentFolder as 'INBOX' | 'Sent'], unread: Math.max(0, prev[currentFolder as 'INBOX' | 'Sent'].unread - 1) }
      }))
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const toggleStar = async (email: Email, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await fetch(`${API_BASE}/api/emails/${email.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_starred: !email.is_starred })
      })
      const folderKey = currentFolder as 'INBOX' | 'Sent'
      setEmailsByFolder(prev => ({
        ...prev,
        [folderKey]: prev[folderKey].map(e =>
          e.id === email.id ? { ...e, is_starred: !e.is_starred } : e
        )
      }))
      if (selectedEmail?.id === email.id) {
        setSelectedEmail({ ...email, is_starred: !email.is_starred })
      }
    } catch (error) {
      console.error('Failed to toggle star:', error)
    }
  }

  const handleSelectEmail = async (email: Email) => {
    setSelectedEmail(email)
    setSelectedDraft(null)
    setEditingDraft(null)
    setShowCompose(false)
    setEmailLinkedTickets([])
    markAsRead(email)

    if (email.thread_id) {
      setLoadingEmailTickets(true)
      try {
        const response = await getTicketsForThread(email.thread_id)
        setEmailLinkedTickets(response.tickets)
      } catch (error) {
        console.error('Failed to fetch linked tickets:', error)
      } finally {
        setLoadingEmailTickets(false)
      }
    }
  }

  const openTicketModal = async (ticketId: string, epicId?: string, sliceId?: string) => {
    if (!epicId || !sliceId) return
    setTicketModalLoading(true)
    setTicketModalOpen(true)
    try {
      const response = await fetch(`${API_BASE}/api/epics/${epicId}/slices/${sliceId}/tickets/${ticketId}`)
      if (response.ok) {
        setTicketModalData(await response.json())
      }
    } catch (error) {
      console.error('Failed to fetch ticket:', error)
    } finally {
      setTicketModalLoading(false)
    }
  }

  const handleSelectDraft = async (draft: EmailDraft) => {
    setSelectedDraft(draft)
    setSelectedEmail(null)
    setShowCompose(false)
    setLinkedTicket(null)
    setEditingDraft(draft)
    setDraftEdits({
      from: draft.from_address || VERIFIED_FROM_ADDRESSES[0],
      to: draft.to_address,
      cc: draft.cc_address || '',
      subject: draft.subject,
      body: draft.body
    })
    if (draft.ticket_id && draft.epic_id && draft.slice_id) {
      try {
        const response = await fetch(`${API_BASE}/api/epics/${draft.epic_id}/slices/${draft.slice_id}/tickets/${draft.ticket_id}`)
        if (response.ok) setLinkedTicket(await response.json())
      } catch (error) {
        console.error('Failed to fetch linked ticket:', error)
      }
    }
  }

  const handleSendEmail = async () => {
    if (!compose.to.trim() || !compose.subject.trim()) {
      alert('Please fill in To and Subject fields')
      return
    }
    setSending(true)
    try {
      const response = await fetch(`${API_BASE}/api/emails/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: compose.to.split(',').map(e => e.trim()).filter(Boolean),
          cc: compose.cc ? compose.cc.split(',').map(e => e.trim()).filter(Boolean) : [],
          subject: compose.subject,
          body_text: compose.body,
          body_html: `<pre style="font-family: sans-serif; white-space: pre-wrap;">${compose.body}</pre>`
        })
      })
      if (response.ok) {
        setShowCompose(false)
        setCompose({ from: VERIFIED_FROM_ADDRESSES[0], to: '', cc: '', subject: '', body: '' })
        fetchEmails('Sent')
      } else {
        alert(`Failed to send email: ${await response.text()}`)
      }
    } catch (error) {
      console.error('Failed to send email:', error)
      alert('Failed to send email')
    } finally {
      setSending(false)
    }
  }

  const handleSaveDraftEdits = async () => {
    if (!editingDraft) return
    setSavingDraft(true)
    try {
      const updated = await updateDraft(editingDraft.id, {
        from_address: draftEdits.from,
        to_address: draftEdits.to,
        cc_address: draftEdits.cc || undefined,
        subject: draftEdits.subject,
        body: draftEdits.body
      })
      setDrafts(prev => prev.map(d => d.id === updated.id ? updated : d))
      setSelectedDraft(updated)
      setEditingDraft(updated)
    } catch (error) {
      console.error('Failed to save draft:', error)
      alert('Failed to save draft')
    } finally {
      setSavingDraft(false)
    }
  }

  const handleSendDraft = async () => {
    if (!editingDraft) return
    if (!draftEdits.to.trim() || !draftEdits.subject.trim()) {
      alert('Please fill in To and Subject fields')
      return
    }
    setSendingDraft(true)
    try {
      await updateDraft(editingDraft.id, {
        from_address: draftEdits.from,
        to_address: draftEdits.to,
        cc_address: draftEdits.cc || undefined,
        subject: draftEdits.subject,
        body: draftEdits.body
      })
      await sendDraft(editingDraft.id)
      setDrafts(prev => prev.filter(d => d.id !== editingDraft.id))
      setSelectedDraft(null)
      setEditingDraft(null)
      setLinkedTicket(null)
      fetchEmails('Sent')
    } catch (error) {
      console.error('Failed to send draft:', error)
      alert('Failed to send draft')
    } finally {
      setSendingDraft(false)
    }
  }

  const handleDeleteDraft = async () => {
    if (!editingDraft) return
    if (!confirm('Delete this draft?')) return
    setDeletingDraft(true)
    try {
      await deleteDraft(editingDraft.id)
      setDrafts(prev => prev.filter(d => d.id !== editingDraft.id))
      setSelectedDraft(null)
      setEditingDraft(null)
      setLinkedTicket(null)
    } catch (error) {
      console.error('Failed to delete draft:', error)
      alert('Failed to delete draft')
    } finally {
      setDeletingDraft(false)
    }
  }

  const openCompose = () => {
    setShowCompose(true)
    setSelectedEmail(null)
    setSelectedDraft(null)
    setEditingDraft(null)
  }

  const handleRefresh = () => {
    if (currentFolder === 'Drafts') fetchDrafts()
    else fetchEmails(currentFolder as 'INBOX' | 'Sent')
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Email List */}
      <div className={cn(
        "w-full md:w-96 border-r flex flex-col bg-background",
        (selectedEmail || showCompose || editingDraft) && "hidden md:flex"
      )}>
        {/* Header */}
        <div className="h-14 border-b flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => switchFolder('INBOX')}
              className={cn(
                "flex items-center gap-1.5 py-1 text-sm transition-colors",
                currentFolder === 'INBOX' ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Inbox className="h-4 w-4" />
              <span>Inbox</span>
              {currentFolder === 'INBOX' && statsByFolder.INBOX.unread > 0 && (
                <span className="px-1.5 py-0.5 bg-primary text-primary-foreground rounded-full text-xs">
                  {statsByFolder.INBOX.unread}
                </span>
              )}
            </button>
            <button
              onClick={() => switchFolder('Sent')}
              className={cn(
                "flex items-center gap-1.5 py-1 text-sm transition-colors",
                currentFolder === 'Sent' ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <SendHorizonal className="h-4 w-4" />
              <span>Sent</span>
            </button>
            <button
              onClick={() => switchFolder('Drafts')}
              className={cn(
                "flex items-center gap-1.5 py-1 text-sm transition-colors",
                currentFolder === 'Drafts' ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <FileText className="h-4 w-4" />
              <span>Drafts</span>
              {drafts.length > 0 && (
                <span className="px-1.5 py-0.5 bg-muted text-muted-foreground rounded-full text-xs">
                  {drafts.length}
                </span>
              )}
            </button>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={openCompose} title="Compose">
              <PenSquare className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Email/Draft list */}
        <div className="flex-1 overflow-y-auto">
          {currentFolder === 'Drafts' ? (
            <DraftList
              drafts={drafts}
              selectedDraft={selectedDraft}
              onSelectDraft={handleSelectDraft}
              loading={loadingFolders.Drafts}
            />
          ) : (
            <EmailList
              emails={emails}
              selectedEmail={selectedEmail}
              onSelectEmail={handleSelectEmail}
              onToggleStar={toggleStar}
              loading={loading}
              currentFolder={currentFolder as 'INBOX' | 'Sent'}
            />
          )}
        </div>
      </div>

      {/* Email Detail / Compose / Draft Edit */}
      <div className={cn(
        "flex-1 flex flex-col bg-background",
        !selectedEmail && !showCompose && !editingDraft && "hidden md:flex"
      )}>
        {showCompose ? (
          <ComposeEmail
            compose={compose}
            onChange={(updates) => setCompose(prev => ({ ...prev, ...updates }))}
            onSend={handleSendEmail}
            onClose={() => setShowCompose(false)}
            sending={sending}
            fromAddress={VERIFIED_FROM_ADDRESSES[0]}
          />
        ) : editingDraft ? (
          <DraftEditor
            draft={editingDraft}
            edits={draftEdits}
            onChange={(updates) => setDraftEdits(prev => ({ ...prev, ...updates }))}
            onSave={handleSaveDraftEdits}
            onSend={handleSendDraft}
            onDelete={handleDeleteDraft}
            onClose={() => { setEditingDraft(null); setSelectedDraft(null); setLinkedTicket(null) }}
            linkedTicket={linkedTicket}
            onOpenTicket={openTicketModal}
            saving={savingDraft}
            sending={sendingDraft}
            deleting={deletingDraft}
            verifiedAddresses={VERIFIED_FROM_ADDRESSES}
          />
        ) : selectedEmail ? (
          <EmailDetail
            email={selectedEmail}
            onBack={() => setSelectedEmail(null)}
            onToggleStar={toggleStar}
            linkedTickets={emailLinkedTickets}
            loadingTickets={loadingEmailTickets}
            onOpenTicket={openTicketModal}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select an email to read</p>
              <Button variant="outline" className="mt-4" onClick={openCompose}>
                <PenSquare className="h-4 w-4 mr-2" />
                Compose New Email
              </Button>
            </div>
          </div>
        )}
      </div>

      <TicketDetailSheet
        open={ticketModalOpen}
        onOpenChange={setTicketModalOpen}
        ticket={ticketModalData}
        loading={ticketModalLoading}
      />
    </div>
  )
}
