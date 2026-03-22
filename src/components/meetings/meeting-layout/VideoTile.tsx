'use client'

import React from 'react'
import { MicOff, Pin, ScreenShare } from 'lucide-react'
import { VideoTileProps } from './types'

export function VideoTile({
  participantId,
  isLocal,
  isSpeaking,
  isMuted = false,
  isVideoOff = false,
  isScreenSharing = false,
  label,
  bindLocalVideo,
  bindRemoteVideo,
  onPin,
  isPinned = false,
  size = 'md',
}: VideoTileProps) {
  const speakingRing = isSpeaking && !(isLocal && isMuted)
    ? 'ring-[3px] ring-green-500 bg-green-500/10'
    : 'bg-muted'

  const avatarSize = size === 'sm' ? 'w-10 h-10 text-sm' : size === 'lg' ? 'w-24 h-24 text-3xl' : 'w-20 h-20 text-2xl'
  const labelTextSize = size === 'sm' ? 'text-xs' : 'text-sm'

  return (
    <div
      className={`relative rounded-2xl overflow-hidden transition-all duration-150 cursor-pointer group h-full ${speakingRing}`}
      onClick={() => onPin?.({ type: isScreenSharing ? 'screen' : 'camera', participantId })}
    >
      {/* isScreenSharing = this camera tile's user is sharing screen, show placeholder */}
      {isScreenSharing ? (
        <div className="absolute inset-0 flex items-center justify-center bg-card">
          <ScreenShare className="h-6 w-6 text-green-500" />
        </div>
      ) : isLocal ? (
        <video
          ref={bindLocalVideo}
          autoPlay
          muted
          playsInline
          className={`w-full h-full object-cover -scale-x-100 ${isVideoOff ? 'invisible' : ''}`}
        />
      ) : (
        <video
          ref={(el) => bindRemoteVideo?.(participantId, el)}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      )}

      {isVideoOff && !isScreenSharing && isLocal && (
        <div className="absolute inset-0 flex items-center justify-center bg-card">
          <div className={`${avatarSize} rounded-full flex items-center justify-center transition-colors ${
            speakingRing.includes('ring') ? 'bg-green-600' : 'bg-muted'
          }`}>
            <span className="font-semibold text-muted-foreground">{label}</span>
          </div>
        </div>
      )}

      {/* Name label */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <span className={`px-2.5 py-1 rounded-md backdrop-blur text-white ${labelTextSize} font-medium transition-colors ${
          speakingRing.includes('ring') ? 'bg-green-600/90' : 'bg-black/60'
        }`}>
          {label}
        </span>
        {isMuted && isLocal && (
          <span className="p-1.5 rounded-md bg-red-500/90 backdrop-blur">
            <MicOff className="h-3.5 w-3.5 text-white" />
          </span>
        )}
      </div>

      {/* Pin indicator */}
      {isPinned && (
        <div className="absolute top-2 right-2 p-1.5 rounded-md bg-blue-500/90 backdrop-blur">
          <Pin className="h-3.5 w-3.5 text-white" />
        </div>
      )}

      {/* Pin on hover */}
      {onPin && !isPinned && (
        <div className="absolute top-2 right-2 p-1.5 rounded-md bg-black/60 backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity">
          <Pin className="h-3.5 w-3.5 text-white" />
        </div>
      )}
    </div>
  )
}
