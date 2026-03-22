import { NextRequest, NextResponse } from 'next/server'

const RUST_API_URL = 'http://127.0.0.1:8001'

export async function GET(request: NextRequest) {
  try {
    const organization = request.headers.get('X-Organization') || 'telemetryops'
    const response = await fetch(`${RUST_API_URL}/api/library/artifacts`, {
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
    console.error('Error listing artifacts:', error)
    return NextResponse.json({ error: 'Failed to list artifacts' }, { status: 500 })
  }
}
