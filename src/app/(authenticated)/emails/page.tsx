"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Mail, RefreshCw, Inbox, PenSquare, SendHorizonal, FileText, MessageSquare, List, Search, X, Settings, Trash2, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { Email, EmailAccount, EmailDraft, EmailThread, Ticket as TicketType, EmailThreadTicket } from '@/lib/types'
import { listDrafts, updateDraft, deleteDraft, sendDraft, getTicketsForThread } from '@/lib/api/agents'
import { fetchEmails as apiFetchEmails, fetchEmailAccounts, patchEmail, sendEmail, fetchTicket, fetchThreads, fetchThreadEmails, searchEmails as apiSearchEmails, createEmailAccount, deleteEmailAccount, syncEmailAccount } from '@/lib/api/emails'
import { useLiveEmails } from '@/hooks/useLiveEmails'
import {
  EmailList,
  DraftList,
  EmailDetail,
  ComposeEmail,
  DraftEditor,
  ThreadView,
  TicketDetailSheet,
} from '@/components/email'

type Folder = 'INBOX' | 'Sent' | 'Drafts'

interface ComposeState {
  from: string
  to: string
  cc: string
  subject: string
  body: string
  in_reply_to?: string
  thread_id?: string
}

type ComposeMode = 'compose' | 'reply' | 'reply-all' | 'forward'

export default function EmailsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [selectedMailbox, setSelectedMailbox] = useState<string>(searchParams.get('mailbox') || 'all')
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
  const [currentFolder, setCurrentFolder] = useState<Folder>((searchParams.get('folder') as Folder) || 'INBOX')

  const verifiedAddresses = accounts.filter(a => a.is_active).map(a => a.email)
  const defaultFrom = verifiedAddresses[0] || ''

  const [composeMode, setComposeMode] = useState<ComposeMode>('compose')
  const [compose, setCompose] = useState<ComposeState>({
    from: '', to: '', cc: '', subject: '', body: ''
  })

  // Draft editing state
  const [editingDraft, setEditingDraft] = useState<EmailDraft | null>(null)
  const [draftEdits, setDraftEdits] = useState<ComposeState>({ from: '', to: '', cc: '', subject: '', body: '' })
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

  // Thread view state
  const [threads, setThreads] = useState<EmailThread[]>([])
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null)
  const [threadEmails, setThreadEmails] = useState<Email[]>([])
  const [loadingThreads, setLoadingThreads] = useState(false)
  const [viewMode, setViewMode] = useState<'emails' | 'threads'>((searchParams.get('view') as 'emails' | 'threads') || 'emails')

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Email[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Account settings state
  const [showSettings, setShowSettings] = useState(false)
  const [newAccountEmail, setNewAccountEmail] = useState('')
  const [newAccountPassword, setNewAccountPassword] = useState('')
  const [newAccountDisplayName, setNewAccountDisplayName] = useState('')
  const [addingAccount, setAddingAccount] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  const isSearchActive = searchQuery.trim().length > 0

  // Pending email/thread ID from URL to restore after data loads
  const pendingEmailId = useRef<number | null>(searchParams.get('email') ? Number(searchParams.get('email')) : null)
  const pendingThreadId = useRef<string | null>(searchParams.get('thread'))

  // Sync key state to URL params
  useEffect(() => {
    const params = new URLSearchParams()
    if (selectedMailbox) params.set('mailbox', selectedMailbox)
    if (currentFolder !== 'INBOX') params.set('folder', currentFolder)
    if (viewMode !== 'emails') params.set('view', viewMode)
    if (selectedEmail) params.set('email', String(selectedEmail.id))
    if (selectedThread) params.set('thread', selectedThread.thread_id)
    const qs = params.toString()
    const newUrl = qs ? `?${qs}` : window.location.pathname
    router.replace(newUrl, { scroll: false })
  }, [selectedMailbox, currentFolder, viewMode, selectedEmail, selectedThread, router])

  const emails = isSearchActive ? searchResults : (currentFolder === 'Drafts' ? [] : emailsByFolder[currentFolder as 'INBOX' | 'Sent'])
  const loading = loadingFolders[currentFolder]

  // Restore selected email from URL after data loads
  useEffect(() => {
    if (pendingEmailId.current && !selectedEmail) {
      const allEmails = [...emailsByFolder.INBOX, ...emailsByFolder.Sent]
      const found = allEmails.find(e => e.id === pendingEmailId.current)
      if (found) {
        pendingEmailId.current = null
        handleSelectEmail(found)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailsByFolder])

  // Restore selected thread from URL after threads load
  useEffect(() => {
    if (pendingThreadId.current && !selectedThread && threads.length > 0) {
      const found = threads.find(t => t.thread_id === pendingThreadId.current)
      if (found) {
        pendingThreadId.current = null
        handleSelectThread(found)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threads])

  const fetchEmails = useCallback(async (folder: 'INBOX' | 'Sent', mailbox?: string) => {
    setLoadingFolders(prev => ({ ...prev, [folder]: true }))
    try {
      const mbParam = mailbox && mailbox !== 'all' ? mailbox : undefined
      const data = await apiFetchEmails(folder, 100, mbParam)
      setEmailsByFolder(prev => ({ ...prev, [folder]: data.emails }))
      setStatsByFolder(prev => ({ ...prev, [folder]: { total: data.total, unread: data.unread } }))
    } catch (error) {
      console.error('Failed to fetch emails:', error)
    } finally {
      setLoadingFolders(prev => ({ ...prev, [folder]: false }))
    }
  }, [])

  // Live email updates via SSE
  const handleLiveEmailUpdate = useCallback((folder: 'INBOX' | 'Sent', emails: Email[], total: number, unread: number) => {
    setEmailsByFolder(prev => {
      const existing = prev[folder]
      // Avoid update if content hasn't changed (same length and same IDs)
      if (existing.length === emails.length && existing.every((e, i) => e.id === emails[i]?.id && e.is_read === emails[i]?.is_read && e.is_starred === emails[i]?.is_starred)) {
        return prev
      }
      return { ...prev, [folder]: emails }
    })
    setStatsByFolder(prev => ({ ...prev, [folder]: { total, unread } }))
  }, [])

  useLiveEmails({
    mailbox: selectedMailbox,
    onUpdate: handleLiveEmailUpdate,
    enabled: true,
  })

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

  const loadThreads = useCallback(async (mailbox?: string) => {
    setLoadingThreads(true)
    try {
      const mbParam = mailbox && mailbox !== 'all' ? mailbox : undefined
      const data = await fetchThreads(mbParam)
      setThreads(data.threads)
    } catch (error) {
      console.error('Failed to fetch threads:', error)
    } finally {
      setLoadingThreads(false)
    }
  }, [])

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)

    if (!query.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    searchTimerRef.current = setTimeout(async () => {
      try {
        const mbParam = selectedMailbox !== 'all' ? selectedMailbox : undefined
        const data = await apiSearchEmails(query, mbParam)
        setSearchResults(data.emails)
      } catch (error) {
        console.error('Search failed:', error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)
  }, [selectedMailbox])

  const clearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
    setIsSearching(false)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
  }

  const handleAddAccount = async () => {
    if (!newAccountEmail || !newAccountPassword) return
    setAddingAccount(true)
    try {
      const newAccount = await createEmailAccount({
        email: newAccountEmail,
        password: newAccountPassword,
        display_name: newAccountDisplayName || undefined,
      })
      const accts = await fetchEmailAccounts()
      setAccounts(accts)
      setNewAccountEmail('')
      setNewAccountPassword('')
      setNewAccountDisplayName('')
      setShowAddForm(false)

      // Force sync happens automatically on the backend after account creation.
      // The SSE subscription will push the new emails once the sync completes.
      // If user wants to manually check status, they can use the sync button.
    } catch (error) {
      console.error('Failed to add email account:', error)
      alert(error instanceof Error ? error.message : 'Failed to add account')
    } finally {
      setAddingAccount(false)
    }
  }

  const handleDeleteAccount = async (email: string) => {
    if (!confirm(`Remove account ${email}?`)) return
    try {
      await deleteEmailAccount(email)
      const accts = await fetchEmailAccounts()
      setAccounts(accts)
    } catch (error) {
      console.error('Failed to delete email account:', error)
    }
  }

  const handleSelectThread = async (thread: EmailThread) => {
    setSelectedThread(thread)
    setSelectedEmail(null)
    setShowCompose(false)
    setEditingDraft(null)
    try {
      const emails = await fetchThreadEmails(thread.thread_id)
      setThreadEmails(emails)
    } catch (error) {
      console.error('Failed to fetch thread emails:', error)
    }
  }

  const switchFolder = (folder: Folder) => {
    if (folder === currentFolder) return
    setCurrentFolder(folder)
    setSelectedEmail(null)
    setSelectedDraft(null)
    setEditingDraft(null)
    setSelectedThread(null)

    if (folder === 'Drafts') {
      if (drafts.length === 0 && !loadingFolders.Drafts) fetchDrafts()
    } else {
      if (emailsByFolder[folder].length === 0 && !loadingFolders[folder]) fetchEmails(folder, selectedMailbox)
    }
  }

  // Fetch accounts on mount, then fetch emails
  useEffect(() => {
    const init = async () => {
      try {
        const accts = await fetchEmailAccounts()
        setAccounts(accts)
        const firstActive = accts.find(a => a.is_active)
        // Use URL mailbox if present (including "all"), otherwise default to first active account
        const urlMailbox = searchParams.get('mailbox')
        const initialMailbox = urlMailbox !== null ? urlMailbox : (firstActive ? firstActive.email : 'all')
        setSelectedMailbox(initialMailbox)
        setCompose(prev => ({ ...prev, from: firstActive?.email || '' }))
        setDraftEdits(prev => ({ ...prev, from: firstActive?.email || '' }))

        // Fetch emails with the initial mailbox
        const mbParam = initialMailbox !== 'all' ? initialMailbox : undefined
        fetchEmails('INBOX', mbParam)
        fetchEmails('Sent', mbParam)

        // If URL says thread view, load threads too
        if (searchParams.get('view') === 'threads' || searchParams.get('thread')) {
          loadThreads(mbParam)
        }
      } catch (error) {
        console.error('Failed to fetch email accounts:', error)
        // Fallback: fetch emails without mailbox filter
        fetchEmails('INBOX')
        fetchEmails('Sent')
      }
      fetchDrafts()
    }
    init()
  }, [fetchEmails])

  // Refetch emails when selectedMailbox changes (after initial load)
  const handleMailboxChange = (value: string) => {
    setSelectedMailbox(value)
    setSelectedEmail(null)
    fetchEmails('INBOX', value)
    fetchEmails('Sent', value)
  }

  const markAsRead = async (email: Email) => {
    if (email.is_read) return
    try {
      await patchEmail(email.id, { is_read: true })
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
      await patchEmail(email.id, { is_starred: !email.is_starred })
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
      setTicketModalData(await fetchTicket(epicId, sliceId, ticketId))
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
      from: draft.from_address || defaultFrom,
      to: draft.to_address,
      cc: draft.cc_address || '',
      subject: draft.subject,
      body: draft.body
    })
    if (draft.ticket_id && draft.epic_id && draft.slice_id) {
      try {
        setLinkedTicket(await fetchTicket(draft.epic_id, draft.slice_id, draft.ticket_id))
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
      await sendEmail({
        from: compose.from || defaultFrom,
        to: compose.to.split(',').map(e => e.trim()).filter(Boolean),
        cc: compose.cc ? compose.cc.split(',').map(e => e.trim()).filter(Boolean) : [],
        subject: compose.subject,
        body_text: compose.body,
        body_html: `<pre style="font-family: sans-serif; white-space: pre-wrap;">${compose.body}</pre>`,
        in_reply_to: compose.in_reply_to,
        thread_id: compose.thread_id,
      })
      setShowCompose(false)
      setComposeMode('compose')
      setCompose({ from: defaultFrom, to: '', cc: '', subject: '', body: '' })
      fetchEmails('Sent', selectedMailbox)
    } catch (error) {
      console.error('Failed to send email:', error)
      alert(error instanceof Error ? error.message : 'Failed to send email')
    } finally {
      setSending(false)
    }
  }

  const buildQuotedBody = (email: Email): string => {
    const date = new Date(email.received_at_iso).toLocaleString()
    const from = email.from_name ? `${email.from_name} <${email.from_address}>` : email.from_address
    const header = `\n\nOn ${date}, ${from} wrote:\n`
    const body = email.body_text || ''
    const quoted = body.split('\n').map(line => `> ${line}`).join('\n')
    return header + quoted
  }

  const handleReply = (email: Email) => {
    const replyTo = email.from_address
    const subject = email.subject?.startsWith('Re: ') ? email.subject : `Re: ${email.subject || ''}`
    setCompose({
      from: defaultFrom,
      to: replyTo,
      cc: '',
      subject,
      body: buildQuotedBody(email),
      in_reply_to: email.message_id,
      thread_id: email.thread_id || email.message_id,
    })
    setComposeMode('reply')
    setShowCompose(true)
    setSelectedEmail(null)
  }

  const handleReplyAll = (email: Email) => {
    const replyTo = email.from_address
    const allTo = [replyTo, ...(email.to_addresses || [])].filter(
      (addr, i, arr) => addr !== defaultFrom && arr.indexOf(addr) === i
    )
    const cc = (email.cc_addresses || []).filter(addr => addr !== defaultFrom && !allTo.includes(addr))
    const subject = email.subject?.startsWith('Re: ') ? email.subject : `Re: ${email.subject || ''}`
    setCompose({
      from: defaultFrom,
      to: allTo.join(', '),
      cc: cc.join(', '),
      subject,
      body: buildQuotedBody(email),
      in_reply_to: email.message_id,
      thread_id: email.thread_id || email.message_id,
    })
    setComposeMode('reply-all')
    setShowCompose(true)
    setSelectedEmail(null)
  }

  const handleForward = (email: Email) => {
    const subject = email.subject?.startsWith('Fwd: ') ? email.subject : `Fwd: ${email.subject || ''}`
    const date = new Date(email.received_at_iso).toLocaleString()
    const from = email.from_name ? `${email.from_name} <${email.from_address}>` : email.from_address
    const to = (email.to_addresses || []).join(', ')
    const fwdHeader = `\n\n---------- Forwarded message ----------\nFrom: ${from}\nDate: ${date}\nSubject: ${email.subject || ''}\nTo: ${to}\n\n`
    const body = email.body_text || ''
    setCompose({
      from: defaultFrom,
      to: '',
      cc: '',
      subject,
      body: fwdHeader + body,
      in_reply_to: undefined,
      thread_id: undefined,
    })
    setComposeMode('forward')
    setShowCompose(true)
    setSelectedEmail(null)
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
      fetchEmails('Sent', selectedMailbox)
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
    setComposeMode('compose')
    setCompose({ from: defaultFrom, to: '', cc: '', subject: '', body: '' })
  }

  const handleRefresh = () => {
    if (currentFolder === 'Drafts') fetchDrafts()
    else {
      fetchEmails(currentFolder as 'INBOX' | 'Sent', selectedMailbox)
      if (viewMode === 'threads') loadThreads(selectedMailbox)
    }
  }

  const toggleViewMode = () => {
    const newMode = viewMode === 'emails' ? 'threads' : 'emails'
    setViewMode(newMode)
    setSelectedEmail(null)
    setSelectedThread(null)
    if (newMode === 'threads' && threads.length === 0) {
      loadThreads(selectedMailbox)
    }
  }

  const ThreadList = ({ threads, selectedThread, onSelectThread, loading }: {
    threads: EmailThread[]
    selectedThread: EmailThread | null
    onSelectThread: (thread: EmailThread) => void
    loading: boolean
  }) => {
    if (loading) {
      return <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">Loading threads...</div>
    }
    if (threads.length === 0) {
      return <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">No threads found</div>
    }
    return (
      <div>
        {threads.map((thread) => (
          <button
            key={thread.thread_id}
            onClick={() => onSelectThread(thread)}
            className={cn(
              "w-full text-left px-4 py-3 border-b hover:bg-muted/50 transition-colors",
              selectedThread?.thread_id === thread.thread_id && "bg-muted",
              thread.unread_count > 0 && "bg-primary/5"
            )}
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className={cn("text-sm truncate flex-1", thread.unread_count > 0 && "font-semibold")}>
                {thread.participants.slice(0, 2).join(', ')}
                {thread.participants.length > 2 && ` +${thread.participants.length - 2}`}
              </span>
              <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                {new Date(thread.latest_received_at_iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("text-sm truncate flex-1", thread.unread_count > 0 && "font-medium")}>
                {thread.subject || '(no subject)'}
              </span>
              {thread.message_count > 1 && (
                <span className="text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 flex-shrink-0">
                  {thread.message_count}
                </span>
              )}
              {thread.unread_count > 0 && (
                <span className="text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 flex-shrink-0">
                  {thread.unread_count}
                </span>
              )}
            </div>
            {thread.latest_snippet && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {thread.latest_snippet}
              </p>
            )}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Email List */}
      <div className={cn(
        "border-r flex flex-col bg-background transition-all duration-200",
        sidebarCollapsed ? "w-0 md:w-0 overflow-hidden border-r-0" : "w-full md:w-96",
        (selectedEmail || selectedThread || showCompose || editingDraft) && !sidebarCollapsed && "hidden md:flex",
        sidebarCollapsed && "hidden"
      )}>
        {showSettings ? (
          <>
            {/* Settings Header */}
            <div className="h-14 border-b flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Account Settings</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)} className="text-xs">
                <X className="h-3.5 w-3.5 mr-1" />
                Close
              </Button>
            </div>

            {/* Settings Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* Connected Accounts */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Connected Accounts</div>
                {accounts.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-center">
                    <Mail className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground">No accounts connected</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {accounts.map((account) => {
                      const isError = account.last_fetch_status === 'error'
                      const isOk = account.last_fetch_status === 'ok'
                      const isPending = !account.last_fetch_status || account.last_fetch_status === 'pending'
                      return (
                        <div key={account.id} className="rounded-lg border p-3 group">
                          <div className="flex items-start gap-2.5">
                            <div className={cn(
                              "w-2 h-2 rounded-full flex-shrink-0 mt-1.5",
                              isOk && "bg-emerald-500",
                              isError && "bg-red-500",
                              isPending && "bg-yellow-500"
                            )} />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">
                                {account.display_name || account.email}
                              </div>
                              {account.display_name && (
                                <div className="text-xs text-muted-foreground truncate">{account.email}</div>
                              )}
                              {isOk && account.last_fetch_at_iso && (
                                <div className="text-[11px] text-emerald-500 mt-1">
                                  Synced {new Date(account.last_fetch_at_iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                                </div>
                              )}
                              {isPending && (
                                <div className="text-[11px] text-yellow-500 mt-1">Waiting for first sync...</div>
                              )}
                              {isError && (
                                <div className="text-[11px] text-red-400 mt-1" title={account.last_fetch_error || ''}>
                                  Sync error: {account.last_fetch_error?.split(':')[0] || 'Unknown error'}
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive flex-shrink-0"
                              onClick={() => handleDeleteAccount(account.email)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Add Account */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Add Account</div>
                {showAddForm ? (
                  <div className="rounded-lg border p-3 space-y-2">
                    <Input
                      value={newAccountEmail}
                      onChange={(e) => setNewAccountEmail(e.target.value)}
                      placeholder="Email address"
                      className="h-8 text-sm"
                      autoFocus
                    />
                    <Input
                      type="password"
                      value={newAccountPassword}
                      onChange={(e) => setNewAccountPassword(e.target.value)}
                      placeholder="Password"
                      className="h-8 text-sm"
                    />
                    <Input
                      value={newAccountDisplayName}
                      onChange={(e) => setNewAccountDisplayName(e.target.value)}
                      placeholder="Display name (optional)"
                      className="h-8 text-sm"
                    />
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => { setShowAddForm(false); setNewAccountEmail(''); setNewAccountPassword(''); setNewAccountDisplayName('') }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={handleAddAccount}
                        disabled={addingAccount || !newAccountEmail || !newAccountPassword}
                      >
                        {addingAccount ? 'Adding...' : 'Add Account'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowAddForm(true)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add Email Account
                  </Button>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
        {/* Mailbox Selector */}
        {accounts.length > 0 && (
          <div className="px-4 pt-3 pb-1">
            <Select value={selectedMailbox} onValueChange={handleMailboxChange}>
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue placeholder="Select mailbox" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {accounts.filter(a => a.is_active).map((account) => (
                  <SelectItem key={account.id} value={account.email}>
                    {account.display_name ? `${account.display_name} (${account.email})` : account.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Header */}
        <div className="h-14 border-b flex items-center justify-between px-3">
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              onClick={() => switchFolder('INBOX')}
              className={cn(
                "flex items-center gap-1 py-1 text-sm transition-colors",
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
                "flex items-center gap-1 py-1 text-sm transition-colors",
                currentFolder === 'Sent' ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <SendHorizonal className="h-4 w-4" />
              <span>Sent</span>
            </button>
            <button
              onClick={() => switchFolder('Drafts')}
              className={cn(
                "flex items-center gap-1 py-1 text-sm transition-colors",
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
          <div className="flex items-center flex-shrink-0">
            {currentFolder !== 'Drafts' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleViewMode}
                title={viewMode === 'emails' ? 'Thread view' : 'Email view'}
              >
                {viewMode === 'emails' ? <MessageSquare className="h-4 w-4" /> : <List className="h-4 w-4" />}
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={openCompose} title="Compose">
              <PenSquare className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)} title="Account settings">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search bar */}
        {currentFolder !== 'Drafts' && (
          <div className="px-3 py-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search emails..."
                className="h-8 pl-8 pr-8 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Email/Draft/Thread list */}
        <div className="flex-1 overflow-y-auto">
          {currentFolder === 'Drafts' ? (
            <DraftList
              drafts={drafts}
              selectedDraft={selectedDraft}
              onSelectDraft={handleSelectDraft}
              loading={loadingFolders.Drafts}
            />
          ) : isSearchActive ? (
            <EmailList
              emails={emails}
              selectedEmail={selectedEmail}
              onSelectEmail={handleSelectEmail}
              onToggleStar={toggleStar}
              loading={isSearching}
              currentFolder={currentFolder as 'INBOX' | 'Sent'}
            />
          ) : viewMode === 'threads' ? (
            <ThreadList
              threads={threads}
              selectedThread={selectedThread}
              onSelectThread={handleSelectThread}
              loading={loadingThreads}
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
          </>
        )}
      </div>

      {/* Sidebar toggle on the divider */}
      <button
        className="hidden md:flex items-center justify-center w-4 hover:bg-muted/50 transition-colors cursor-pointer flex-shrink-0 border-r border-border"
        onClick={() => setSidebarCollapsed(prev => !prev)}
        title={sidebarCollapsed ? "Show email list" : "Hide email list"}
      >
        {sidebarCollapsed ? <ChevronRight className="h-3 w-3 text-muted-foreground" /> : <ChevronLeft className="h-3 w-3 text-muted-foreground" />}
      </button>

      {/* Email Detail / Thread View / Compose / Draft Edit */}
      <div className={cn(
        "flex-1 flex flex-col bg-background min-w-0",
        !selectedEmail && !selectedThread && !showCompose && !editingDraft && "hidden md:flex"
      )}>
        {showCompose ? (
          <ComposeEmail
            compose={compose}
            onChange={(updates) => setCompose(prev => ({ ...prev, ...updates }))}
            onSend={handleSendEmail}
            onClose={() => { setShowCompose(false); setComposeMode('compose') }}
            sending={sending}
            fromAddresses={verifiedAddresses}
            mode={composeMode}
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
            verifiedAddresses={verifiedAddresses}
          />
        ) : selectedThread ? (
          <ThreadView
            emails={threadEmails}
            onBack={() => setSelectedThread(null)}
            onToggleStar={toggleStar}
            onReply={handleReply}
            onReplyAll={handleReplyAll}
            onForward={handleForward}
          />
        ) : selectedEmail ? (
          <EmailDetail
            email={selectedEmail}
            onBack={() => setSelectedEmail(null)}
            onToggleStar={toggleStar}
            linkedTickets={emailLinkedTickets}
            loadingTickets={loadingEmailTickets}
            onOpenTicket={openTicketModal}
            onReply={handleReply}
            onReplyAll={handleReplyAll}
            onForward={handleForward}
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
