import { NextRequest, NextResponse } from 'next/server'
import { API_BASE } from '@/lib/api/config'

async function proxyRequest(request: NextRequest, params: Promise<{ path: string[] }>) {
  const { path } = await params
  const subPath = path.join('/')
  const url = `${API_BASE}/api/life-planner/${subPath}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cookie': request.headers.get('cookie') || '',
  }

  const body = await request.text()

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body,
  })

  if (!response.ok || !response.body) {
    return NextResponse.json(
      { error: `Upstream returned ${response.status}` },
      { status: response.status }
    )
  }

  // Stream SSE response back
  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context.params)
}
