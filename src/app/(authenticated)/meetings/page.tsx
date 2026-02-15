'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Video,
  Plus,
  Clock,
  FileText,
  X,
  Copy,
  Check,
  Loader2,
  Sparkles,
  Mic,
  CheckCircle2,
  XCircle,
  Pencil,
  Star,
  Trash2,
} from 'lucide-react'
import { listMeetings, generateRoomId, endMeeting, deleteMeeting, updateMeeting, toggleMeetingFavorite, Meeting } from '@/lib/api/meetings'
import { getTranscriptSession } from '@/lib/api/transcripts'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function MeetingsPage() {
  return (
    <Suspense fallback={<MeetingsLoadingFallback />}>
      <MeetingsPageContent />
    </Suspense>
  )
}

function MeetingsLoadingFallback() {
  return (
    <div className="h-full flex bg-background items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-border border-t-muted-foreground rounded-full animate-spin mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">Loading meetings...</p>
      </div>
    </div>
  )
}

function MeetingsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [autoSelectHandled, setAutoSelectHandled] = useState(false)
  const [transcript, setTranscript] = useState<string | null>(null)
  const [loadingTranscript, setLoadingTranscript] = useState(false)
  const [copiedNotes, setCopiedNotes] = useState(false)
  const [copiedTranscript, setCopiedTranscript] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState('')
  const [activeTab, setActiveTab] = useState<string>('notes')

  // Check if a meeting is still processing
  function isProcessing(meeting: Meeting): boolean {
    return meeting.processing_status === 'transcribing' || meeting.processing_status === 'extracting_notes'
  }

  // Get processing status label
  function getProcessingLabel(meeting: Meeting): string {
    switch (meeting.processing_status) {
      case 'transcribing': return 'Transcribing audio...'
      case 'extracting_notes': return 'Extracting notes...'
      default: return ''
    }
  }

  useEffect(() => {
    loadMeetings()
  }, [])

  // Helper to update URL without full navigation
  function updateUrl(meetingId: string | null, tab: string | null) {
    const params = new URLSearchParams()
    if (meetingId) params.set('meeting', meetingId)
    if (tab) params.set('tab', tab)
    const query = params.toString()
    router.replace(query ? `/meetings?${query}` : '/meetings', { scroll: false })
  }

  // Auto-select meeting from URL params (handles both ?selected= after completion and ?meeting= for persistence)
  useEffect(() => {
    if (autoSelectHandled || loading || meetings.length === 0) return

    // Check for ?selected= (after completing a meeting) - takes priority
    const selectedRoomId = searchParams.get('selected')
    if (selectedRoomId) {
      const meeting = meetings.find(m => m.room_id === selectedRoomId)
      if (meeting && meeting.status === 'ended') {
        handleSelectMeeting(meeting, false) // Don't update URL yet
        // Replace with persistent URL format, defaulting to notes tab
        updateUrl(selectedRoomId, 'notes')
        setActiveTab('notes')
      }
      setAutoSelectHandled(true)
      return
    }

    // Check for ?meeting= (persistent state on refresh)
    const meetingId = searchParams.get('meeting')
    const tabParam = searchParams.get('tab')
    if (meetingId) {
      const meeting = meetings.find(m => m.room_id === meetingId)
      if (meeting && meeting.status === 'ended') {
        handleSelectMeeting(meeting, false) // Don't update URL, we're restoring from it
        if (tabParam === 'notes' || tabParam === 'transcript') {
          setActiveTab(tabParam)
        }
      }
    }
    setAutoSelectHandled(true)
  }, [meetings, loading, autoSelectHandled, searchParams, router])

  // Auto-refresh if any meetings are processing
  useEffect(() => {
    const hasProcessing = meetings.some(isProcessing)
    if (!hasProcessing) return

    const interval = setInterval(() => {
      loadMeetings()
    }, 5000) // Refresh every 5 seconds

    return () => clearInterval(interval)
  }, [meetings])

  // Sync selectedMeeting with updated data from meetings list
  useEffect(() => {
    if (!selectedMeeting) return

    const updated = meetings.find(m => m.room_id === selectedMeeting.room_id)
    if (!updated) return

    // Check if anything changed
    const statusChanged = updated.processing_status !== selectedMeeting.processing_status
    const notesChanged = updated.meeting_notes !== selectedMeeting.meeting_notes
    const transcriptIdChanged = updated.transcript_session_id !== selectedMeeting.transcript_session_id

    if (statusChanged || notesChanged || transcriptIdChanged) {
      setSelectedMeeting(updated)

      // Load transcript if it just became available
      if (transcriptIdChanged && updated.transcript_session_id && !transcript) {
        setLoadingTranscript(true)
        getTranscriptSession(updated.transcript_session_id)
          .then(data => {
            const text = data.entries.map((e) => e.text).join('\n\n')
            setTranscript(text || 'No transcript available')
          })
          .catch(err => {
            console.error('Failed to load transcript:', err)
            setTranscript('Failed to load transcript')
          })
          .finally(() => setLoadingTranscript(false))
      }
    }
  }, [meetings, selectedMeeting, transcript])

  async function loadMeetings() {
    try {
      const data = await listMeetings()
      setMeetings(data)
    } catch (error) {
      console.error('Failed to load meetings:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleFavorite(e: React.MouseEvent, meeting: Meeting) {
    e.stopPropagation()
    try {
      const result = await toggleMeetingFavorite(meeting.room_id)
      // Update local state
      setMeetings(prev => prev.map(m =>
        m.room_id === meeting.room_id
          ? { ...m, is_favorited: result.is_favorited }
          : m
      ))
      if (selectedMeeting?.room_id === meeting.room_id) {
        setSelectedMeeting(prev => prev ? { ...prev, is_favorited: result.is_favorited } : null)
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err)
    }
  }

  async function handleDeleteMeeting(e: React.MouseEvent, meeting: Meeting) {
    e.stopPropagation()
    if (!confirm(`Delete "${meeting.title || meeting.room_id}"? This cannot be undone.`)) return
    try {
      await deleteMeeting(meeting.room_id)
      if (selectedMeeting?.room_id === meeting.room_id) {
        handleCloseSidebar()
      }
      setMeetings(prev => prev.filter(m => m.room_id !== meeting.room_id))
    } catch (err) {
      console.error('Failed to delete meeting:', err)
    }
  }

  function handleCreateMeeting() {
    // Just navigate to room - meeting is created when user actually joins
    const roomId = generateRoomId()
    router.push(`/meetings/${roomId}`)
  }

  async function handleSelectMeeting(meeting: Meeting, updateUrlState = true) {
    if (meeting.status === 'active' || meeting.status === 'waiting') {
      router.push(`/meetings/${meeting.room_id}`)
      return
    }

    // Allow viewing ended meetings even if still processing
    if (meeting.status === 'ended') {
      setSelectedMeeting(meeting)
      // Default to notes tab when selecting a new meeting
      setActiveTab('notes')

      // Update URL for persistence (unless called from URL restoration)
      if (updateUrlState) {
        updateUrl(meeting.room_id, 'notes')
      }

      // Load transcript if available
      if (meeting.transcript_session_id) {
        setLoadingTranscript(true)
        try {
          const data = await getTranscriptSession(meeting.transcript_session_id)
          const text = data.entries.map((e) => e.text).join('\n\n')
          setTranscript(text || 'No transcript available')
        } catch (error) {
          console.error('Failed to load transcript:', error)
          setTranscript('Failed to load transcript')
        } finally {
          setLoadingTranscript(false)
        }
      } else {
        setTranscript(null)
      }
    }
  }

  function handleTabChange(tab: string) {
    setActiveTab(tab)
    if (selectedMeeting) {
      updateUrl(selectedMeeting.room_id, tab)
    }
  }

  function handleCloseSidebar() {
    setSelectedMeeting(null)
    setTranscript(null)
    setEditingTitle(false)
    updateUrl(null, null)
  }

  function formatDate(timestamp: number) {
    const date = new Date(timestamp * 1000)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return `Today at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    } else if (diffDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'long', hour: 'numeric', minute: '2-digit' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    }
  }

  const activeMeetings = meetings.filter((m) => m.status === 'active' || m.status === 'waiting')
  const pastMeetings = meetings.filter((m) => m.status === 'ended')

  return (
    <div className="h-full flex bg-background">
      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <Video className="h-5 w-5 text-muted-foreground" />
              </div>
              <h1 className="text-2xl font-semibold text-foreground">Meetings</h1>
            </div>
          </div>

          {/* Quick action */}
          <button
            onClick={handleCreateMeeting}
            className="w-full max-w-md p-6 rounded-2xl bg-card hover:bg-accent border border-border transition-all text-left mb-10"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Plus className="h-5 w-5 text-foreground" />
              </div>
              <span className="text-lg font-semibold text-foreground">
                New meeting
              </span>
            </div>
            <p className="text-muted-foreground text-sm">Start an instant video call</p>
          </button>

          {/* Active meetings */}
          {activeMeetings.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Active now
                </h2>
              </div>
              <div className="space-y-2">
                {activeMeetings.map((meeting) => (
                  <div
                    key={meeting.room_id}
                    className="w-full p-4 rounded-xl bg-green-500/10 border border-green-500/20 transition-colors text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">
                          {meeting.title || meeting.room_id}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Started {formatDate(meeting.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation()
                            try {
                              await endMeeting(meeting.room_id)
                              loadMeetings()
                            } catch (err) {
                              console.error('Failed to end meeting:', err)
                            }
                          }}
                          className="px-3 py-1.5 text-sm font-medium rounded-md bg-muted hover:bg-accent text-muted-foreground"
                        >
                          End
                        </button>
                        <button
                          onClick={() => router.push(`/meetings/${meeting.room_id}`)}
                          className="px-3 py-1.5 text-sm font-medium rounded-md bg-green-600 hover:bg-green-500 text-white"
                        >
                          Join
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Past meetings */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Recent meetings
              </h2>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-border border-t-muted-foreground rounded-full animate-spin mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Loading meetings...</p>
              </div>
            ) : pastMeetings.length === 0 ? (
              <div className="text-center py-12 rounded-xl bg-muted/50 border border-border">
                <Video className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">No past meetings</p>
                <p className="text-muted-foreground/70 text-sm mt-1">
                  Your meeting history will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {pastMeetings.map((meeting) => {
                  const processing = isProcessing(meeting)
                  return (
                  <button
                    key={meeting.room_id}
                    onClick={() => handleSelectMeeting(meeting)}
                    className={`w-full p-4 rounded-xl transition-colors text-left group ${
                      selectedMeeting?.room_id === meeting.room_id
                        ? 'bg-accent'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={(e) => handleToggleFavorite(e, meeting)}
                          className="shrink-0 p-1 -m-1 rounded hover:bg-accent transition-colors"
                        >
                          <Star
                            className={`h-4 w-4 transition-colors ${
                              meeting.is_favorited
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-muted-foreground/40 hover:text-muted-foreground'
                            }`}
                          />
                        </button>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {meeting.title || meeting.room_id}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{formatDate(meeting.created_at)}</span>
                            {processing ? (
                              <>
                                <span className="text-border">·</span>
                                <span className="flex items-center gap-1 text-amber-500 dark:text-amber-400">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  {getProcessingLabel(meeting)}
                                </span>
                              </>
                            ) : meeting.processing_status === 'completed' ? (
                              <>
                                <span className="text-border">·</span>
                                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Ready
                                </span>
                              </>
                            ) : meeting.processing_status === 'failed' ? (
                              <>
                                <span className="text-border">·</span>
                                <span className="flex items-center gap-1 text-red-500 dark:text-red-400">
                                  <XCircle className="h-3 w-3" />
                                  Failed
                                </span>
                              </>
                            ) : meeting.transcript_session_id ? (
                              <>
                                <span className="text-border">·</span>
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <FileText className="h-3 w-3" />
                                  Transcript
                                </span>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {processing && (
                          <Loader2 className="h-4 w-4 text-amber-500 dark:text-amber-400 animate-spin" />
                        )}
                        <button
                          onClick={(e) => handleDeleteMeeting(e, meeting)}
                          className="p-1.5 rounded-md text-muted-foreground/40 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      {selectedMeeting && (
        <div className="w-[480px] border-l border-border bg-card/50 flex flex-col min-h-0">
          {/* Header */}
          <div className="h-16 border-b border-border flex items-center justify-between px-5">
            <button
              onClick={(e) => handleToggleFavorite(e, selectedMeeting)}
              className="shrink-0 p-1.5 -ml-1 mr-2 rounded hover:bg-accent transition-colors"
            >
              <Star
                className={`h-5 w-5 transition-colors ${
                  selectedMeeting.is_favorited
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-muted-foreground/40 hover:text-muted-foreground'
                }`}
              />
            </button>
            <div className="min-w-0 flex-1 mr-2">
              {editingTitle ? (
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onBlur={async () => {
                    if (titleInput.trim() && titleInput !== selectedMeeting.title) {
                      try {
                        const updated = await updateMeeting(selectedMeeting.room_id, { title: titleInput.trim() })
                        setSelectedMeeting(updated)
                        loadMeetings()
                      } catch (err) {
                        console.error('Failed to update title:', err)
                      }
                    }
                    setEditingTitle(false)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur()
                    } else if (e.key === 'Escape') {
                      setEditingTitle(false)
                    }
                  }}
                  autoFocus
                  className="w-full font-semibold text-foreground bg-transparent border-b border-primary outline-none"
                  placeholder="Meeting title..."
                />
              ) : (
                <div
                  className="group flex items-center gap-2 cursor-pointer"
                  onClick={() => {
                    setTitleInput(selectedMeeting.title || '')
                    setEditingTitle(true)
                  }}
                >
                  <h2 className="font-semibold text-foreground truncate">
                    {selectedMeeting.title || selectedMeeting.room_id}
                  </h2>
                  <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
              <p className="text-xs text-muted-foreground">{formatDate(selectedMeeting.created_at)}</p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => handleDeleteMeeting(e, selectedMeeting)}
                className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCloseSidebar}
                className="text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Processing Pipeline Indicator */}
          {isProcessing(selectedMeeting) && (
            <div className="px-5 py-4 border-b border-border bg-muted/30">
              <div className="flex items-center justify-between gap-4">
                {/* Step 1: Transcribing */}
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    selectedMeeting.processing_status === 'transcribing'
                      ? 'bg-amber-500/20 text-amber-500'
                      : 'bg-green-500/20 text-green-500'
                  }`}>
                    {selectedMeeting.processing_status === 'transcribing' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </div>
                  <span className={`text-xs font-medium ${
                    selectedMeeting.processing_status === 'transcribing'
                      ? 'text-amber-500'
                      : 'text-green-500'
                  }`}>
                    Transcribe
                  </span>
                </div>

                {/* Connector */}
                <div className={`flex-1 h-0.5 ${
                  selectedMeeting.processing_status === 'extracting_notes'
                    ? 'bg-amber-500'
                    : 'bg-border'
                }`} />

                {/* Step 2: Extracting Notes */}
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    selectedMeeting.processing_status === 'extracting_notes'
                      ? 'bg-amber-500/20 text-amber-500'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {selectedMeeting.processing_status === 'extracting_notes' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </div>
                  <span className={`text-xs font-medium ${
                    selectedMeeting.processing_status === 'extracting_notes'
                      ? 'text-amber-500'
                      : 'text-muted-foreground'
                  }`}>
                    Extract Notes
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tabs - controlled component for URL persistence */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col min-h-0">
            <div className="px-5 pt-4 shrink-0">
              <TabsList className="w-full">
                <TabsTrigger value="notes" className="flex-1 gap-1.5">
                  {selectedMeeting.processing_status === 'extracting_notes' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Notes
                </TabsTrigger>
                <TabsTrigger value="transcript" className="flex-1 gap-1.5">
                  {selectedMeeting.processing_status === 'transcribing' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileText className="h-3.5 w-3.5" />
                  )}
                  Transcript
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Notes Tab */}
            <TabsContent value="notes" className="flex-1 flex flex-col mt-0 min-h-0 data-[state=inactive]:hidden">
              <div className="flex-1 overflow-y-auto p-5 min-h-0">
                {selectedMeeting.meeting_notes ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {selectedMeeting.meeting_notes}
                    </ReactMarkdown>
                  </div>
                ) : selectedMeeting.processing_status === 'extracting_notes' ? (
                  <div className="flex flex-col items-center justify-center h-32 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-amber-500 mb-3" />
                    <p className="text-muted-foreground text-sm">Extracting notes...</p>
                    <p className="text-muted-foreground/70 text-xs mt-1">Transcript is ready in the other tab</p>
                  </div>
                ) : selectedMeeting.processing_status === 'transcribing' ? (
                  <div className="flex flex-col items-center justify-center h-32 text-center">
                    <Mic className="h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground text-sm">Waiting for transcription...</p>
                  </div>
                ) : selectedMeeting.processing_status === 'failed' ? (
                  <div className="flex flex-col items-center justify-center h-32 text-center">
                    <XCircle className="h-8 w-8 text-red-500 mb-2" />
                    <p className="text-muted-foreground text-sm">Failed to extract notes</p>
                    <p className="text-muted-foreground/70 text-xs mt-1">Transcript is still available</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-center">
                    <Sparkles className="h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground text-sm">No notes available</p>
                  </div>
                )}
              </div>
              {selectedMeeting.meeting_notes && (
                <div className="p-4 border-t border-border shrink-0">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedMeeting.meeting_notes!)
                      setCopiedNotes(true)
                      setTimeout(() => setCopiedNotes(false), 2000)
                    }}
                  >
                    {copiedNotes ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy notes
                      </>
                    )}
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Transcript Tab */}
            <TabsContent value="transcript" className="flex-1 flex flex-col mt-0 min-h-0 data-[state=inactive]:hidden">
              <div className="flex-1 overflow-y-auto p-5 min-h-0">
                {selectedMeeting.processing_status === 'transcribing' ? (
                  <div className="flex flex-col items-center justify-center h-32 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-amber-500 mb-3" />
                    <p className="text-muted-foreground text-sm">Transcribing audio...</p>
                  </div>
                ) : loadingTranscript ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="w-6 h-6 border-2 border-border border-t-muted-foreground rounded-full animate-spin" />
                  </div>
                ) : transcript ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <p className="text-foreground/80 whitespace-pre-wrap leading-relaxed">
                      {transcript}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-center">
                    <FileText className="h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground text-sm">No transcript available</p>
                  </div>
                )}
              </div>
              {transcript && !loadingTranscript && (
                <div className="p-4 border-t border-border shrink-0">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      navigator.clipboard.writeText(transcript)
                      setCopiedTranscript(true)
                      setTimeout(() => setCopiedTranscript(false), 2000)
                    }}
                  >
                    {copiedTranscript ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy transcript
                      </>
                    )}
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}
