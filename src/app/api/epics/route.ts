import { NextRequest, NextResponse } from 'next/server'

const API_URL = 'http://127.0.0.1:8001'

// GET /api/epics - List all epics
export async function GET(request: NextRequest) {
  try {
    // Call API server endpoint
    const response = await fetch(`${API_URL}/api/epics`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
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
    console.error('Error listing epics:', error)
    return NextResponse.json(
      { error: 'Failed to list epics' },
      { status: 500 }
    )
  }
}

// POST /api/epics - Create new epic
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Call API server endpoint
    const response = await fetch(`${API_URL}/api/epics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(data.error)
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating epic:', error)
    return NextResponse.json(
      { error: 'Failed to create epic' },
      { status: 500 }
    )
  }
}