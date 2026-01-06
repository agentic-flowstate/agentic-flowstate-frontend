import { NextRequest, NextResponse } from 'next/server'

const RUST_API_URL = 'http://127.0.0.1:8001'

// GET /api/epics/[epic_id]/slices/[slice_id]/tickets - List tickets for a slice
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ epic_id: string; slice_id: string }> }
) {
  try {
    const params = await context.params
    const { epic_id, slice_id } = params

    // Call Rust API service
    const response = await fetch(
      `${RUST_API_URL}/api/epics/${encodeURIComponent(epic_id)}/slices/${encodeURIComponent(slice_id)}/tickets`
    )

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error listing tickets:', error)
    return NextResponse.json(
      { error: 'Failed to list tickets' },
      { status: 500 }
    )
  }
}

// POST /api/epics/[epic_id]/slices/[slice_id]/tickets - Create a new ticket
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ epic_id: string; slice_id: string }> }
) {
  try {
    const params = await context.params
    const { epic_id, slice_id } = params
    const body = await request.json()

    // Call Rust API service
    const response = await fetch(
      `${RUST_API_URL}/api/epics/${encodeURIComponent(epic_id)}/slices/${encodeURIComponent(slice_id)}/tickets`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API returned ${response.status}: ${error}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating ticket:', error)
    return NextResponse.json(
      { error: 'Failed to create ticket' },
      { status: 500 }
    )
  }
}
