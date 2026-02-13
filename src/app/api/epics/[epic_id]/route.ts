import { NextRequest, NextResponse } from 'next/server'

const API_URL = 'http://127.0.0.1:8001'

// GET /api/epics/[epic_id] - Get epic details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ epic_id: string }> }
) {
  try {
    const { epic_id } = await params
    const organization = request.headers.get('X-Organization') || 'telemetryops'

    // Call API server endpoint
    const response = await fetch(`${API_URL}/api/epics/${epic_id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Organization': organization,
        'Cookie': request.headers.get('cookie') || '',
      }
    })

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(data.error)
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error getting epic:', error)
    return NextResponse.json(
      { error: 'Failed to get epic' },
      { status: 500 }
    )
  }
}

// DELETE /api/epics/[epic_id] - Delete an epic
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ epic_id: string }> }
) {
  try {
    const { epic_id } = await params
    const organization = request.headers.get('X-Organization') || 'telemetryops'

    // Call API server endpoint
    const response = await fetch(`${API_URL}/api/epics/${epic_id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Organization': organization,
        'Cookie': request.headers.get('cookie') || '',
      }
    })

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(data.error)
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error deleting epic:', error)
    return NextResponse.json(
      { error: 'Failed to delete epic' },
      { status: 500 }
    )
  }
}