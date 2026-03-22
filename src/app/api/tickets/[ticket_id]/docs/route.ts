import { NextRequest, NextResponse } from 'next/server'

const RUST_API_URL = 'http://127.0.0.1:8001'

// GET /api/tickets/[ticket_id]/docs - List artifact summaries for a ticket
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ ticket_id: string }> }
) {
  try {
    const params = await context.params
    const { ticket_id } = params

    const response = await fetch(
      `${RUST_API_URL}/api/tickets/${encodeURIComponent(ticket_id)}/docs`,
      {
        headers: {
          'Cookie': request.headers.get('cookie') || '',
        }
      }
    )

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
      return NextResponse.json(body, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching ticket docs:', error)
    return NextResponse.json({ error: 'Failed to fetch ticket docs' }, { status: 500 })
  }
}
