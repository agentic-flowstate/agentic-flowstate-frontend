"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { MessageCircle, X, ArrowLeft, Send, Plus, Paperclip, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useDm } from '@/contexts/dm-context'
import { cn } from '@/lib/utils'
import { AttachmentDisplay, formatTime, formatFileSize } from '@/lib/dm-utils'
import type { DmConversation, DmMessage, DmContact } from '@/lib/types/dms'
import * as dmApi from '@/lib/api/dms'

export function DmChatWidget() {
  const { user } = useAuth()
  const pathname = usePathname()
  const {
    dms, setDms,
    chatWidgetOpen, chatWidgetDmId,
    openChatWidget, closeChatWidget,
  } = useDm()

  const [selectedDm, setSelectedDm] = useState<DmConversation | null>(null)
  const [messages, setMessages] = useState<DmMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [messageInput, setMessageInput] = useState('')
  const [sending, setSending] = useState(false)
  const [stagedFiles, setStagedFiles] = useState<File[]>([])
  const [showNewDm, setShowNewDm] = useState(false)
  const [contacts, setContacts] = useState<DmContact[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Stable blob URLs for staged file previews
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

  // When chatWidgetDmId changes from context (e.g. toast click), select that DM
  useEffect(() => {
    if (chatWidgetDmId) {
      const dm = dms.find(d => d.id === chatWidgetDmId)
      if (dm) setSelectedDm(dm)
    }
  }, [chatWidgetDmId, dms])

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

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Poll for new messages
  useEffect(() => {
    if (!selectedDm || !chatWidgetOpen) return

    const interval = setInterval(async () => {
      try {
        const msgs = await dmApi.listMessages(selectedDm.id)
        setMessages(prev => {
          if (msgs.length !== prev.length) return msgs.reverse()
          return prev
        })
      } catch {
        // ignore
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [selectedDm, chatWidgetOpen])

  // Focus input when DM selected
  useEffect(() => {
    if (selectedDm && chatWidgetOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [selectedDm, chatWidgetOpen])

  // Reset state when widget closes
  useEffect(() => {
    if (!chatWidgetOpen) {
      setSelectedDm(null)
      setMessages([])
      setMessageInput('')
      setStagedFiles([])
      setShowNewDm(false)
    }
  }, [chatWidgetOpen])

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
    if (files) setStagedFiles(prev => [...prev, ...Array.from(files)])
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

  const handleBack = useCallback(() => {
    setSelectedDm(null)
    setMessages([])
    setMessageInput('')
    setStagedFiles([])
  }, [])

  // Hide on /dms page (full page takes over)
  if (pathname === '/dms') return null
  if (!user) return null

  return (
    <>
      {/* Chat panel - anchored below header */}
      {chatWidgetOpen && (
        <div className="fixed top-14 right-4 z-40 w-[360px] h-[min(480px,calc(100vh-4.5rem))] bg-background border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
          {/* Panel header */}
          <div className="h-11 border-b border-border flex items-center justify-between px-3 shrink-0 bg-background">
            {selectedDm ? (
              <>
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    onClick={handleBack}
                    className="p-1 rounded-md hover:bg-accent shrink-0"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary shrink-0">
                    {selectedDm.other_user_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium truncate">{selectedDm.other_user_name}</span>
                </div>
                <button onClick={closeChatWidget} className="p-1 rounded-md hover:bg-accent shrink-0">
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <span className="text-xs font-medium">Messages</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleNewDm}
                    className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <button onClick={closeChatWidget} className="p-1 rounded-md hover:bg-accent">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Content */}
          {!selectedDm ? (
            // Conversation list view
            <div className="flex-1 overflow-y-auto">
              {/* New DM contact picker */}
              {showNewDm && (
                <div className="border-b border-border">
                  <div className="px-3 py-1.5 text-[10px] text-muted-foreground font-medium">
                    {loadingContacts ? 'Loading...' : 'Select a person'}
                  </div>
                  {contacts.map(contact => (
                    <button
                      key={contact.user_id}
                      onClick={() => handleSelectContact(contact)}
                      className="w-full px-3 py-2 text-left hover:bg-accent/50 transition-colors flex items-center gap-2.5"
                    >
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary">
                        {contact.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-medium">{contact.name}</div>
                        <div className="text-[10px] text-muted-foreground">{contact.user_id}</div>
                      </div>
                    </button>
                  ))}
                  <button
                    onClick={() => setShowNewDm(false)}
                    className="w-full px-3 py-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {dms.length === 0 && !showNewDm && (
                <div className="px-3 py-8 text-center text-xs text-muted-foreground">
                  <MessageCircle className="h-6 w-6 mx-auto mb-2 opacity-30" />
                  No conversations yet
                </div>
              )}
              {dms.map(dm => (
                <button
                  key={dm.id}
                  onClick={() => setSelectedDm(dm)}
                  className="w-full px-3 py-2.5 text-left hover:bg-accent/50 transition-colors flex items-center gap-2.5 border-b border-border/50"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                    {dm.other_user_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-medium truncate">{dm.other_user_name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatTime(dm.updated_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] text-muted-foreground truncate">
                        {dm.last_message || 'No messages yet'}
                      </span>
                      {dm.unread_count > 0 && (
                        <span className="h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-medium flex items-center justify-center shrink-0">
                          {dm.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            // Chat view
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
                {loadingMessages && (
                  <div className="text-center text-[10px] text-muted-foreground py-4">Loading...</div>
                )}
                {!loadingMessages && messages.length === 0 && (
                  <div className="text-center text-[10px] text-muted-foreground py-6">
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
                          "max-w-[80%] rounded-2xl px-3 py-1.5",
                          isMe
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted rounded-bl-md"
                        )}
                      >
                        {msg.content && (
                          <p className="text-xs whitespace-pre-wrap break-words">{msg.content}</p>
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
                          "text-[9px] mt-0.5",
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
              <div className="border-t border-border p-2 shrink-0">
                {/* Staged files preview */}
                {stagedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {stagedFiles.map((file, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent text-[10px]"
                      >
                        {stagedFileUrls[i] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={stagedFileUrls[i]!}
                            alt={file.name}
                            className="h-5 w-5 rounded object-cover"
                          />
                        ) : (
                          <FileText className="h-3 w-3" />
                        )}
                        <span className="max-w-[80px] truncate">{file.name}</span>
                        <button
                          onClick={() => removeStagedFile(i)}
                          className="p-0.5 rounded hover:bg-background/50"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-end gap-1.5">
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
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                  </button>
                  <textarea
                    ref={inputRef}
                    value={messageInput}
                    onChange={e => setMessageInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    rows={1}
                    className="flex-1 resize-none rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring max-h-20"
                    style={{ minHeight: '32px' }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={(!messageInput.trim() && stagedFiles.length === 0) || sending}
                    className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
