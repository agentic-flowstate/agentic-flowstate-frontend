"use client"

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  SignalingClient,
  SignalingMessage,
  getMeeting,
  createMeeting,
  startMeeting,
} from '@/lib/api/meetings'

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

export interface UseWebRTCPeersReturn {
  participants: string[]
  speakingUsers: Set<string>
  localVideoRef: React.RefObject<HTMLVideoElement | null>
  remoteVideosRef: React.MutableRefObject<Map<string, HTMLVideoElement>>
  audioContextRef: React.MutableRefObject<AudioContext | null>
  mixedStreamRef: React.MutableRefObject<MediaStream | null>
  signalingRef: React.MutableRefObject<SignalingClient | null>
  peerConnectionsRef: React.MutableRefObject<Map<string, RTCPeerConnection>>
  joinMeeting: (localStream: MediaStream) => Promise<void>
  cleanupConnections: () => void
}

export function useWebRTCPeers(
  roomId: string,
  userId: string,
  onError: (msg: string) => void,
): UseWebRTCPeersReturn {
  const [participants, setParticipants] = useState<string[]>([])
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set())

  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map())
  const signalingRef = useRef<SignalingClient | null>(null)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const audioContextRef = useRef<AudioContext | null>(null)
  const mixedStreamRef = useRef<MediaStream | null>(null)
  const audioAnalysersRef = useRef<Map<string, AnalyserNode>>(new Map())
  const localStreamRef = useRef<MediaStream | null>(null)

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
    (remoteUserId: string) => {
      const pc = new RTCPeerConnection(ICE_SERVERS)
      const stream = localStreamRef.current

      if (stream) {
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream)
        })
      }

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
        const [remoteStream] = event.streams
        const videoEl = remoteVideosRef.current.get(remoteUserId)
        if (videoEl) {
          videoEl.srcObject = remoteStream
        }

        setupVoiceActivityDetection(remoteStream, remoteUserId)

        if (audioContextRef.current && mixedStreamRef.current) {
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
          for (const user of msg.users) {
            if (user !== userId && !peerConnectionsRef.current.has(user)) {
              const pc = createPeerConnection(user)
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
          const leftPc = peerConnectionsRef.current.get(msg.user_id)
          if (leftPc) {
            leftPc.close()
            peerConnectionsRef.current.delete(msg.user_id)
          }
          break

        case 'offer':
          if (msg.to_user === userId || msg.to_user === '*') {
            let pc = peerConnectionsRef.current.get(msg.from_user)
            if (!pc) {
              pc = createPeerConnection(msg.from_user)
            }
            await pc.setRemoteDescription(JSON.parse(msg.sdp))
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            signalingRef.current?.sendAnswer(roomId, userId, msg.from_user, JSON.stringify(answer))
          }
          break

        case 'answer':
          if (msg.to_user === userId) {
            const answerPc = peerConnectionsRef.current.get(msg.from_user)
            if (answerPc) {
              await answerPc.setRemoteDescription(JSON.parse(msg.sdp))
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

    // Connect to signaling
    const signaling = new SignalingClient()
    signalingRef.current = signaling

    signaling.onMessage(handleSignalingMessage)
    await signaling.connect()
    signaling.joinRoom(roomId, userId)

    await startMeeting(roomId)
  }, [roomId, userId, setupVoiceActivityDetection, handleSignalingMessage])

  const cleanupConnections = useCallback(() => {
    signalingRef.current?.leaveRoom(roomId, userId)
    signalingRef.current?.disconnect()
    peerConnectionsRef.current.forEach((pc) => pc.close())
    peerConnectionsRef.current.clear()
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close()
    }
    setParticipants([])
  }, [roomId, userId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
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
    localVideoRef,
    remoteVideosRef,
    audioContextRef,
    mixedStreamRef,
    signalingRef,
    peerConnectionsRef,
    joinMeeting,
    cleanupConnections,
  }
}
