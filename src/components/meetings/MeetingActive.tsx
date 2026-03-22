'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { MeetingHeader } from './meeting-layout/MeetingHeader'
import { MeetingControls } from './meeting-layout/MeetingControls'
import { FocusedView } from './meeting-layout/FocusedView'
import { ParticipantStrip } from './meeting-layout/ParticipantStrip'
import { LayoutMode, FocusTarget } from './meeting-layout/types'

export interface MeetingActiveProps {
  roomId: string
  userId: string
  // Participants
  participants: string[]
  speakingUsers: Set<string>
  // Screen share
  screenSharers: string[]
  isScreenSharing: boolean
  onToggleScreenShare: () => void
  screenStreamRef: React.MutableRefObject<MediaStream | null>
  // Transcription
  isTranscribing: boolean
  onToggleTranscribe: () => void
  // Media
  isMuted: boolean
  isVideoOff: boolean
  isRecording: boolean
  copied: boolean
  localStream: MediaStream | null
  bindRemoteVideo: (participantId: string, el: HTMLVideoElement | null) => void
  // Devices
  audioDevices: MediaDeviceInfo[]
  videoDevices: MediaDeviceInfo[]
  selectedAudioDevice: string
  selectedVideoDevice: string
  onAudioDeviceChange: (id: string) => void
  onVideoDeviceChange: (id: string) => void
  // Actions
  onToggleMute: () => void
  onToggleVideo: () => void
  onLeave: () => void
  onCopyLink: () => void
}

export function MeetingActive({
  roomId,
  userId,
  participants,
  speakingUsers,
  screenSharers,
  isScreenSharing,
  onToggleScreenShare,
  screenStreamRef,
  isTranscribing,
  onToggleTranscribe,
  isMuted,
  isVideoOff,
  isRecording,
  copied,
  localStream,
  bindRemoteVideo,
  audioDevices,
  videoDevices,
  selectedAudioDevice,
  selectedVideoDevice,
  onAudioDeviceChange,
  onVideoDeviceChange,
  onToggleMute,
  onToggleVideo,
  onLeave,
  onCopyLink,
}: MeetingActiveProps) {
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('auto')
  const [pinnedTarget, setPinnedTarget] = useState<FocusTarget | null>(null)

  // Bind local video element: assigns srcObject on mount so layout transitions don't lose video
  const bindLocalVideo = useCallback((el: HTMLVideoElement | null) => {
    if (el && localStream && el.srcObject !== localStream) {
      el.srcObject = localStream
    }
  }, [localStream])

  // Bind local screen share preview
  const bindLocalScreenVideo = useCallback((el: HTMLVideoElement | null) => {
    const screenStream = screenStreamRef.current
    if (el && screenStream && el.srcObject !== screenStream) {
      el.srcObject = screenStream
    }
  }, [screenStreamRef, isScreenSharing]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clear pin when pinned user leaves
  useEffect(() => {
    if (pinnedTarget && !participants.includes(pinnedTarget.participantId)) {
      setPinnedTarget(null)
    }
  }, [participants, pinnedTarget])

  // Clear pin on screen sharer if they stop sharing
  useEffect(() => {
    if (pinnedTarget?.type === 'screen' && !screenSharers.includes(pinnedTarget.participantId)) {
      setPinnedTarget(null)
    }
  }, [screenSharers, pinnedTarget])

  // Derive effective focus: pinned > first screen sharer > null
  const effectiveFocus: FocusTarget | null = pinnedTarget
    ?? (screenSharers.length > 0
      ? { type: 'screen' as const, participantId: screenSharers[0] }
      : null)

  // Resolve layout mode
  const resolvedLayout: Exclude<LayoutMode, 'auto'> = layoutMode === 'auto'
    ? (effectiveFocus ? 'sidebar' : 'grid')
    : layoutMode

  const totalParticipants = participants.length || 1

  return (
    <div className="absolute inset-0 bg-background flex flex-col">
      <MeetingHeader
        roomId={roomId}
        isRecording={isRecording}
        participantCount={totalParticipants}
        layoutMode={layoutMode}
        onLayoutModeChange={setLayoutMode}
      />

      {/* Video area */}
      <div className="flex-1 p-4 overflow-hidden">
        {resolvedLayout === 'grid' ? (
          <ParticipantStrip
            participants={participants}
            userId={userId}
            speakingUsers={speakingUsers}
            isMuted={isMuted}
            isVideoOff={isVideoOff}
            bindLocalVideo={bindLocalVideo}
            bindRemoteVideo={bindRemoteVideo}
            screenSharers={screenSharers}
            pinnedTarget={pinnedTarget}
            onPin={setPinnedTarget}
            layout="grid"
          />
        ) : resolvedLayout === 'spotlight' ? (
          effectiveFocus ? (
            <FocusedView
              target={effectiveFocus}
              userId={userId}
              bindRemoteVideo={bindRemoteVideo}
              bindLocalVideo={bindLocalVideo}
              bindLocalScreenVideo={bindLocalScreenVideo}
              isVideoOff={isVideoOff}
              onUnpin={pinnedTarget ? () => setPinnedTarget(null) : undefined}
            />
          ) : (
            <ParticipantStrip
              participants={participants}
              userId={userId}
              speakingUsers={speakingUsers}
              isMuted={isMuted}
              isVideoOff={isVideoOff}
              bindLocalVideo={bindLocalVideo}
              bindRemoteVideo={bindRemoteVideo}
              screenSharers={screenSharers}
              pinnedTarget={pinnedTarget}
              onPin={setPinnedTarget}
              layout="grid"
            />
          )
        ) : (
          /* sidebar */
          effectiveFocus ? (
            <div className="h-full flex gap-3">
              <FocusedView
                target={effectiveFocus}
                userId={userId}
                bindRemoteVideo={bindRemoteVideo}
                bindLocalVideo={bindLocalVideo}
                bindLocalScreenVideo={bindLocalScreenVideo}
                isVideoOff={isVideoOff}
                onUnpin={pinnedTarget ? () => setPinnedTarget(null) : undefined}
              />
              <ParticipantStrip
                participants={participants}
                userId={userId}
                speakingUsers={speakingUsers}
                isMuted={isMuted}
                isVideoOff={isVideoOff}
                bindLocalVideo={bindLocalVideo}
                bindRemoteVideo={bindRemoteVideo}
                screenSharers={screenSharers}
                pinnedTarget={pinnedTarget}
                onPin={setPinnedTarget}
                layout="strip"
                focusedParticipantId={effectiveFocus.participantId}
                focusedType={effectiveFocus.type}
              />
            </div>
          ) : (
            <ParticipantStrip
              participants={participants}
              userId={userId}
              speakingUsers={speakingUsers}
              isMuted={isMuted}
              isVideoOff={isVideoOff}
              bindLocalVideo={bindLocalVideo}
              bindRemoteVideo={bindRemoteVideo}
              screenSharers={screenSharers}
              pinnedTarget={pinnedTarget}
              onPin={setPinnedTarget}
              layout="grid"
            />
          )
        )}
      </div>

      <MeetingControls
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        isScreenSharing={isScreenSharing}
        isTranscribing={isTranscribing}
        screenShareDisabled={false}
        copied={copied}
        audioDevices={audioDevices}
        videoDevices={videoDevices}
        selectedAudioDevice={selectedAudioDevice}
        selectedVideoDevice={selectedVideoDevice}
        onAudioDeviceChange={onAudioDeviceChange}
        onVideoDeviceChange={onVideoDeviceChange}
        onToggleMute={onToggleMute}
        onToggleVideo={onToggleVideo}
        onToggleScreenShare={onToggleScreenShare}
        onToggleTranscribe={onToggleTranscribe}
        onLeave={onLeave}
        onCopyLink={onCopyLink}
      />
    </div>
  )
}
