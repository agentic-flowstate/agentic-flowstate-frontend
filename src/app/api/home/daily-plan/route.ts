import { NextRequest, NextResponse } from 'next/server'
import { API_BASE } from '@/lib/api/config'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')

  if (!date) {
    return NextResponse.json({ error: 'date parameter required' }, { status: 400 })
  }

  const res = await fetch(`${API_BASE}/api/daily-plan?date=${date}`, {
    headers: { Cookie: request.headers.get('cookie') || '' },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch daily plan' }, { status: res.status })
  }

  const plan = await res.json()
  return NextResponse.json(plan)
}
