import { NextRequest, NextResponse } from 'next/server'
import { API_BASE } from '@/lib/api/config'

// GET /api/emails - List emails (proxied to backend)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams.toString()
  const url = searchParams ? `${API_BASE}/api/emails?${searchParams}` : `${API_BASE}/api/emails`

  const response = await fetch(url, {
    headers: { 'Cookie': request.headers.get('cookie') || '' },
  })

  const data = await response.json().catch(() => null)
  return NextResponse.json(data, { status: response.status })
}
