import { NextRequest, NextResponse } from 'next/server'

const RUST_API_URL = 'http://127.0.0.1:8001'

// GET /api/epics/[epic_id]/slices/[slice_id]/tickets/[ticket_id]/history - Get ticket history
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ epic_id: string; slice_id: string; ticket_id: string }> }
) {
  try {
    const params = await context.params
    const { epic_id, slice_id, ticket_id } = params
    const searchParams = request.nextUrl.searchParams
    const limit = searchParams.get('limit')

    const url = new URL(
      `${RUST_API_URL}/api/epics/${encodeURIComponent(epic_id)}/slices/${encodeURIComponent(slice_id)}/tickets/${encodeURIComponent(ticket_id)}/history`
    )
    if (limit) {
      url.searchParams.set('limit', limit)
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API returned ${response.status}: ${error}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching ticket history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ticket history' },
      { status: 500 }
    )
  }
}
