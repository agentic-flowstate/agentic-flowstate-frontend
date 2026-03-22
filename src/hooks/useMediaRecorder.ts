"use client"

import { useState, useRef, useCallback } from 'react'
import { uploadMeetingAudio } from '@/lib/api/meetings'

interface AudioSegment {
  blob: Blob
  startTime: number
}

export interface UseMediaRecorderReturn {
  isRecording: boolean
  recordingStartTime: number
  segmentCount: number
  startRecording: (localStream: MediaStream) => void
  stopRecording: () => Promise<Blob | null>
  uploadAllSegments: (roomId: string, speakerName: string) => Promise<boolean>
  downloadAudioBlob: (blob: Blob, filename: string) => void
  getRecordedBlob: () => Blob | null
  hasSegments: () => boolean
}

export function useMediaRecorder(): UseMediaRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [segmentCount, setSegmentCount] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const recordingStartTimeRef = useRef<number>(0)
  const lastBlobRef = useRef<Blob | null>(null)
  const segmentsRef = useRef<AudioSegment[]>([])

  const startRecording = useCallback((localStream: MediaStream) => {
    const audioTracks = localStream.getAudioTracks()
    if (audioTracks.length === 0) return

    // Stop any existing recorder before starting a new one
    const existing = mediaRecorderRef.current
    if (existing && (existing.state === 'recording' || existing.state === 'paused')) {
      existing.stop()
    }

    const localAudioStream = new MediaStream(audioTracks)
    recordedChunksRef.current = []

    const mediaRecorder = new MediaRecorder(localAudioStream, {
      mimeType: 'audio/webm;codecs=opus',
    })

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data)
      }
    }

    recordingStartTimeRef.current = Date.now()
    mediaRecorder.start(1000)
    mediaRecorderRef.current = mediaRecorder
    setIsRecording(true)
  }, [])

  const stopRecording = useCallback((): Promise<Blob | null> => {
    const recorder = mediaRecorderRef.current
    if (!recorder || (recorder.state !== 'recording' && recorder.state !== 'paused')) {
      return Promise.resolve(null)
    }

    return new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' })
        lastBlobRef.current = blob

        if (blob.size > 0) {
          segmentsRef.current.push({
            blob,
            startTime: recordingStartTimeRef.current,
          })
          setSegmentCount(segmentsRef.current.length)
        }

        recordedChunksRef.current = []
        resolve(blob)
      }
      recorder.stop()
      setIsRecording(false)
    })
  }, [])

  const uploadAllSegments = useCallback(async (roomId: string, speakerName: string): Promise<boolean> => {
    const segments = segmentsRef.current
    if (segments.length === 0) return true

    for (const segment of segments) {
      if (segment.blob.size === 0) continue
      console.log(`Uploading segment for ${speakerName}, startTime: ${segment.startTime}, size: ${segment.blob.size} bytes`)
      await uploadMeetingAudio(roomId, segment.blob, speakerName, segment.startTime, 'webm')
    }

    console.log(`All ${segments.length} segment(s) uploaded for ${speakerName}`)
    return true
  }, [])

  const downloadAudioBlob = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [])

  const getRecordedBlob = useCallback(() => {
    // Return in-progress blob if actively recording, otherwise last completed
    if (recordedChunksRef.current.length > 0) {
      return new Blob(recordedChunksRef.current, { type: 'audio/webm' })
    }
    return lastBlobRef.current
  }, [])

  const hasSegments = useCallback(() => segmentsRef.current.length > 0, [])

  return {
    isRecording,
    recordingStartTime: recordingStartTimeRef.current,
    segmentCount,
    startRecording,
    stopRecording,
    uploadAllSegments,
    downloadAudioBlob,
    getRecordedBlob,
    hasSegments,
  }
}
