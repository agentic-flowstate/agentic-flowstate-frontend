import { NextRequest, NextResponse } from 'next/server'

const RUST_API_URL = 'http://127.0.0.1:8001'

// GET /api/epics/[epic_id]/tickets - List ALL tickets for an epic (across all slices)
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ epic_id: string }> }
) {
  try {
    const params = await context.params
    const { epic_id } = params

    // Call Rust API service to get all tickets for the epic
    const response = await fetch(
      `${RUST_API_URL}/api/epics/${encodeURIComponent(epic_id)}/tickets`
    )

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error listing all tickets for epic:', error)
    return NextResponse.json(
      { error: 'Failed to list tickets' },
      { status: 500 }
    )
  }
}