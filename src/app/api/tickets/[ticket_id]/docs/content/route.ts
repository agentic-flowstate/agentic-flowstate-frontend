import { NextRequest, NextResponse } from 'next/server'

const RUST_API_URL = 'http://127.0.0.1:8001'

// GET /api/tickets/[ticket_id]/docs/content?path=<path> - Serve document content
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ ticket_id: string }> }
) {
  try {
    const params = await context.params
    const { ticket_id } = params
    const path = request.nextUrl.searchParams.get('path')

    if (!path) {
      return NextResponse.json({ error: 'path parameter is required' }, { status: 400 })
    }

    const response = await fetch(
      `${RUST_API_URL}/api/tickets/${encodeURIComponent(ticket_id)}/docs/content?path=${encodeURIComponent(path)}`,
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

    const content = await response.text()
    return new NextResponse(content, {
      status: 200,
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    })
  } catch (error) {
    console.error('Error fetching document content:', error)
    return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 })
  }
}
