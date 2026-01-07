import { NextRequest, NextResponse } from 'next/server'

const RUST_API_URL = 'http://127.0.0.1:8001'

// PATCH /api/epics/[epic_id]/slices/[slice_id]/tickets/[ticket_id]/status - Update ticket status
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ epic_id: string; slice_id: string; ticket_id: string }> }
) {
  try {
    const params = await context.params
    const { epic_id, slice_id, ticket_id } = params
    const body = await request.json()

    if (!body.status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      )
    }

    // Call Rust API service with nested path
    const response = await fetch(
      `${RUST_API_URL}/api/epics/${encodeURIComponent(epic_id)}/slices/${encodeURIComponent(slice_id)}/tickets/${encodeURIComponent(ticket_id)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: body.status })
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API returned ${response.status}: ${error}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating ticket status:', error)
    return NextResponse.json(
      { error: 'Failed to update ticket status' },
      { status: 500 }
    )
  }
}
