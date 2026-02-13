'use client'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ArrowLeft,
  Settings,
} from 'lucide-react'

export interface MeetingLobbyProps {
  roomId: string
  userName: string | undefined
  // Device state
  audioDevices: MediaDeviceInfo[]
  videoDevices: MediaDeviceInfo[]
  selectedAudioDevice: string
  selectedVideoDevice: string
  onAudioDeviceChange: (id: string) => void
  onVideoDeviceChange: (id: string) => void
  // Media state
  isMuted: boolean
  isVideoOff: boolean
  audioLevel: number
  localStream: MediaStream | null
  lobbyVideoRef: React.RefObject<HTMLVideoElement | null>
  // Actions
  onToggleMute: () => void
  onToggleVideo: () => void
  onJoin: () => void
  onBack: () => void
  // Error
  error: string | null
}

export function MeetingLobby({
  roomId,
  userName,
  audioDevices,
  videoDevices,
  selectedAudioDevice,
  selectedVideoDevice,
  onAudioDeviceChange,
  onVideoDeviceChange,
  isMuted,
  isVideoOff,
  audioLevel,
  localStream,
  lobbyVideoRef,
  onToggleMute,
  onToggleVideo,
  onJoin,
  onBack,
  error,
}: MeetingLobbyProps) {
  return (
    <div className="absolute inset-0 bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          {userName ? (
            <h1 className="text-2xl font-semibold text-foreground mb-2">Ready to join as {userName}?</h1>
          ) : (
            <h1 className="text-2xl font-semibold text-foreground mb-2">Select your user in the header to join</h1>
          )}
          <p className="text-muted-foreground font-mono text-sm">{roomId}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Video preview */}
          <div className="space-y-4">
            <div className="relative aspect-video bg-muted rounded-2xl overflow-hidden">
              <video
                ref={lobbyVideoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover -scale-x-100 ${isVideoOff ? 'invisible' : ''}`}
              />
              {isVideoOff && (
                <div className="absolute inset-0 flex items-center justify-center bg-card">
                  <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-3xl font-semibold text-muted-foreground">You</span>
                  </div>
                </div>
              )}
            </div>

            {/* Media controls */}
            <div className="flex justify-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleMute}
                className={`h-12 w-12 rounded-full ${
                  isMuted
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-muted hover:bg-accent text-foreground'
                }`}
              >
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleVideo}
                className={`h-12 w-12 rounded-full ${
                  isVideoOff
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-muted hover:bg-accent text-foreground'
                }`}
              >
                {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Device settings */}
          <div className="space-y-6">
            <div className="bg-card rounded-xl p-6 space-y-5">
              <div className="flex items-center gap-2 text-foreground mb-4">
                <Settings className="h-5 w-5" />
                <span className="font-medium">Device Settings</span>
              </div>

              {/* Microphone */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Microphone</label>
                <Select value={selectedAudioDevice} onValueChange={onAudioDeviceChange}>
                  <SelectTrigger className="bg-muted border-border text-foreground">
                    <SelectValue placeholder="Select microphone" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {audioDevices.map((device) => (
                      <SelectItem key={device.deviceId} value={device.deviceId} className="text-popover-foreground">
                        {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Audio level meter */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Input level</span>
                    <span>{audioLevel.toFixed(0)}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-75 ${
                        audioLevel > 30 ? 'bg-green-500' : audioLevel > 10 ? 'bg-yellow-500' : 'bg-muted-foreground/30'
                      }`}
                      style={{ width: `${Math.min(100, audioLevel * 2)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {audioLevel > 30 ? 'Good - your mic is working!' : audioLevel > 10 ? 'Detected - try speaking louder' : 'No audio detected - check your mic'}
                  </p>
                </div>
              </div>

              {/* Camera */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Camera</label>
                <Select value={selectedVideoDevice} onValueChange={onVideoDeviceChange}>
                  <SelectTrigger className="bg-muted border-border text-foreground">
                    <SelectValue placeholder="Select camera" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {videoDevices.map((device) => (
                      <SelectItem key={device.deviceId} value={device.deviceId} className="text-popover-foreground">
                        {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-500 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Join button */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onBack}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={onJoin}
                disabled={!localStream || !userName}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white disabled:opacity-50"
              >
                {!userName ? 'Select user above' : 'Join Meeting'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
