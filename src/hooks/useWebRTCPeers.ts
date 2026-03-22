"use client"

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  SignalingClient,
  SignalingMessage,
  getMeeting,
  createMeeting,
  startMeeting,
  joinMeetingAsParticipant,
} from '@/lib/api/meetings'

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

/**
 * Find the video sender on a peer connection, handling:
 * 1. Active video senders (camera or screen share)
 * 2. Null-track senders from stopped screen share
 * 3. recvonly video transceivers added for no-camera peers (can be promoted via replaceTrack)
 */
function findVideoSender(pc: RTCPeerConnection): RTCRtpSender | null {
  // 1. Sender with an active video track
  const activeSender = pc.getSenders().find(s => s.track?.kind === 'video')
  if (activeSender) return activeSender

  // 2. Video transceiver whose sender has null track (e.g. screen share stopped, no camera,
  //    or recvonly transceiver added at connection time for no-camera peers)
  const videoTransceiver = pc.getTransceivers().find(t =>
    t.sender.track === null && (
      // Has a video receiver (remote is sending video)
      t.receiver.track?.kind === 'video' ||
      // Or it's a video transceiver we added (mid may be null before negotiation)
      t.mid !== null
    )
  )
  return videoTransceiver?.sender ?? null
}

export interface UseWebRTCPeersReturn {
  participants: string[]
  speakingUsers: Set<string>
  screenSharers: string[]
  transcriptionActive: boolean
  transcribers: string[]
  localVideoRef: React.RefObject<HTMLVideoElement | null>
  remoteVideosRef: React.MutableRefObject<Map<string, HTMLVideoElement>>
  /** Bind a video element for a remote participant. Automatically assigns the stored stream. */
  bindRemoteVideo: (participantId: string, el: HTMLVideoElement | null) => void
  audioContextRef: React.MutableRefObject<AudioContext | null>
  mixedStreamRef: React.MutableRefObject<MediaStream | null>
  signalingRef: React.MutableRefObject<SignalingClient | null>
  peerConnectionsRef: React.MutableRefObject<Map<string, RTCPeerConnection>>
  screenStreamRef: React.MutableRefObject<MediaStream | null>
  joinMeeting: (localStream: MediaStream) => Promise<void>
  cleanupConnections: () => void
  startScreenShare: () => Promise<void>
  stopScreenShare: () => void
}

export function useWebRTCPeers(
  roomId: string,
  userId: string,
  onError: (msg: string) => void,
): UseWebRTCPeersReturn {
  const [participants, setParticipants] = useState<string[]>([])
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set())
  const [screenSharers, setScreenSharers] = useState<string[]>([])
  const [transcribers, setTranscribers] = useState<string[]>([])
  const transcriptionActive = transcribers.length > 0

  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map())
  const signalingRef = useRef<SignalingClient | null>(null)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const audioContextRef = useRef<AudioContext | null>(null)
  const mixedStreamRef = useRef<MediaStream | null>(null)
  const audioAnalysersRef = useRef<Map<string, AnalyserNode>>(new Map())
  const localStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map())

  /** Bind a video element for a remote participant. Assigns the stored stream if available. */
  const bindRemoteVideo = useCallback((participantId: string, el: HTMLVideoElement | null) => {
    if (el) {
      remoteVideosRef.current.set(participantId, el)
      const stream = remoteStreamsRef.current.get(participantId)
      if (stream && el.srcObject !== stream) {
        el.srcObject = stream
        console.log('[WebRTC] bindRemoteVideo:', participantId, {
          videoTracks: stream.getVideoTracks().length,
          audioTracks: stream.getAudioTracks().length,
          trackStates: stream.getTracks().map(t => `${t.kind}:${t.readyState}`),
        })
      } else if (!stream) {
        console.warn('[WebRTC] bindRemoteVideo: no stream for', participantId)
      }
    }
  }, [])

  const setupVoiceActivityDetection = useCallback(
    (stream: MediaStream, identifier: string) => {
      if (!audioContextRef.current) return

      const analyser = audioContextRef.current.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.3

      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyser)

      audioAnalysersRef.current.set(identifier, analyser)
    },
    []
  )

  const createPeerConnection = useCallback(
    (remoteUserId: string, isOfferer: boolean = false) => {
      const pc = new RTCPeerConnection(ICE_SERVERS)
      const stream = localStreamRef.current

      let hasVideoTrack = false
      if (stream) {
        stream.getTracks().forEach((track) => {
          if (track.kind === 'video') hasVideoTrack = true
          if (track.kind === 'video' && screenStreamRef.current) {
            const screenTrack = screenStreamRef.current.getVideoTracks()[0]
            if (screenTrack) {
              pc.addTrack(screenTrack, stream)
              return
            }
          }
          pc.addTrack(track, stream)
        })
      }

      // CRITICAL: If we're the offerer and have no video track (e.g. no camera on Mac Mini),
      // add a video transceiver so the SDP includes a video m-line from the start.
      // This ensures replaceTrack() will always find a video sender when screen sharing starts,
      // avoiding the need for unreliable renegotiation.
      if (isOfferer && !hasVideoTrack) {
        console.log('[WebRTC] No video track — adding recvonly video transceiver for', remoteUserId)
        pc.addTransceiver('video', { direction: 'recvonly' })
      }

      console.log('[WebRTC] Created peer connection for', remoteUserId, {
        isOfferer,
        senders: pc.getSenders().map(s => s.track?.kind ?? 'null'),
        transceivers: pc.getTransceivers().map(t => `${t.mid ?? 'pending'}:${t.direction}`),
        hasVideo: pc.getSenders().some(s => s.track?.kind === 'video') || pc.getTransceivers().some(t => t.receiver.track?.kind === 'video'),
      })

      pc.onicecandidate = (event) => {
        if (event.candidate && signalingRef.current) {
          signalingRef.current.sendIceCandidate(
            roomId,
            userId,
            remoteUserId,
            JSON.stringify(event.candidate)
          )
        }
      }

      pc.ontrack = (event) => {
        console.log('[WebRTC] ontrack from', remoteUserId, {
          kind: event.track.kind,
          readyState: event.track.readyState,
          muted: event.track.muted,
          streamsCount: event.streams.length,
          streamTracks: event.streams[0]?.getTracks().map(t => `${t.kind}:${t.readyState}`),
        })

        // When the remote peer used addTransceiver (no camera, added recvonly video
        // transceiver), event.streams is empty because there's no MSID in the SDP.
        // Fall back to reusing the existing remote stream or creating a new one.
        let remoteStream = event.streams[0]
        if (!remoteStream) {
          console.log('[WebRTC] ontrack: no stream in event (addTransceiver path), creating/reusing for', remoteUserId)
          remoteStream = remoteStreamsRef.current.get(remoteUserId) ?? new MediaStream()
          remoteStream.addTrack(event.track)
        }

        // Store the stream so new video elements can pick it up on mount
        remoteStreamsRef.current.set(remoteUserId, remoteStream)
        const videoEl = remoteVideosRef.current.get(remoteUserId)
        if (videoEl) {
          // Force reassign srcObject — during renegotiation (e.g. screen share),
          // the stream may be the same object with a newly-added video track.
          // Browsers won't re-evaluate tracks unless we kick the srcObject.
          videoEl.srcObject = null
          videoEl.srcObject = remoteStream
          console.log('[WebRTC] Reassigned srcObject for', remoteUserId, {
            videoTracks: remoteStream.getVideoTracks().length,
            audioTracks: remoteStream.getAudioTracks().length,
          })
        }

        setupVoiceActivityDetection(remoteStream, remoteUserId)

        if (audioContextRef.current && mixedStreamRef.current && event.track.kind === 'audio') {
          const source = audioContextRef.current.createMediaStreamSource(remoteStream)
          const dest = audioContextRef.current.createMediaStreamDestination()
          source.connect(dest)
          dest.stream.getAudioTracks().forEach((track) => {
            mixedStreamRef.current?.addTrack(track)
          })
        }
      }

      peerConnectionsRef.current.set(remoteUserId, pc)
      return pc
    },
    [roomId, userId, setupVoiceActivityDetection]
  )

  const handleSignalingMessage = useCallback(
    async (msg: SignalingMessage) => {
      switch (msg.type) {
        case 'room_users':
          setParticipants(msg.users)
          setScreenSharers(msg.screen_sharers ?? [])
          setTranscribers(msg.transcribers ?? [])
          for (const user of msg.users) {
            if (user !== userId && !peerConnectionsRef.current.has(user)) {
              const pc = createPeerConnection(user, true)
              const offer = await pc.createOffer()
              await pc.setLocalDescription(offer)
              signalingRef.current?.sendOffer(roomId, userId, user, JSON.stringify(offer))
            }
          }
          break

        case 'user_joined':
          setParticipants((prev) => [...prev.filter((u) => u !== msg.user_id), msg.user_id])
          break

        case 'user_left':
          setParticipants((prev) => prev.filter((u) => u !== msg.user_id))
          setScreenSharers((prev) => prev.filter((u) => u !== msg.user_id))
          setTranscribers((prev) => prev.filter((u) => u !== msg.user_id))
          remoteStreamsRef.current.delete(msg.user_id)
          const leftPc = peerConnectionsRef.current.get(msg.user_id)
          if (leftPc) {
            leftPc.close()
            peerConnectionsRef.current.delete(msg.user_id)
          }
          break

        case 'screen_share_started':
          setScreenSharers((prev) => [...prev.filter((u) => u !== msg.user_id), msg.user_id])
          break

        case 'screen_share_stopped':
          setScreenSharers((prev) => prev.filter((u) => u !== msg.user_id))
          break

        case 'transcription_started':
          setTranscribers((prev) => [...prev.filter((u) => u !== msg.user_id), msg.user_id])
          break

        case 'transcription_stopped':
          setTranscribers((prev) => prev.filter((u) => u !== msg.user_id))
          break

        case 'offer':
          if (msg.to_user === userId || msg.to_user === '*') {
            let pc = peerConnectionsRef.current.get(msg.from_user)
            const isRenegotiation = !!pc
            if (!pc) {
              pc = createPeerConnection(msg.from_user)
            }
            console.log('[WebRTC] Processing offer from', msg.from_user, {
              renegotiation: isRenegotiation,
              signalingState: pc.signalingState,
              connectionState: pc.connectionState,
            })
            try {
              await pc.setRemoteDescription(JSON.parse(msg.sdp))
              const answer = await pc.createAnswer()
              await pc.setLocalDescription(answer)
              signalingRef.current?.sendAnswer(roomId, userId, msg.from_user, JSON.stringify(answer))
              console.log('[WebRTC] Answer sent to', msg.from_user)
            } catch (err) {
              console.error('[WebRTC] Failed to process offer from', msg.from_user, err)
            }
          }
          break

        case 'answer':
          if (msg.to_user === userId) {
            const answerPc = peerConnectionsRef.current.get(msg.from_user)
            if (answerPc) {
              console.log('[WebRTC] Processing answer from', msg.from_user, {
                signalingState: answerPc.signalingState,
              })
              try {
                await answerPc.setRemoteDescription(JSON.parse(msg.sdp))
                console.log('[WebRTC] Answer applied from', msg.from_user)
              } catch (err) {
                console.error('[WebRTC] Failed to apply answer from', msg.from_user, err)
              }
            }
          }
          break

        case 'ice_candidate':
          if (msg.to_user === userId) {
            const icePc = peerConnectionsRef.current.get(msg.from_user)
            if (icePc) {
              await icePc.addIceCandidate(JSON.parse(msg.candidate))
            }
          }
          break

        case 'error':
          onError(msg.message)
          break
      }
    },
    [userId, roomId, createPeerConnection, onError]
  )

  // Monitor audio levels when joined (runs continuously while participants exist)
  useEffect(() => {
    if (participants.length === 0) return

    const SPEAKING_THRESHOLD = 15

    const checkAudioLevels = () => {
      const speaking = new Set<string>()

      audioAnalysersRef.current.forEach((analyser, identifier) => {
        const dataArray = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(dataArray)

        let sum = 0
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i]
        }
        const average = sum / dataArray.length

        if (average > SPEAKING_THRESHOLD) {
          speaking.add(identifier)
        }
      })

      setSpeakingUsers((prev) => {
        const prevArray = Array.from(prev).sort()
        const newArray = Array.from(speaking).sort()
        if (prevArray.join(',') !== newArray.join(',')) {
          return speaking
        }
        return prev
      })
    }

    const interval = setInterval(checkAudioLevels, 100)
    return () => clearInterval(interval)
  }, [participants.length])

  const joinMeeting = useCallback(async (localStream: MediaStream) => {
    localStreamRef.current = localStream

    // Create fresh AudioContext for the meeting
    const audioContext = new AudioContext()
    audioContextRef.current = audioContext

    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }

    const dest = audioContext.createMediaStreamDestination()
    const localSource = audioContext.createMediaStreamSource(localStream)
    localSource.connect(dest)
    mixedStreamRef.current = dest.stream

    // Set up VAD for local user
    setupVoiceActivityDetection(localStream, userId)

    // Ensure meeting exists
    try {
      await getMeeting(roomId)
    } catch {
      await createMeeting({ room_id: roomId, title: `Meeting ${roomId}` })
    }

    // Record this user as a participant
    await joinMeetingAsParticipant(roomId)

    // Connect to signaling
    const signaling = new SignalingClient()
    signalingRef.current = signaling

    signaling.onMessage(handleSignalingMessage)
    await signaling.connect()
    signaling.joinRoom(roomId, userId)

    await startMeeting(roomId)
  }, [roomId, userId, setupVoiceActivityDetection, handleSignalingMessage])

  const stopScreenShare = useCallback(async () => {
    const screenStream = screenStreamRef.current
    if (!screenStream) return

    console.log('[ScreenShare] Stopping')
    screenStream.getTracks().forEach((track) => track.stop())
    screenStreamRef.current = null

    const cameraTrack = localStreamRef.current?.getVideoTracks()[0] ?? null
    console.log('[ScreenShare] Reverting to camera:', cameraTrack ? `${cameraTrack.label} (enabled=${cameraTrack.enabled})` : 'none')

    for (const [peerId, pc] of peerConnectionsRef.current.entries()) {
      const videoSender = findVideoSender(pc)
      if (videoSender) {
        console.log('[ScreenShare] replaceTrack(camera) for peer', peerId)
        await videoSender.replaceTrack(cameraTrack)

        // If no camera, revert transceiver to recvonly and renegotiate
        if (!cameraTrack) {
          const transceiver = pc.getTransceivers().find(t => t.sender === videoSender)
          if (transceiver && transceiver.direction === 'sendrecv') {
            console.log('[ScreenShare] Reverting transceiver to recvonly for peer', peerId)
            transceiver.direction = 'recvonly'
            const offer = await pc.createOffer()
            await pc.setLocalDescription(offer)
            signalingRef.current?.sendOffer(roomId, userId, peerId, JSON.stringify(offer))
          }
        }
      } else {
        console.warn('[ScreenShare] No video sender found for peer', peerId)
      }
    }

    setScreenSharers((prev) => prev.filter((u) => u !== userId))
    signalingRef.current?.sendScreenShareStopped(roomId, userId)
  }, [roomId, userId])

  const startScreenShare = useCallback(async () => {
    if (screenStreamRef.current) return

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as MediaTrackConstraints,
        audio: false,
      })

      screenStreamRef.current = screenStream
      const screenTrack = screenStream.getVideoTracks()[0]
      const settings = screenTrack.getSettings()

      console.log('[ScreenShare] Acquired track:', {
        label: screenTrack.label,
        resolution: `${settings.width}x${settings.height}`,
        readyState: screenTrack.readyState,
        muted: screenTrack.muted,
        peerCount: peerConnectionsRef.current.size,
      })

      // Detect macOS Screen Recording permission issue (track exists but produces black frames)
      if (screenTrack.muted || settings.width === 0 || settings.height === 0) {
        console.warn('[ScreenShare] Track may be blocked — check macOS System Settings > Privacy & Security > Screen Recording')
      }

      for (const [peerId, pc] of peerConnectionsRef.current.entries()) {
        const videoSender = findVideoSender(pc)

        if (videoSender) {
          // If the transceiver was recvonly (no-camera peer), promote to sendrecv
          // so the remote side receives the screen track
          const transceiver = pc.getTransceivers().find(t => t.sender === videoSender)
          const needsRenegotiation = transceiver && (transceiver.direction === 'recvonly' || transceiver.direction === 'inactive')
          if (needsRenegotiation && transceiver) {
            console.log('[ScreenShare] Promoting transceiver to sendrecv for peer', peerId, 'was:', transceiver.direction)
            transceiver.direction = 'sendrecv'
          }

          console.log('[ScreenShare] replaceTrack for peer', peerId)
          await videoSender.replaceTrack(screenTrack)

          // Associate stream so SDP includes MSID — without this, remote ontrack
          // gets event.streams=[] and can't assign the video to an element.
          // This is needed when the sender came from addTransceiver (no stream association).
          if (videoSender.setStreams) {
            videoSender.setStreams(localStreamRef.current ?? new MediaStream())
            console.log('[ScreenShare] setStreams called for peer', peerId)
          }

          // If we changed direction, we need to renegotiate so the remote side knows
          if (needsRenegotiation) {
            console.log('[ScreenShare] Renegotiating after direction change for peer', peerId)
            const offer = await pc.createOffer()
            await pc.setLocalDescription(offer)
            signalingRef.current?.sendOffer(roomId, userId, peerId, JSON.stringify(offer))
          }
        } else {
          // Last resort: no video sender at all. Add track and renegotiate.
          console.log('[ScreenShare] No video sender for peer', peerId, '— adding track + renegotiating')
          pc.addTrack(screenTrack, localStreamRef.current ?? new MediaStream())
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          signalingRef.current?.sendOffer(roomId, userId, peerId, JSON.stringify(offer))
        }
      }

      setScreenSharers((prev) => [...prev.filter((u) => u !== userId), userId])
      signalingRef.current?.sendScreenShareStarted(roomId, userId)

      screenTrack.onended = () => {
        console.log('[ScreenShare] Track ended by user')
        stopScreenShare()
      }

      screenTrack.onmute = () => {
        console.warn('[ScreenShare] Track muted — check macOS System Settings > Privacy & Security > Screen Recording')
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        console.log('[ScreenShare] User cancelled picker')
        return
      }
      console.error('[ScreenShare] Failed:', err)
      onError(`Screen share failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }, [userId, roomId, onError, stopScreenShare])

  const cleanupConnections = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop())
      screenStreamRef.current = null
    }
    setScreenSharers([])
    signalingRef.current?.leaveRoom(roomId, userId)
    signalingRef.current?.disconnect()
    peerConnectionsRef.current.forEach((pc) => pc.close())
    peerConnectionsRef.current.clear()
    remoteStreamsRef.current.clear()
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close()
    }
    setParticipants([])
  }, [roomId, userId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop())
      }
      signalingRef.current?.disconnect()
      peerConnectionsRef.current.forEach((pc) => pc.close())
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close()
      }
    }
  }, [])

  return {
    participants,
    speakingUsers,
    screenSharers,
    transcriptionActive,
    transcribers,
    localVideoRef,
    remoteVideosRef,
    bindRemoteVideo,
    audioContextRef,
    mixedStreamRef,
    signalingRef,
    peerConnectionsRef,
    screenStreamRef,
    joinMeeting,
    cleanupConnections,
    startScreenShare,
    stopScreenShare,
  }
}
