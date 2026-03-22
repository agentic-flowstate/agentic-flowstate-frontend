import { NextRequest, NextResponse } from 'next/server'
import { API_BASE } from '@/lib/api/config'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { id } = body as { id: string }

  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  const res = await fetch(`${API_BASE}/api/project-workload/toggle`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: request.headers.get('cookie') || '',
    },
    body: JSON.stringify({ id }),
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to toggle item' }, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json(data)
}
