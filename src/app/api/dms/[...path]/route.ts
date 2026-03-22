import { NextRequest, NextResponse } from 'next/server'
import { API_BASE } from '@/lib/api/config'

async function proxyRequest(request: NextRequest, params: Promise<{ path: string[] }>) {
  const { path } = await params
  const subPath = path.join('/')
  const url = `${API_BASE}/api/dms/${subPath}`

  // SSE subscribe endpoint
  if (subPath === 'subscribe' || subPath.startsWith('subscribe?')) {
    const searchParams = request.nextUrl.searchParams.toString()
    const fullUrl = searchParams ? `${url}?${searchParams}` : url

    const response = await fetch(fullUrl, {
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

  // Attachment download (GET on .../attachments/...)
  if (request.method === 'GET' && subPath.includes('/attachments/')) {
    const response = await fetch(url, {
      headers: {
        'Cookie': request.headers.get('cookie') || '',
      },
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      return new Response(text, { status: response.status })
    }

    const body = await response.arrayBuffer()
    return new Response(body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
        'Content-Disposition': response.headers.get('Content-Disposition') || '',
        'Content-Length': response.headers.get('Content-Length') || '',
      },
    })
  }

  // Regular proxy
  const headers: Record<string, string> = {
    'Cookie': request.headers.get('cookie') || '',
  }

  let body: BodyInit | undefined
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      // Pass multipart through — let browser set boundary in content-type
      const formData = await request.formData()
      body = formData as unknown as BodyInit
    } else {
      headers['Content-Type'] = 'application/json'
      body = await request.text()
    }
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

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context.params)
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context.params)
}
