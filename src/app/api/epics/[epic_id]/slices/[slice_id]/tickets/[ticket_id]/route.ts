import { NextRequest, NextResponse } from 'next/server'

const RUST_API_URL = 'http://127.0.0.1:8001'

// GET /api/epics/[epic_id]/slices/[slice_id]/tickets/[ticket_id] - Get a single ticket
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ epic_id: string; slice_id: string; ticket_id: string }> }
) {
  try {
    const params = await context.params
    const { epic_id, slice_id, ticket_id } = params
    const organization = request.headers.get('X-Organization') || 'telemetryops'

    // Call Rust API service with nested path
    const response = await fetch(
      `${RUST_API_URL}/api/epics/${encodeURIComponent(epic_id)}/slices/${encodeURIComponent(slice_id)}/tickets/${encodeURIComponent(ticket_id)}`,
      {
        headers: {
          'X-Organization': organization,
          'Cookie': request.headers.get('cookie') || '',
        }
      }
    )

    if (response.status === 404) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error getting ticket:', error)
    return NextResponse.json(
      { error: 'Failed to get ticket' },
      { status: 500 }
    )
  }
}

// DELETE /api/epics/[epic_id]/slices/[slice_id]/tickets/[ticket_id] - Delete a ticket
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ epic_id: string; slice_id: string; ticket_id: string }> }
) {
  try {
    const params = await context.params
    const { epic_id, slice_id, ticket_id } = params

    const organization = request.headers.get('X-Organization') || 'telemetryops'

    // Call Rust API service with nested path
    const response = await fetch(
      `${RUST_API_URL}/api/epics/${encodeURIComponent(epic_id)}/slices/${encodeURIComponent(slice_id)}/tickets/${encodeURIComponent(ticket_id)}`,
      {
        method: 'DELETE',
        headers: {
          'X-Organization': organization,
          'Cookie': request.headers.get('cookie') || '',
        }
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API returned ${response.status}: ${error}`)
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting ticket:', error)
    return NextResponse.json(
      { error: 'Failed to delete ticket' },
      { status: 500 }
    )
  }
}
