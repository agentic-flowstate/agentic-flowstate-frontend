import { NextRequest, NextResponse } from 'next/server'
import { API_BASE } from '@/lib/api/config'

export async function GET(request: NextRequest) {
  const response = await fetch(`${API_BASE}/api/email-accounts`, {
    headers: { 'Cookie': request.headers.get('cookie') || '' },
  })
  const data = await response.json().catch(() => null)
  return NextResponse.json(data, { status: response.status })
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const response = await fetch(`${API_BASE}/api/email-accounts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': request.headers.get('cookie') || '',
    },
    body,
  })
  const data = await response.json().catch(() => null)
  return NextResponse.json(data, { status: response.status })
}
