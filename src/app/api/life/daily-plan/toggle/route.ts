import { NextRequest, NextResponse } from 'next/server'
import { API_BASE } from '@/lib/api/config'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { item_id, date } = body as { item_id: string; date: string }

  if (!item_id || !date) {
    return NextResponse.json({ error: 'item_id and date parameters required' }, { status: 400 })
  }

  const res = await fetch(`${API_BASE}/api/daily-plan/toggle`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: request.headers.get('cookie') || '',
    },
    body: JSON.stringify({ item_id, date }),
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to toggle item' }, { status: res.status })
  }

  const result = await res.json()
  return NextResponse.json(result)
}
