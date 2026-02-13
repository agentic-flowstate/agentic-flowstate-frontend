import { NextRequest, NextResponse } from 'next/server'

const RUST_API_URL = 'http://127.0.0.1:8001'

// POST /api/epics/[epic_id]/slices/[slice_id]/tickets/[ticket_id]/relationships - Add relationship
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ epic_id: string; slice_id: string; ticket_id: string }> }
) {
  try {
    const params = await context.params
    const { epic_id, slice_id, ticket_id } = params
    const body = await request.json()

    if (!body.relationship_type || !body.target_ticket_id) {
      return NextResponse.json(
        { error: 'relationship_type and target_ticket_id are required' },
        { status: 400 }
      )
    }

    const organization = request.headers.get('X-Organization') || 'telemetryops'

    // Call Rust API service with nested path
    const response = await fetch(
      `${RUST_API_URL}/api/epics/${encodeURIComponent(epic_id)}/slices/${encodeURIComponent(slice_id)}/tickets/${encodeURIComponent(ticket_id)}/relationships`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Organization': organization,
          'Cookie': request.headers.get('cookie') || '',
        },
        body: JSON.stringify({
          relationship_type: body.relationship_type,
          target_ticket_id: body.target_ticket_id
        })
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API returned ${response.status}: ${error}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error adding relationship:', error)
    return NextResponse.json(
      { error: 'Failed to add relationship' },
      { status: 500 }
    )
  }
}

// DELETE /api/epics/[epic_id]/slices/[slice_id]/tickets/[ticket_id]/relationships - Remove relationship
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ epic_id: string; slice_id: string; ticket_id: string }> }
) {
  try {
    const params = await context.params
    const { epic_id, slice_id, ticket_id } = params
    const body = await request.json()

    if (!body.relationship_type || !body.target_ticket_id) {
      return NextResponse.json(
        { error: 'relationship_type and target_ticket_id are required' },
        { status: 400 }
      )
    }

    const organization = request.headers.get('X-Organization') || 'telemetryops'

    // Call Rust API service with nested path
    const response = await fetch(
      `${RUST_API_URL}/api/epics/${encodeURIComponent(epic_id)}/slices/${encodeURIComponent(slice_id)}/tickets/${encodeURIComponent(ticket_id)}/relationships`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Organization': organization,
          'Cookie': request.headers.get('cookie') || '',
        },
        body: JSON.stringify({
          relationship_type: body.relationship_type,
          target_ticket_id: body.target_ticket_id
        })
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API returned ${response.status}: ${error}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error removing relationship:', error)
    return NextResponse.json(
      { error: 'Failed to remove relationship' },
      { status: 500 }
    )
  }
}
