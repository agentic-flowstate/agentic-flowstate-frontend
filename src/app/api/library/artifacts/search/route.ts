import { NextRequest, NextResponse } from 'next/server'

const RUST_API_URL = 'http://127.0.0.1:8001'

export async function GET(request: NextRequest) {
  try {
    const organization = request.headers.get('X-Organization') || 'telemetryops'
    const q = request.nextUrl.searchParams.get('q') || ''
    const response = await fetch(`${RUST_API_URL}/api/library/artifacts/search?q=${encodeURIComponent(q)}`, {
      headers: {
        'X-Organization': organization,
        'Cookie': request.headers.get('cookie') || '',
      }
    })

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
      return NextResponse.json(body, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error searching artifacts:', error)
    return NextResponse.json({ error: 'Failed to search artifacts' }, { status: 500 })
  }
}
