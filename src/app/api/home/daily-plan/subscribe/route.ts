import { NextRequest, NextResponse } from 'next/server'
import { API_BASE } from '@/lib/api/config'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') || ''
  const url = date
    ? `${API_BASE}/api/daily-plan/subscribe?date=${date}`
    : `${API_BASE}/api/daily-plan/subscribe`

  const response = await fetch(url, {
    headers: {
      'Accept': 'text/event-stream',
      'Cookie': request.headers.get('cookie') || '',
    },
  })

  if (!response.ok || !response.body) {
    return NextResponse.json(
      { error: `Upstream returned ${response.status}` },
      { status: response.status }
    )
  }

  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
