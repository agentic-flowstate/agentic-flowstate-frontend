"use client"

import { useState, useEffect, useRef } from 'react'

export interface UseLobbyPreviewOptions {
  selectedAudioDevice: string
  selectedVideoDevice: string
  isMuted: boolean
  isVideoOff: boolean
  active: boolean // only run when in lobby
}

export interface UseLobbyPreviewReturn {
  localStream: MediaStream | null
  audioLevel: number
  lobbyVideoRef: React.RefObject<HTMLVideoElement | null>
  streamRef: React.MutableRefObject<MediaStream | null>
  error: string | null
}

export function useLobbyPreview(options: UseLobbyPreviewOptions): UseLobbyPreviewReturn {
  const { selectedAudioDevice, selectedVideoDevice, isMuted, isVideoOff, active } = options

  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [audioLevel, setAudioLevel] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const lobbyVideoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (!active) return
    if (!selectedAudioDevice && !selectedVideoDevice) return

    let cancelled = false
    let stream: MediaStream | null = null
    let audioContext: AudioContext | null = null
    let intervalId: NodeJS.Timeout | null = null

    async function startPreview() {
      try {
        const audioConstraint = selectedAudioDevice ? { deviceId: { exact: selectedAudioDevice } } : true
        const videoConstraint = selectedVideoDevice ? { deviceId: { exact: selectedVideoDevice } } : true

        // Try audio+video, fall back to audio-only (e.g. Mac Mini has no camera)
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraint, video: videoConstraint })
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraint, video: false })
        }

        if (cancelled) {
          stream.getTracks().forEach(track => track.stop())
          return
        }

        const audioTracks = stream.getAudioTracks()
        const videoTracks = stream.getVideoTracks()

        if (audioTracks.length === 0) {
          setError('No audio track in stream - microphone may not be available')
          return
        }

        // Apply persisted mute/video-off states to tracks
        if (isMuted) {
          audioTracks.forEach(track => { track.enabled = false })
        }
        if (isVideoOff) {
          videoTracks.forEach(track => { track.enabled = false })
        }

        setLocalStream(stream)
        streamRef.current = stream

        if (lobbyVideoRef.current) {
          lobbyVideoRef.current.srcObject = stream
        }

        // Set up audio level meter
        audioContext = new AudioContext()

        if (audioContext.state === 'suspended') {
          await audioContext.resume()
        }

        if (cancelled) {
          audioContext.close()
          return
        }

        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.3

        const source = audioContext.createMediaStreamSource(stream)
        source.connect(analyser)

        const bufferLength = analyser.frequencyBinCount
        const frequencyData = new Uint8Array(bufferLength)
        const timeDomainData = new Uint8Array(bufferLength)

        const checkAudio = () => {
          if (cancelled) return
          if (audioContext?.state !== 'running') return

          analyser.getByteFrequencyData(frequencyData)
          analyser.getByteTimeDomainData(timeDomainData)

          // Calculate RMS from time domain (more accurate for voice)
          let sumSquares = 0
          for (let i = 0; i < bufferLength; i++) {
            const normalized = (timeDomainData[i] - 128) / 128
            sumSquares += normalized * normalized
          }
          const rms = Math.sqrt(sumSquares / bufferLength)
          const rmsLevel = rms * 100

          // Also calculate frequency average
          let freqSum = 0
          for (let i = 0; i < bufferLength; i++) {
            freqSum += frequencyData[i]
          }
          const freqAvg = freqSum / bufferLength

          // Use the higher of the two methods
          const level = Math.max(rmsLevel * 3, freqAvg)
          setAudioLevel(level)
        }

        checkAudio()
        intervalId = setInterval(checkAudio, 50)
      } catch (err) {
        console.error('Failed to start preview:', err)
        setError(`Could not access camera/microphone: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    startPreview()

    return () => {
      cancelled = true
      if (intervalId) clearInterval(intervalId)

      const contextToClose = audioContext
      if (contextToClose && contextToClose.state !== 'closed') {
        contextToClose.close()
      }

      // Only stop stream if we're switching devices (not transitioning to meeting)
      if (stream && streamRef.current !== stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [selectedAudioDevice, selectedVideoDevice, active])

  return { localStream, audioLevel, lobbyVideoRef, streamRef, error }
}
