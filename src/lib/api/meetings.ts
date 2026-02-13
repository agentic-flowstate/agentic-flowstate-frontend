/**
 * Meetings API - Video call with transcription
 */

import { API_BASE } from '@/lib/api/config'

export function getApiBaseUrl() {
  // If page is loaded over HTTPS, use the TLS proxy on port 8443
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return `https://${window.location.hostname}:8443`
  }
  return API_BASE
}

function getWsBaseUrl() {
  // If page is loaded over HTTPS, we must use WSS via the TLS proxy on port 8443
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return `wss://${window.location.hostname}:8443`
  }
  // Convert http(s) to ws(s)
  return API_BASE.replace(/^http/, 'ws')
}

// ============================================================================
// Types
// ============================================================================

export interface Meeting {
  room_id: string
  title?: string
  host_user_id?: string
  status: 'waiting' | 'active' | 'ended'
  started_at?: string
  ended_at?: string
  transcript_session_id?: string
  meeting_notes?: string
  processing_status: 'none' | 'transcribing' | 'extracting_notes' | 'completed' | 'failed'
  is_favorited: boolean
  created_at: number
  updated_at: number
}

export interface CreateMeetingRequest {
  room_id: string
  title?: string
  host_user_id?: string
}

export interface TranscribeRequest {
  audio_data: string // base64
  format: string
  language?: string
}

export interface TranscriptionResponse {
  text: string
  duration_seconds?: number
}

// Signaling message types
export type SignalingMessage =
  | { type: 'join'; room_id: string; user_id: string }
  | { type: 'leave'; room_id: string; user_id: string }
  | { type: 'offer'; room_id: string; from_user: string; to_user: string; sdp: string }
  | { type: 'answer'; room_id: string; from_user: string; to_user: string; sdp: string }
  | { type: 'ice_candidate'; room_id: string; from_user: string; to_user: string; candidate: string }
  | { type: 'user_joined'; room_id: string; user_id: string }
  | { type: 'user_left'; room_id: string; user_id: string }
  | { type: 'room_users'; room_id: string; users: string[] }
  | { type: 'error'; message: string }

// ============================================================================
// HTTP API
// ============================================================================

export async function listMeetings(activeOnly = false): Promise<Meeting[]> {
  const url = new URL(`${getApiBaseUrl()}/api/meetings`)
  if (activeOnly) {
    url.searchParams.set('active_only', 'true')
  }
  const response = await fetch(url.toString(), { credentials: 'include' })
  if (!response.ok) throw new Error(`Failed to list meetings: ${response.statusText}`)
  const data = await response.json()
  return data.meetings
}

export async function createMeeting(req: CreateMeetingRequest): Promise<Meeting> {
  const response = await fetch(`${getApiBaseUrl()}/api/meetings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(req),
  })
  if (!response.ok) throw new Error(`Failed to create meeting: ${response.statusText}`)
  return response.json()
}

export async function getMeeting(roomId: string): Promise<Meeting> {
  const response = await fetch(`${getApiBaseUrl()}/api/meetings/${encodeURIComponent(roomId)}`, { credentials: 'include' })
  if (!response.ok) throw new Error(`Failed to get meeting: ${response.statusText}`)
  return response.json()
}

export async function startMeeting(roomId: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/api/meetings/${encodeURIComponent(roomId)}/start`, {
    method: 'POST',
    credentials: 'include',
  })
  if (!response.ok) throw new Error(`Failed to start meeting: ${response.statusText}`)
}

export async function endMeeting(roomId: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/api/meetings/${encodeURIComponent(roomId)}/end`, {
    method: 'POST',
    credentials: 'include',
  })
  if (!response.ok) throw new Error(`Failed to end meeting: ${response.statusText}`)
}

export async function deleteMeeting(roomId: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/api/meetings/${encodeURIComponent(roomId)}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!response.ok) throw new Error(`Failed to delete meeting: ${response.statusText}`)
}

export async function updateMeeting(roomId: string, updates: { title?: string }): Promise<Meeting> {
  const response = await fetch(`${getApiBaseUrl()}/api/meetings/${encodeURIComponent(roomId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(updates),
  })
  if (!response.ok) throw new Error(`Failed to update meeting: ${response.statusText}`)
  return response.json()
}

export async function toggleMeetingFavorite(roomId: string): Promise<{ is_favorited: boolean }> {
  const response = await fetch(`${getApiBaseUrl()}/api/meetings/${encodeURIComponent(roomId)}/favorite`, {
    method: 'POST',
    credentials: 'include',
  })
  if (!response.ok) throw new Error(`Failed to toggle favorite: ${response.statusText}`)
  return response.json()
}

export async function transcribeMeeting(
  roomId: string,
  audioBlob: Blob,
  format: string = 'webm'
): Promise<TranscriptionResponse> {
  // Convert blob to base64
  const arrayBuffer = await audioBlob.arrayBuffer()
  const base64 = arrayBufferToBase64(arrayBuffer)

  const response = await fetch(`${getApiBaseUrl()}/api/meetings/${encodeURIComponent(roomId)}/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      audio_data: base64,
      format,
      language: 'en',
    } as TranscribeRequest),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Transcription failed: ${error}`)
  }

  return response.json()
}

export interface UploadAudioRequest {
  audio_data: string // base64
  format: string
  username: string
  start_time: number // Unix timestamp in ms when recording started
}

/**
 * Convert ArrayBuffer to base64 safely for large files
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Upload a participant's audio segment for later transcription
 */
export async function uploadMeetingAudio(
  roomId: string,
  audioBlob: Blob,
  username: string,
  startTime: number,
  format: string = 'webm'
): Promise<void> {
  const arrayBuffer = await audioBlob.arrayBuffer()
  const base64 = arrayBufferToBase64(arrayBuffer)

  const response = await fetch(`${getApiBaseUrl()}/api/meetings/${encodeURIComponent(roomId)}/audio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      audio_data: base64,
      format,
      username,
      start_time: startTime,
    } as UploadAudioRequest),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Audio upload failed: ${error}`)
  }
}

/**
 * Trigger transcription of all audio segments for a meeting
 */
export async function finalizeMeetingTranscript(roomId: string): Promise<TranscriptionResponse> {
  const response = await fetch(`${getApiBaseUrl()}/api/meetings/${encodeURIComponent(roomId)}/finalize-transcript`, {
    method: 'POST',
    credentials: 'include',
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Finalize transcript failed: ${error}`)
  }

  return response.json()
}

// ============================================================================
// WebSocket Signaling
// ============================================================================

export class SignalingClient {
  private ws: WebSocket | null = null
  private messageHandlers: ((msg: SignalingMessage) => void)[] = []

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`${getWsBaseUrl()}/api/meetings/signaling`)

      this.ws.onopen = () => {
        console.log('Signaling WebSocket connected')
        resolve()
      }

      this.ws.onerror = (error) => {
        console.error('Signaling WebSocket error:', error)
        reject(error)
      }

      this.ws.onmessage = (event) => {
        try {
          const msg: SignalingMessage = JSON.parse(event.data)
          this.messageHandlers.forEach((handler) => handler(msg))
        } catch (e) {
          console.error('Failed to parse signaling message:', e)
        }
      }

      this.ws.onclose = () => {
        console.log('Signaling WebSocket closed')
      }
    })
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  send(msg: SignalingMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    } else {
      console.error('WebSocket not connected')
    }
  }

  onMessage(handler: (msg: SignalingMessage) => void): () => void {
    this.messageHandlers.push(handler)
    return () => {
      this.messageHandlers = this.messageHandlers.filter((h) => h !== handler)
    }
  }

  joinRoom(roomId: string, userId: string): void {
    this.send({ type: 'join', room_id: roomId, user_id: userId })
  }

  leaveRoom(roomId: string, userId: string): void {
    this.send({ type: 'leave', room_id: roomId, user_id: userId })
  }

  sendOffer(roomId: string, fromUser: string, toUser: string, sdp: string): void {
    this.send({ type: 'offer', room_id: roomId, from_user: fromUser, to_user: toUser, sdp })
  }

  sendAnswer(roomId: string, fromUser: string, toUser: string, sdp: string): void {
    this.send({ type: 'answer', room_id: roomId, from_user: fromUser, to_user: toUser, sdp })
  }

  sendIceCandidate(roomId: string, fromUser: string, toUser: string, candidate: string): void {
    this.send({ type: 'ice_candidate', room_id: roomId, from_user: fromUser, to_user: toUser, candidate })
  }
}

// ============================================================================
// Utility: Generate room ID
// ============================================================================

export function generateRoomId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
