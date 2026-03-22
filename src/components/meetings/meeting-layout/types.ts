export type LayoutMode = 'auto' | 'grid' | 'sidebar' | 'spotlight'

export interface FocusTarget {
  type: 'screen' | 'camera'
  participantId: string
}

export interface VideoTileProps {
  participantId: string
  isLocal: boolean
  isSpeaking: boolean
  isMuted?: boolean
  isVideoOff?: boolean
  isScreenSharing?: boolean
  label: string
  bindLocalVideo?: (el: HTMLVideoElement | null) => void
  bindRemoteVideo?: (participantId: string, el: HTMLVideoElement | null) => void
  onPin?: (target: FocusTarget) => void
  isPinned?: boolean
  size?: 'sm' | 'md' | 'lg'
}
