"use client"

import { useState, useEffect, useRef, useMemo } from 'react'
import { Send, Plus, MessageCircle, ArrowLeft, Paperclip, X, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth-context'
import { useDm } from '@/contexts/dm-context'
import { cn } from '@/lib/utils'
import { AttachmentDisplay, formatTime, formatFileSize } from '@/lib/dm-utils'
import type { DmConversation, DmMessage, DmContact } from '@/lib/types/dms'
import * as dmApi from '@/lib/api/dms'

export default function DmsPage() {
  const { user } = useAuth()
  const { dms, setDms } = useDm()
  const [selectedDm, setSelectedDm] = useState<DmConversation | null>(null)
  const [messages, setMessages] = useState<DmMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [messageInput, setMessageInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showNewDm, setShowNewDm] = useState(false)
  const [contacts, setContacts] = useState<DmContact[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [stagedFiles, setStagedFiles] = useState<File[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Stable blob URLs for staged file previews (revoked on change/unmount)
  const stagedFileUrls = useMemo(() => {
    return stagedFiles.map(f => f.type.startsWith('image/') ? URL.createObjectURL(f) : null)
  }, [stagedFiles])

  useEffect(() => {
    return () => {
      for (const url of stagedFileUrls) {
        if (url) URL.revokeObjectURL(url)
      }
    }
  }, [stagedFileUrls])

  // Load messages when DM is selected
  useEffect(() => {
    if (!selectedDm) {
      setMessages([])
      return
    }

    setLoadingMessages(true)
    dmApi.listMessages(selectedDm.id)
      .then(msgs => {
        setMessages(msgs.reverse())
        setLoadingMessages(false)
        dmApi.markRead(selectedDm.id).catch(console.error)
      })
      .catch(err => {
        console.error('Failed to load messages:', err)
        setLoadingMessages(false)
      })
  }, [selectedDm])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Poll for new messages in active conversation
  useEffect(() => {
    if (!selectedDm) return

    const interval = setInterval(async () => {
      try {
        const msgs = await dmApi.listMessages(selectedDm.id)
        setMessages(prev => {
          if (msgs.length !== prev.length) {
            return msgs.reverse()
          }
          return prev
        })
      } catch {
        // ignore
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [selectedDm])

  // Focus input when DM selected
  useEffect(() => {
    if (selectedDm) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [selectedDm])

  const handleSend = async () => {
    if (!selectedDm || sending) return
    if (!messageInput.trim() && stagedFiles.length === 0) return

    const content = messageInput.trim()
    const files = stagedFiles.length > 0 ? [...stagedFiles] : undefined
    setMessageInput('')
    setStagedFiles([])
    setSending(true)

    try {
      const msg = await dmApi.sendMessage(selectedDm.id, content, files)
      setMessages(prev => [...prev, msg])
    } catch (err) {
      console.error('Failed to send message:', err)
      toast.error('Failed to send message')
      setMessageInput(content)
      if (files) setStagedFiles(files)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      setStagedFiles(prev => [...prev, ...Array.from(files)])
    }
    // Reset so same file can be re-selected
    e.target.value = ''
  }

  const removeStagedFile = (index: number) => {
    setStagedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleNewDm = async () => {
    setShowNewDm(true)
    setLoadingContacts(true)
    try {
      const c = await dmApi.listContacts()
      setContacts(c)
    } catch (err) {
      console.error('Failed to load contacts:', err)
    } finally {
      setLoadingContacts(false)
    }
  }

  const handleSelectContact = async (contact: DmContact) => {
    setShowNewDm(false)
    try {
      const dm = await dmApi.createDm(contact.user_id)
      setDms(prev => {
        if (prev.find(d => d.id === dm.id)) return prev
        return [dm, ...prev]
      })
      setSelectedDm(dm)
    } catch (err) {
      console.error('Failed to create DM:', err)
    }
  }

  return (
    <div className="flex h-full">
      {/* Left panel: DM list */}
      <div className={cn(
        "w-80 border-r border-border flex flex-col bg-background shrink-0",
        selectedDm && "hidden md:flex"
      )}>
        {/* Header */}
        <div className="h-12 border-b border-border flex items-center justify-between px-4">
          <span className="text-sm font-medium">Messages</span>
          <button
            onClick={handleNewDm}
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* New DM contact picker */}
        {showNewDm && (
          <div className="border-b border-border">
            <div className="px-4 py-2 text-xs text-muted-foreground font-medium">
              {loadingContacts ? 'Loading contacts...' : 'Select a person'}
            </div>
            {contacts.map(contact => (
              <button
                key={contact.user_id}
                onClick={() => handleSelectContact(contact)}
                className="w-full px-4 py-2.5 text-left hover:bg-accent/50 transition-colors flex items-center gap-3"
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                  {contact.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-medium">{contact.name}</div>
                  <div className="text-xs text-muted-foreground">{contact.user_id}</div>
                </div>
              </button>
            ))}
            <button
              onClick={() => setShowNewDm(false)}
              className="w-full px-4 py-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        )}

        {/* DM list */}
        <div className="flex-1 overflow-y-auto">
          {dms.length === 0 && !showNewDm && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
              No conversations yet
            </div>
          )}
          {dms.map(dm => (
            <button
              key={dm.id}
              onClick={() => {
                setSelectedDm(dm)
                setShowNewDm(false)
              }}
              className={cn(
                "w-full px-4 py-3 text-left hover:bg-accent/50 transition-colors flex items-center gap-3 border-b border-border/50",
                selectedDm?.id === dm.id && "bg-accent"
              )}
            >
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary shrink-0">
                {dm.other_user_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">{dm.other_user_name}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {formatTime(dm.updated_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground truncate">
                    {dm.last_message || 'No messages yet'}
                  </span>
                  {dm.unread_count > 0 && (
                    <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium flex items-center justify-center shrink-0">
                      {dm.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right panel: Message thread */}
      <div className={cn(
        "flex-1 flex flex-col",
        !selectedDm && "hidden md:flex"
      )}>
        {!selectedDm ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Select a conversation or start a new one</p>
            </div>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="h-12 border-b border-border flex items-center gap-3 px-4">
              <button
                onClick={() => setSelectedDm(null)}
                className="md:hidden p-1 rounded-md hover:bg-accent"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                {selectedDm.other_user_name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium">{selectedDm.other_user_name}</span>
            </div>

            {/* Messages */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
            >
              {loadingMessages && (
                <div className="text-center text-xs text-muted-foreground py-4">Loading messages...</div>
              )}
              {!loadingMessages && messages.length === 0 && (
                <div className="text-center text-xs text-muted-foreground py-8">
                  No messages yet. Say hello!
                </div>
              )}
              {messages.map(msg => {
                const isMe = msg.sender_id === user?.user_id
                return (
                  <div
                    key={msg.id}
                    className={cn("flex", isMe ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[70%] rounded-2xl px-3.5 py-2",
                        isMe
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted rounded-bl-md"
                      )}
                    >
                      {msg.content && (
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      )}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="space-y-1">
                          {msg.attachments.map(att => (
                            <AttachmentDisplay
                              key={att.id}
                              attachment={att}
                              dmId={msg.dm_id}
                              isMe={isMe}
                            />
                          ))}
                        </div>
                      )}
                      <p className={cn(
                        "text-[10px] mt-1",
                        isMe ? "text-primary-foreground/60" : "text-muted-foreground"
                      )}>
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Compose bar */}
            <div className="border-t border-border p-3">
              {/* Staged files preview */}
              {stagedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {stagedFiles.map((file, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-accent text-xs"
                    >
                      {stagedFileUrls[i] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={stagedFileUrls[i]!}
                          alt={file.name}
                          className="h-6 w-6 rounded object-cover"
                        />
                      ) : (
                        <FileText className="h-3.5 w-3.5" />
                      )}
                      <span className="max-w-[120px] truncate">{file.name}</span>
                      <button
                        onClick={() => removeStagedFile(i)}
                        className="p-0.5 rounded hover:bg-background/50"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx,.txt,.csv,.json,.zip,.tar.gz"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <textarea
                  ref={inputRef}
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  rows={1}
                  className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring max-h-32"
                  style={{ minHeight: '40px' }}
                />
                <button
                  onClick={handleSend}
                  disabled={(!messageInput.trim() && stagedFiles.length === 0) || sending}
                  className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
