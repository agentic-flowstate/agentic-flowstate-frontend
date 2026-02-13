import { NextRequest, NextResponse } from 'next/server'

const RUST_API_URL = 'http://127.0.0.1:8001'

// POST /api/tickets/[ticket_id]/pipeline/steps/[step_id]/retry
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ ticket_id: string; step_id: string }> }
) {
  try {
    const params = await context.params
    const { ticket_id, step_id } = params

    const response = await fetch(
      `${RUST_API_URL}/api/tickets/${encodeURIComponent(ticket_id)}/pipeline/steps/${encodeURIComponent(step_id)}/retry`,
      {
        method: 'POST',
        headers: {
          'Cookie': request.headers.get('cookie') || '',
        },
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData.error || `API returned ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error retrying pipeline step:', error)
    return NextResponse.json(
      { error: 'Failed to retry pipeline step' },
      { status: 500 }
    )
  }
}
