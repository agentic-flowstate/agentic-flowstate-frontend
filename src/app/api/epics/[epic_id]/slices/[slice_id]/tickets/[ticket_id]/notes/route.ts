import { NextRequest, NextResponse } from 'next/server'

const RUST_API_URL = 'http://127.0.0.1:8001'

// PATCH /api/epics/[epic_id]/slices/[slice_id]/tickets/[ticket_id]/notes - Update ticket notes
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ epic_id: string; slice_id: string; ticket_id: string }> }
) {
  try {
    const params = await context.params
    const { epic_id, slice_id, ticket_id } = params
    const body = await request.json()
    const { notes } = body

    if (notes === undefined) {
      return NextResponse.json(
        { error: 'notes field is required' },
        { status: 400 }
      )
    }

    // Call Rust API service with nested path
    const response = await fetch(
      `${RUST_API_URL}/api/epics/${encodeURIComponent(epic_id)}/slices/${encodeURIComponent(slice_id)}/tickets/${encodeURIComponent(ticket_id)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API returned ${response.status}: ${error}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating ticket notes:', error)
    return NextResponse.json(
      { error: `Failed to update ticket notes: ${error instanceof Error ? error.message : 'unknown error'}` },
      { status: 500 }
    )
  }
}
