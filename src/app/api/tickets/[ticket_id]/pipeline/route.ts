import { NextRequest, NextResponse } from 'next/server'

const RUST_API_URL = 'http://127.0.0.1:8001'

// GET /api/tickets/[ticket_id]/pipeline - Get pipeline for a ticket
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ ticket_id: string }> }
) {
  try {
    const params = await context.params
    const { ticket_id } = params

    const response = await fetch(
      `${RUST_API_URL}/api/tickets/${encodeURIComponent(ticket_id)}/pipeline`,
      {
        headers: {
          'Cookie': request.headers.get('cookie') || '',
        },
      }
    )

    if (response.status === 404) {
      return NextResponse.json(
        { error: 'Pipeline not found' },
        { status: 404 }
      )
    }

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`)
    }

    const data = await response.json()
    // Rust API returns { pipeline: {...} }, unwrap it
    return NextResponse.json(data.pipeline || data)
  } catch (error) {
    console.error('Error getting ticket pipeline:', error)
    return NextResponse.json(
      { error: 'Failed to get pipeline' },
      { status: 500 }
    )
  }
}
