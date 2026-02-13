import { NextRequest, NextResponse } from 'next/server'

const RUST_API_URL = 'http://127.0.0.1:8001'

// GET /api/epics/[epic_id]/slices - List slices for an epic
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ epic_id: string }> }
) {
  try {
    const params = await context.params
    const { epic_id } = params
    const organization = request.headers.get('X-Organization') || 'telemetryops'

    // Call Rust API service with organization header
    const response = await fetch(`${RUST_API_URL}/api/epics/${encodeURIComponent(epic_id)}/slices`, {
      headers: {
        'X-Organization': organization,
        'Cookie': request.headers.get('cookie') || '',
      },
    })

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error listing slices:', error)
    return NextResponse.json(
      { error: 'Failed to list slices' },
      { status: 500 }
    )
  }
}