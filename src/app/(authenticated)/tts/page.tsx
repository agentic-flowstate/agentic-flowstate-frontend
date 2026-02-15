'use client'

import { useState, useRef, useEffect } from 'react'
import { Volume2, Download, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { generateSpeech, TTS_VOICES, MAX_TTS_LENGTH, type TtsRequest } from '@/lib/api/tts'

export default function TtsPage() {
  const [text, setText] = useState('')
  const [voice, setVoice] = useState<string>('alloy')
  const [loading, setLoading] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const audioBlobRef = useRef<Blob | null>(null)

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  async function handleSubmit() {
    setLoading(true)
    setError(null)

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
    }

    try {
      setLoadingStatus('Preparing transcript...')
      const blob = await generateSpeech({
        text,
        voice: voice as TtsRequest['voice'],
      })
      audioBlobRef.current = blob
      setAudioUrl(URL.createObjectURL(blob))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate speech')
    } finally {
      setLoading(false)
    }
  }

  function handleDownload() {
    if (!audioBlobRef.current) return
    const url = URL.createObjectURL(audioBlobRef.current)
    const a = document.createElement('a')
    a.href = url
    a.download = 'speech.mp3'
    a.click()
    URL.revokeObjectURL(url)
  }

  const charCount = text.length
  const overLimit = charCount > MAX_TTS_LENGTH
  const canSubmit = text.trim().length > 0 && !overLimit && !loading

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-8 space-y-6">
        <div className="flex items-center gap-3">
          <Volume2 className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Text to Speech</h1>
        </div>

        <Card className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tts-text">Text</Label>
            <Textarea
              id="tts-text"
              placeholder="Paste or type text here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={loading}
              className="min-h-[200px] resize-y"
            />
            <p className={`text-xs ${overLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
              {charCount.toLocaleString()} / {MAX_TTS_LENGTH.toLocaleString()} characters
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="space-y-2">
              <Label>Voice</Label>
              <Select value={voice} onValueChange={setVoice} disabled={loading}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TTS_VOICES.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1" />

            <Button onClick={handleSubmit} disabled={!canSubmit} className="mt-auto">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {loadingStatus}
                </>
              ) : (
                'Generate Speech'
              )}
            </Button>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </Card>

        {audioUrl && (
          <Card className="p-6 space-y-4">
            <audio controls src={audioUrl} className="w-full" />
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download MP3
            </Button>
          </Card>
        )}
      </div>
    </div>
  )
}
