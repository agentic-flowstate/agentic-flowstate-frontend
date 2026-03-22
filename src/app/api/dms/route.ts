import { NextRequest, NextResponse } from 'next/server'
import { API_BASE } from '@/lib/api/config'

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${API_BASE}/api/dms`, {
      headers: { 'Cookie': request.headers.get('cookie') || '' },
    })
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error listing DMs:', error)
    return NextResponse.json({ error: 'Failed to list DMs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const response = await fetch(`${API_BASE}/api/dms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
      body: JSON.stringify(body),
    })
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error creating DM:', error)
    return NextResponse.json({ error: 'Failed to create DM' }, { status: 500 })
  }
}
