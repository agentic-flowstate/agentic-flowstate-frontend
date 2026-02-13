import { NextRequest, NextResponse } from 'next/server'

const RUST_API_URL = 'http://127.0.0.1:8001'

// GET /api/tickets - List tickets with optional filtering
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const organization = searchParams.get('organization') || request.headers.get('X-Organization') || 'telemetryops'
    const epic_id = searchParams.get('epic_id')
    const slice_id = searchParams.get('slice_id')

    // Build query string for Rust API
    const params = new URLSearchParams()
    if (epic_id) params.set('epic_id', epic_id)
    if (slice_id) params.set('slice_id', slice_id)
    const queryString = params.toString() ? `?${params.toString()}` : ''

    const response = await fetch(`${RUST_API_URL}/api/tickets${queryString}`, {
      headers: {
        'X-Organization': organization,
        'Cookie': request.headers.get('cookie') || '',
      }
    })

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error listing all tickets:', error)
    return NextResponse.json(
      { error: 'Failed to list tickets' },
      { status: 500 }
    )
  }
}
