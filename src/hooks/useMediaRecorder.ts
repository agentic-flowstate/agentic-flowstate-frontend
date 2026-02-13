"use client"

import { useState, useRef, useCallback } from 'react'
import { uploadMeetingAudio } from '@/lib/api/meetings'

export interface UseMediaRecorderReturn {
  isRecording: boolean
  recordingStartTime: number
  startRecording: (localStream: MediaStream) => void
  stopRecording: () => Promise<Blob | null>
  uploadAudio: (roomId: string, speakerName: string) => Promise<boolean>
  downloadAudioBlob: (blob: Blob, filename: string) => void
  getRecordedBlob: () => Blob | null
}

export function useMediaRecorder(): UseMediaRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const recordingStartTimeRef = useRef<number>(0)
  const lastBlobRef = useRef<Blob | null>(null)

  const startRecording = useCallback((localStream: MediaStream) => {
    const audioTracks = localStream.getAudioTracks()
    if (audioTracks.length === 0) return

    const localAudioStream = new MediaStream(audioTracks)

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
        resolve(blob)
      }
      recorder.stop()
      setIsRecording(false)
    })
  }, [])

  const uploadAudio = useCallback(async (roomId: string, speakerName: string): Promise<boolean> => {
    const blob = lastBlobRef.current
    if (!blob || blob.size === 0) return true // Nothing to upload

    try {
      console.log(`Uploading audio for ${speakerName}, size: ${blob.size} bytes`)
      await uploadMeetingAudio(roomId, blob, speakerName, recordingStartTimeRef.current, 'webm')
      console.log(`Audio uploaded for ${speakerName}`)
      return true
    } catch (err) {
      console.error('Audio upload failed:', err)
      throw err
    }
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

  const getRecordedBlob = useCallback(() => lastBlobRef.current, [])

  return {
    isRecording,
    recordingStartTime: recordingStartTimeRef.current,
    startRecording,
    stopRecording,
    uploadAudio,
    downloadAudioBlob,
    getRecordedBlob,
  }
}
