import { NextRequest } from 'next/server'
import { API_BASE } from '@/lib/api/config'

export async function POST(request: NextRequest) {
  const body = await request.text()

  const response = await fetch(`${API_BASE}/api/tts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': request.headers.get('cookie') || '',
    },
    body,
  })

  if (!response.ok) {
    const errorText = await response.text()
    return new Response(errorText, { status: response.status })
  }

  return new Response(response.body, {
    status: 200,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Disposition': response.headers.get('Content-Disposition') || 'inline',
    },
  })
}
