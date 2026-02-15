export interface TtsRequest {
  text: string
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
  response_format?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav'
}

export const TTS_VOICES = [
  { id: 'alloy', label: 'Alloy', description: 'Neutral and balanced' },
  { id: 'echo', label: 'Echo', description: 'Warm and clear' },
  { id: 'fable', label: 'Fable', description: 'Expressive and dynamic' },
  { id: 'onyx', label: 'Onyx', description: 'Deep and authoritative' },
  { id: 'nova', label: 'Nova', description: 'Friendly and upbeat' },
  { id: 'shimmer', label: 'Shimmer', description: 'Soft and gentle' },
] as const

export const MAX_TTS_LENGTH = 16000

export async function generateSpeech(req: TtsRequest): Promise<Blob> {
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(req),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(error || 'Failed to generate speech')
  }

  return response.blob()
}
