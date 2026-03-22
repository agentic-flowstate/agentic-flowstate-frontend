import { NextRequest, NextResponse } from 'next/server'

const RUST_API_URL = 'http://127.0.0.1:8001'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ artifact_id: string }> }
) {
  try {
    const { artifact_id } = await context.params
    const response = await fetch(
      `${RUST_API_URL}/api/library/artifacts/${encodeURIComponent(artifact_id)}`,
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
    console.error('Error getting artifact:', error)
    return NextResponse.json({ error: 'Failed to get artifact' }, { status: 500 })
  }
}
