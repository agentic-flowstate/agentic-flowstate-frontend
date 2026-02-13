import { NextRequest, NextResponse } from 'next/server'

const RUST_API_URL = 'http://127.0.0.1:8001'

// PATCH /api/tickets/[ticket_id]/guidance - Update ticket guidance
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ ticket_id: string }> }
) {
  try {
    const params = await context.params
    const { ticket_id } = params
    const organization = request.headers.get('X-Organization') || 'telemetryops'
    const body = await request.json()

    const response = await fetch(
      `${RUST_API_URL}/api/tickets/${encodeURIComponent(ticket_id)}/guidance`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Organization': organization,
          'Cookie': request.headers.get('cookie') || '',
        },
        body: JSON.stringify(body)
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
    console.error('Error updating ticket guidance:', error)
    return NextResponse.json(
      { error: 'Failed to update ticket guidance' },
      { status: 500 }
    )
  }
}
