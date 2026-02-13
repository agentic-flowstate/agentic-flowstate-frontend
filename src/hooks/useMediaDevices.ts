"use client"

import { useState, useEffect, useCallback } from 'react'

export interface DevicePreferences {
  audioDeviceId: string | null
  videoDeviceId: string | null
  isMuted: boolean
  isVideoOff: boolean
}

export interface UseMediaDevicesReturn {
  audioDevices: MediaDeviceInfo[]
  videoDevices: MediaDeviceInfo[]
  selectedAudioDevice: string
  selectedVideoDevice: string
  setSelectedAudioDevice: (id: string) => void
  setSelectedVideoDevice: (id: string) => void
  error: string | null
}

export function useMediaDevices(devicePreferences: DevicePreferences): UseMediaDevicesReturn {
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('')
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function getDevices() {
      try {
        // Need to get permission first to see device labels
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
        stream.getTracks().forEach(track => track.stop())

        const devices = await navigator.mediaDevices.enumerateDevices()
        const audio = devices.filter(d => d.kind === 'audioinput')
        const video = devices.filter(d => d.kind === 'videoinput')

        setAudioDevices(audio)
        setVideoDevices(video)

        // Use stored preference if valid, otherwise first device
        if (audio.length > 0) {
          setSelectedAudioDevice(prev => {
            if (prev) return prev
            const preferred = devicePreferences.audioDeviceId
            const validPreferred = preferred && audio.some(d => d.deviceId === preferred)
            return validPreferred ? preferred : audio[0].deviceId
          })
        }
        if (video.length > 0) {
          setSelectedVideoDevice(prev => {
            if (prev) return prev
            const preferred = devicePreferences.videoDeviceId
            const validPreferred = preferred && video.some(d => d.deviceId === preferred)
            return validPreferred ? preferred : video[0].deviceId
          })
        }
      } catch (err) {
        console.error('Failed to enumerate devices:', err)
        setError('Could not access camera/microphone. Please check permissions.')
      }
    }
    getDevices()
  }, [devicePreferences.audioDeviceId, devicePreferences.videoDeviceId])

  return {
    audioDevices,
    videoDevices,
    selectedAudioDevice,
    selectedVideoDevice,
    setSelectedAudioDevice,
    setSelectedVideoDevice,
    error,
  }
}
