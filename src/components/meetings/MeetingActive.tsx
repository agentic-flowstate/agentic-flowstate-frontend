'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Users,
  Check,
  Link2,
  Settings,
} from 'lucide-react'

export interface MeetingActiveProps {
  roomId: string
  userId: string
  // Participants
  participants: string[]
  speakingUsers: Set<string>
  // Media
  isMuted: boolean
  isVideoOff: boolean
  isRecording: boolean
  copied: boolean
  localVideoRef: React.RefObject<HTMLVideoElement | null>
  remoteVideosRef: React.MutableRefObject<Map<string, HTMLVideoElement>>
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
  isMuted,
  isVideoOff,
  isRecording,
  copied,
  localVideoRef,
  remoteVideosRef,
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
  const remoteParticipants = participants.filter((p) => p !== userId)
  const totalParticipants = 1 + remoteParticipants.length

  return (
    <div className="absolute inset-0 bg-background flex flex-col">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-muted-foreground">{roomId}</span>
          {isRecording && (
            <div className="flex items-center gap-1.5 text-xs text-red-500 dark:text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              REC
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Users className="h-4 w-4" />
          <span>{totalParticipants}</span>
        </div>
      </div>

      {/* Video area */}
      <div className="flex-1 p-4 overflow-hidden">
        <div className={`h-full grid gap-3 ${
          totalParticipants === 1
            ? 'grid-cols-1'
            : totalParticipants === 2
              ? 'grid-cols-2'
              : totalParticipants <= 4
                ? 'grid-cols-2 grid-rows-2'
                : 'grid-cols-3 auto-rows-fr'
        }`}>
          {/* Local video */}
          <div className={`relative rounded-2xl overflow-hidden transition-all duration-150 ${
            totalParticipants === 1 ? 'max-w-4xl mx-auto w-full' : ''
          } ${
            speakingUsers.has(userId) && !isMuted
              ? 'ring-[3px] ring-green-500 bg-green-500/10'
              : 'bg-muted'
          }`}>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover -scale-x-100 ${isVideoOff ? 'invisible' : ''}`}
            />
            {isVideoOff && (
              <div className="absolute inset-0 flex items-center justify-center bg-card">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors ${
                  speakingUsers.has(userId) && !isMuted ? 'bg-green-600' : 'bg-muted'
                }`}>
                  <span className="text-2xl font-semibold text-muted-foreground">You</span>
                </div>
              </div>
            )}
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-md backdrop-blur text-white text-sm font-medium transition-colors ${
                speakingUsers.has(userId) && !isMuted ? 'bg-green-600/90' : 'bg-black/60'
              }`}>
                You
              </span>
              {isMuted && (
                <span className="p-1.5 rounded-md bg-red-500/90 backdrop-blur">
                  <MicOff className="h-3.5 w-3.5 text-white" />
                </span>
              )}
            </div>
          </div>

          {/* Remote videos */}
          {remoteParticipants.map((participantId) => (
            <div
              key={participantId}
              className={`relative rounded-2xl overflow-hidden transition-all duration-150 ${
                speakingUsers.has(participantId)
                  ? 'ring-[3px] ring-green-500 bg-green-500/10'
                  : 'bg-muted'
              }`}
            >
              <video
                ref={(el) => {
                  if (el) remoteVideosRef.current.set(participantId, el)
                }}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-3 left-3">
                <span className={`px-2.5 py-1 rounded-md backdrop-blur text-white text-sm font-medium transition-colors ${
                  speakingUsers.has(participantId) ? 'bg-green-600/90' : 'bg-black/60'
                }`}>
                  {participantId.replace('user-', '').slice(0, 6)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="h-20 flex items-center justify-center gap-3 px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onCopyLink}
          className="h-12 w-12 rounded-full bg-muted hover:bg-accent text-muted-foreground"
        >
          {copied ? <Check className="h-5 w-5 text-green-500" /> : <Link2 className="h-5 w-5" />}
        </Button>

        <div className="flex items-center gap-2 mx-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleMute}
            className={`h-14 w-14 rounded-full ${
              isMuted
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-muted hover:bg-accent text-foreground'
            }`}
          >
            {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleVideo}
            className={`h-14 w-14 rounded-full ${
              isVideoOff
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-muted hover:bg-accent text-foreground'
            }`}
          >
            {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onLeave}
            className="h-14 w-14 rounded-full bg-red-600 hover:bg-red-700 text-white ml-2"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-full bg-muted hover:bg-accent text-muted-foreground"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Device Settings</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-6">
              {/* Microphone */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Microphone</label>
                <Select value={selectedAudioDevice} onValueChange={onAudioDeviceChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select microphone" />
                  </SelectTrigger>
                  <SelectContent>
                    {audioDevices.map((device) => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Camera */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Camera</label>
                <Select value={selectedVideoDevice} onValueChange={onVideoDeviceChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select camera" />
                  </SelectTrigger>
                  <SelectContent>
                    {videoDevices.map((device) => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}
