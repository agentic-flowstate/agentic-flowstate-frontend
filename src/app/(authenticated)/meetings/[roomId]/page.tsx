'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Mic,
  Video,
  ArrowLeft,
  AlertTriangle,
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { endMeeting, finalizeMeetingTranscript, getApiBaseUrl } from '@/lib/api/meetings'
import { useMediaDevices } from '@/hooks/useMediaDevices'
import { useLobbyPreview } from '@/hooks/useLobbyPreview'
import { useWebRTCPeers } from '@/hooks/useWebRTCPeers'
import { useMediaRecorder } from '@/hooks/useMediaRecorder'
import { MeetingLobby } from '@/components/meetings/MeetingLobby'
import { MeetingActive } from '@/components/meetings/MeetingActive'

function generateUserId(): string {
  return `user-${Math.random().toString(36).substr(2, 9)}`
}

type MeetingState = 'lobby' | 'joining' | 'joined' | 'ending' | 'ended' | 'upload_failed'

export default function MeetingRoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.roomId as string
  const { user: currentUser, devicePreferences, setDevicePreferences } = useAuth()

  const [userId] = useState(() => generateUserId())
  const [meetingState, setMeetingState] = useState<MeetingState>('lobby')
  const [error, setError] = useState<string | null>(null)
  const [isMuted, setIsMuted] = useState(devicePreferences.isMuted)
  const [isVideoOff, setIsVideoOff] = useState(devicePreferences.isVideoOff)
  const [copied, setCopied] = useState(false)

  // Hooks
  const devices = useMediaDevices(devicePreferences)
  const lobby = useLobbyPreview({
    selectedAudioDevice: devices.selectedAudioDevice,
    selectedVideoDevice: devices.selectedVideoDevice,
    isMuted,
    isVideoOff,
    active: meetingState === 'lobby',
  })
  const peers = useWebRTCPeers(roomId, userId, (msg) => setError(msg))
  const recorder = useMediaRecorder()

  // Surface hook errors
  useEffect(() => {
    if (devices.error) setError(devices.error)
  }, [devices.error])

  useEffect(() => {
    if (lobby.error) setError(lobby.error)
  }, [lobby.error])

  // Warn user before leaving if actively transcribing
  useEffect(() => {
    if (meetingState !== 'joined') return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!recorder.isRecording) return

      e.preventDefault()
      e.returnValue = 'You have an active transcription. Audio may not be saved if you leave.'

      // Try to send in-progress audio via beacon
      const blob = recorder.getRecordedBlob()
      const speakerName = currentUser?.name
      if (blob && blob.size > 0 && speakerName) {
        const formData = new FormData()
        formData.append('audio', blob, 'recording.webm')
        formData.append('speaker_name', speakerName)
        formData.append('start_timestamp_ms', String(recorder.recordingStartTime))
        formData.append('format', 'webm')
        navigator.sendBeacon(`${getApiBaseUrl()}/api/meetings/${roomId}/audio`, formData)
      }

      return e.returnValue
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [meetingState, roomId, currentUser?.name, recorder])

  // --- Actions ---

  async function joinMeeting() {
    if (!lobby.localStream) {
      setError('No media stream available')
      return
    }

    setMeetingState('joining')

    try {
      await peers.joinMeeting(lobby.localStream)
      setMeetingState('joined')
    } catch (err) {
      console.error('Failed to join meeting:', err)
      setError(err instanceof Error ? err.message : 'Failed to join meeting')
      setMeetingState('lobby')
    }
  }

  async function leaveMeeting() {
    const isLastParticipant = peers.participants.length <= 1
    setMeetingState('ending')

    // If actively transcribing, send stop signal and stop recording
    if (recorder.isRecording) {
      peers.signalingRef.current?.sendTranscriptionStopped(roomId, userId)
      const audioBlob = await recorder.stopRecording()
      if (audioBlob && audioBlob.size > 0) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        recorder.downloadAudioBlob(audioBlob, `meeting-${roomId}-final-${timestamp}.webm`)
      }
    }

    peers.cleanupConnections()
    lobby.streamRef.current?.getTracks().forEach((track) => track.stop())

    const hasRecordedSegments = recorder.hasSegments()
    let uploadSucceeded = false
    const speakerName = currentUser?.name

    if (hasRecordedSegments && speakerName) {
      try {
        await recorder.uploadAllSegments(roomId, speakerName)
        uploadSucceeded = true
      } catch (err) {
        setError(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}. Segment backups were saved to Downloads.`)
        setMeetingState('upload_failed')
        return
      }
    } else {
      uploadSucceeded = true
    }

    if (isLastParticipant) {
      try {
        await endMeeting(roomId)
        console.log('Meeting ended')
        if (hasRecordedSegments && uploadSucceeded) {
          finalizeMeetingTranscript(roomId).catch(err => {
            console.error('Transcript finalization failed:', err)
          })
        }
      } catch (err) {
        console.error('Failed to end meeting:', err)
      }
    }

    router.push(`/meetings?selected=${roomId}`)
  }

  function toggleMute() {
    if (lobby.localStream) {
      const newMuted = !isMuted
      lobby.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !newMuted
      })
      setIsMuted(newMuted)
      setDevicePreferences({ isMuted: newMuted })
    }
  }

  function toggleVideo() {
    if (lobby.localStream) {
      const newVideoOff = !isVideoOff
      lobby.localStream.getVideoTracks().forEach((track) => {
        track.enabled = !newVideoOff
      })
      setIsVideoOff(newVideoOff)
      setDevicePreferences({ isVideoOff: newVideoOff })
    }
  }

  function copyRoomLink() {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDeviceChange = (type: 'audio' | 'video', value: string) => {
    if (type === 'audio') {
      devices.setSelectedAudioDevice(value)
      setDevicePreferences({ audioDeviceId: value })
    } else {
      devices.setSelectedVideoDevice(value)
      setDevicePreferences({ videoDeviceId: value })
    }
  }

  // Track whether WE initiated transcription (vs receiving a remote signal)
  const isLocalTranscriberRef = useRef(false)

  const toggleTranscribe = useCallback(() => {
    if (!lobby.localStream) return

    if (peers.transcriptionActive) {
      // Stop transcription for everyone
      peers.signalingRef.current?.sendTranscriptionStopped(roomId, userId)
      // Stop our own recording
      recorder.stopRecording().then((blob) => {
        if (blob && blob.size > 0) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
          recorder.downloadAudioBlob(blob, `meeting-${roomId}-segment-${timestamp}.webm`)
        }
      })
      isLocalTranscriberRef.current = false
    } else {
      // Start transcription for everyone
      peers.signalingRef.current?.sendTranscriptionStarted(roomId, userId)
      recorder.startRecording(lobby.localStream)
      isLocalTranscriberRef.current = true
    }
  }, [lobby.localStream, peers.transcriptionActive, peers.signalingRef, roomId, userId, recorder])

  // React to remote transcription signals: auto-start/stop local recording
  const prevTranscriptionActiveRef = useRef(false)
  useEffect(() => {
    if (meetingState !== 'joined') return

    const wasActive = prevTranscriptionActiveRef.current
    const isActive = peers.transcriptionActive
    prevTranscriptionActiveRef.current = isActive

    if (isActive && !wasActive && !recorder.isRecording && lobby.localStream) {
      // Someone else started transcription — start our recording
      recorder.startRecording(lobby.localStream)
    } else if (!isActive && wasActive && recorder.isRecording) {
      // Transcription stopped remotely — stop our recording
      recorder.stopRecording().then((blob) => {
        if (blob && blob.size > 0) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
          recorder.downloadAudioBlob(blob, `meeting-${roomId}-segment-${timestamp}.webm`)
        }
      })
    }
  }, [peers.transcriptionActive, meetingState, recorder, lobby.localStream, roomId])

  // --- Render ---

  if (meetingState === 'lobby') {
    return (
      <MeetingLobby
        roomId={roomId}
        userName={currentUser?.name}
        audioDevices={devices.audioDevices}
        videoDevices={devices.videoDevices}
        selectedAudioDevice={devices.selectedAudioDevice}
        selectedVideoDevice={devices.selectedVideoDevice}
        onAudioDeviceChange={(v) => handleDeviceChange('audio', v)}
        onVideoDeviceChange={(v) => handleDeviceChange('video', v)}
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        audioLevel={lobby.audioLevel}
        localStream={lobby.localStream}
        lobbyVideoRef={lobby.lobbyVideoRef}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onJoin={joinMeeting}
        onBack={() => router.push('/meetings')}
        error={error}
      />
    )
  }

  if (meetingState === 'joining') {
    return (
      <div className="absolute inset-0 bg-background flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Video className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-28 h-28 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground mb-2">Joining meeting...</h1>
            <p className="text-muted-foreground font-mono text-sm">{roomId}</p>
          </div>
        </div>
      </div>
    )
  }

  if (meetingState === 'ending') {
    return (
      <div className="absolute inset-0 bg-background flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Mic className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-28 h-28 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground mb-2">
              {recorder.hasSegments() ? 'Uploading transcript...' : 'Leaving meeting...'}
            </h1>
            {recorder.hasSegments() && (
              <p className="text-muted-foreground text-sm">Please wait while we upload your recording</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (meetingState === 'upload_failed') {
    return (
      <div className="absolute inset-0 bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground mb-2">Upload Failed</h1>
            <p className="text-muted-foreground text-sm mb-4">
              {error || 'Failed to upload recording to server.'}
            </p>
            <p className="text-green-600 dark:text-green-400 text-sm font-medium">
              Your recording was automatically saved to your Downloads folder.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button
              variant="outline"
              onClick={() => router.push('/meetings')}
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Meetings (I have my backup)
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Active meeting
  return (
    <MeetingActive
      roomId={roomId}
      userId={userId}
      participants={peers.participants}
      speakingUsers={peers.speakingUsers}
      screenSharers={peers.screenSharers}
      isScreenSharing={peers.screenSharers.includes(userId)}
      screenStreamRef={peers.screenStreamRef}
      isTranscribing={peers.transcriptionActive}
      onToggleTranscribe={toggleTranscribe}
      onToggleScreenShare={() => {
        if (peers.screenSharers.includes(userId)) {
          peers.stopScreenShare()
        } else {
          peers.startScreenShare()
        }
      }}
      isMuted={isMuted}
      isVideoOff={isVideoOff}
      isRecording={recorder.isRecording}
      copied={copied}
      localStream={lobby.localStream}
      bindRemoteVideo={peers.bindRemoteVideo}
      audioDevices={devices.audioDevices}
      videoDevices={devices.videoDevices}
      selectedAudioDevice={devices.selectedAudioDevice}
      selectedVideoDevice={devices.selectedVideoDevice}
      onAudioDeviceChange={(v) => handleDeviceChange('audio', v)}
      onVideoDeviceChange={(v) => handleDeviceChange('video', v)}
      onToggleMute={toggleMute}
      onToggleVideo={toggleVideo}
      onLeave={leaveMeeting}
      onCopyLink={copyRoomLink}
    />
  )
}
