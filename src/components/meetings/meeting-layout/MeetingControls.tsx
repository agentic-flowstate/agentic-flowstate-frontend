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
  Check,
  Link2,
  Settings,
  ScreenShare,
  ScreenShareOff,
  FileText,
} from 'lucide-react'

interface MeetingControlsProps {
  isMuted: boolean
  isVideoOff: boolean
  isScreenSharing: boolean
  isTranscribing: boolean
  screenShareDisabled: boolean
  copied: boolean
  audioDevices: MediaDeviceInfo[]
  videoDevices: MediaDeviceInfo[]
  selectedAudioDevice: string
  selectedVideoDevice: string
  onAudioDeviceChange: (id: string) => void
  onVideoDeviceChange: (id: string) => void
  onToggleMute: () => void
  onToggleVideo: () => void
  onToggleScreenShare: () => void
  onToggleTranscribe: () => void
  onLeave: () => void
  onCopyLink: () => void
}

export function MeetingControls({
  isMuted,
  isVideoOff,
  isScreenSharing,
  isTranscribing,
  screenShareDisabled,
  copied,
  audioDevices,
  videoDevices,
  selectedAudioDevice,
  selectedVideoDevice,
  onAudioDeviceChange,
  onVideoDeviceChange,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleTranscribe,
  onLeave,
  onCopyLink,
}: MeetingControlsProps) {
  return (
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
          onClick={onToggleScreenShare}
          disabled={screenShareDisabled}
          className={`h-14 w-14 rounded-full ${
            isScreenSharing
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : screenShareDisabled
                ? 'bg-muted text-muted-foreground/50 cursor-not-allowed'
                : 'bg-muted hover:bg-accent text-foreground'
          }`}
        >
          {isScreenSharing ? <ScreenShareOff className="h-6 w-6" /> : <ScreenShare className="h-6 w-6" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleTranscribe}
          title={isTranscribing ? 'Stop transcription' : 'Start transcription'}
          className={`h-14 w-14 rounded-full ${
            isTranscribing
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-muted hover:bg-accent text-foreground'
          }`}
        >
          <FileText className="h-6 w-6" />
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
  )
}
