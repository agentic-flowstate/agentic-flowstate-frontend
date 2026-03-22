'use client'

import React from 'react'
import { PinOff } from 'lucide-react'
import { FocusTarget } from './types'

interface FocusedViewProps {
  target: FocusTarget
  userId: string
  bindRemoteVideo: (participantId: string, el: HTMLVideoElement | null) => void
  bindLocalVideo: (el: HTMLVideoElement | null) => void
  bindLocalScreenVideo: (el: HTMLVideoElement | null) => void
  isVideoOff: boolean
  onUnpin?: () => void
}

export function FocusedView({
  target,
  userId,
  bindRemoteVideo,
  bindLocalVideo,
  bindLocalScreenVideo,
  isVideoOff,
  onUnpin,
}: FocusedViewProps) {
  const isLocalScreen = target.participantId === userId && target.type === 'screen'
  const isLocalCamera = target.participantId === userId && target.type === 'camera'
  const displayName = target.participantId === userId
    ? 'You'
    : target.participantId.replace('user-', '').slice(0, 6)

  return (
    <div className="flex-1 relative rounded-2xl overflow-hidden bg-black group">
      {isLocalScreen ? (
        <video
          ref={bindLocalScreenVideo}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-contain"
        />
      ) : isLocalCamera ? (
        <>
          <video
            ref={bindLocalVideo}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-contain -scale-x-100 ${isVideoOff ? 'invisible' : ''}`}
          />
          {isVideoOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-card">
              <div className="w-24 h-24 rounded-full flex items-center justify-center bg-muted">
                <span className="text-3xl font-semibold text-muted-foreground">You</span>
              </div>
            </div>
          )}
        </>
      ) : (
        <video
          ref={(el) => bindRemoteVideo(target.participantId, el)}
          autoPlay
          playsInline
          className="w-full h-full object-contain"
        />
      )}

      {/* Label */}
      <div className="absolute bottom-3 left-3">
        <span className={`px-2.5 py-1 rounded-md backdrop-blur text-white text-sm font-medium ${
          target.type === 'screen' ? 'bg-green-600/90' : 'bg-black/60'
        }`}>
          {target.type === 'screen' ? `${displayName}'s screen` : displayName}
        </span>
      </div>

      {/* Unpin button */}
      {onUnpin && (
        <button
          onClick={(e) => { e.stopPropagation(); onUnpin() }}
          className="absolute top-3 right-3 p-2 rounded-lg bg-black/60 backdrop-blur text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
        >
          <PinOff className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
