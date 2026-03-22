'use client'

import React from 'react'
import { VideoTile } from './VideoTile'
import { FocusTarget } from './types'

interface ParticipantStripProps {
  participants: string[]
  userId: string
  speakingUsers: Set<string>
  isMuted: boolean
  isVideoOff: boolean
  bindLocalVideo: (el: HTMLVideoElement | null) => void
  bindRemoteVideo: (participantId: string, el: HTMLVideoElement | null) => void
  screenSharers: string[]
  pinnedTarget: FocusTarget | null
  onPin: (target: FocusTarget | null) => void
  layout: 'strip' | 'grid'
  /** In strip mode, exclude this participant from the strip (they're in focus view) */
  focusedParticipantId?: string
  focusedType?: 'screen' | 'camera'
}

function getGridCols(count: number): string {
  if (count <= 1) return 'grid-cols-1'
  if (count <= 2) return 'grid-cols-2'
  if (count <= 4) return 'grid-cols-2 grid-rows-2'
  if (count <= 6) return 'grid-cols-3'
  return 'grid-cols-3 auto-rows-fr'
}

export function ParticipantStrip({
  participants,
  userId,
  speakingUsers,
  isMuted,
  isVideoOff,
  bindLocalVideo,
  bindRemoteVideo,
  screenSharers,
  pinnedTarget,
  onPin,
  layout,
  focusedParticipantId,
  focusedType,
}: ParticipantStripProps) {
  const remoteParticipants = participants.filter((p) => p !== userId)
  const allParticipantIds = [userId, ...remoteParticipants]

  // In strip mode, show screen share tiles for sharers (except the focused one)
  // plus camera tiles for everyone
  const tiles: Array<{ participantId: string; type: 'screen' | 'camera' }> = []

  if (layout === 'strip') {
    // Add screen share tiles for non-focused sharers
    for (const sharer of screenSharers) {
      if (focusedParticipantId === sharer && focusedType === 'screen') continue
      tiles.push({ participantId: sharer, type: 'screen' })
    }
    // Add camera tiles
    for (const p of allParticipantIds) {
      if (focusedParticipantId === p && focusedType === 'camera') continue
      tiles.push({ participantId: p, type: 'camera' })
    }
  } else {
    // Grid mode: screen share tiles first, then camera tiles
    for (const sharer of screenSharers) {
      tiles.push({ participantId: sharer, type: 'screen' })
    }
    for (const p of allParticipantIds) {
      tiles.push({ participantId: p, type: 'camera' })
    }
  }

  const handlePin = (target: FocusTarget) => {
    // Toggle pin: if already pinned to same target, unpin
    if (pinnedTarget && pinnedTarget.type === target.type && pinnedTarget.participantId === target.participantId) {
      onPin(null)
    } else {
      onPin(target)
    }
  }

  if (layout === 'strip') {
    return (
      <div className="w-48 flex flex-col gap-2 overflow-y-auto transition-[width] duration-300">
        {tiles.map(({ participantId, type }) => {
          const isLocal = participantId === userId
          const isPinned = pinnedTarget?.participantId === participantId && pinnedTarget?.type === type
          const label = isLocal ? 'You' : participantId.replace('user-', '').slice(0, 6)

          return (
            <div key={`${type}-${participantId}`} className="aspect-video shrink-0">
              <VideoTile
                participantId={participantId}
                isLocal={isLocal && type === 'camera'}
                isSpeaking={speakingUsers.has(participantId)}
                isMuted={isLocal ? isMuted : false}
                isVideoOff={isLocal && type === 'camera' ? isVideoOff : false}
                isScreenSharing={type === 'camera' && screenSharers.includes(participantId)}
                label={type === 'screen' ? `${label}'s screen` : label}
                bindLocalVideo={isLocal && type === 'camera' ? bindLocalVideo : undefined}
                bindRemoteVideo={!isLocal || type === 'screen' ? bindRemoteVideo : undefined}
                onPin={() => handlePin({ type, participantId })}
                isPinned={isPinned}
                size="sm"
              />
            </div>
          )
        })}
      </div>
    )
  }

  // Grid layout
  const totalTiles = tiles.length
  return (
    <div className={`h-full grid gap-3 ${getGridCols(totalTiles)}`}>
      {tiles.map(({ participantId, type }) => {
        const isLocal = participantId === userId
        const isPinned = pinnedTarget?.participantId === participantId && pinnedTarget?.type === type
        const label = isLocal ? 'You' : participantId.replace('user-', '').slice(0, 6)

        return (
          <div
            key={`${type}-${participantId}`}
            className={`${totalTiles === 1 ? 'max-w-4xl mx-auto w-full' : ''} aspect-video`}
          >
            <VideoTile
              participantId={participantId}
              isLocal={isLocal && type === 'camera'}
              isSpeaking={speakingUsers.has(participantId)}
              isMuted={isLocal ? isMuted : false}
              isVideoOff={isLocal && type === 'camera' ? isVideoOff : false}
              isScreenSharing={type === 'camera' && screenSharers.includes(participantId)}
              label={type === 'screen' ? `${label}'s screen` : label}
              bindLocalVideo={isLocal && type === 'camera' ? bindLocalVideo : undefined}
              bindRemoteVideo={!isLocal || type === 'screen' ? bindRemoteVideo : undefined}
              onPin={() => handlePin({ type, participantId })}
              isPinned={isPinned}
              size="md"
            />
          </div>
        )
      })}
    </div>
  )
}
