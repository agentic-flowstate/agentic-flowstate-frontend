import { NextRequest, NextResponse } from 'next/server'
import { API_BASE } from '@/lib/api/config'

async function proxyRequest(request: NextRequest, params: Promise<{ path: string[] }>) {
  const { path } = await params
  const subPath = path.join('/')
  const url = `${API_BASE}/api/emails/${subPath}`

  const headers: Record<string, string> = {
    'Cookie': request.headers.get('cookie') || '',
  }

  let body: string | undefined
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    headers['Content-Type'] = 'application/json'
    body = await request.text()
  }

  const response = await fetch(url, {
    method: request.method,
    headers,
    body,
  })

  if (response.status === 204) {
    return new Response(null, { status: 204 })
  }

  const data = await response.json().catch(() => null)
  return NextResponse.json(data, { status: response.status })
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context.params)
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context.params)
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context.params)
}
