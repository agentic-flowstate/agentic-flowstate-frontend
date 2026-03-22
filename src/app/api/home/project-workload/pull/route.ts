import { NextRequest, NextResponse } from 'next/server'
import { API_BASE } from '@/lib/api/config'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { organization } = body as { organization: string }

  if (!organization) {
    return NextResponse.json({ error: 'organization required' }, { status: 400 })
  }

  const res = await fetch(`${API_BASE}/api/project-workload/pull`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: request.headers.get('cookie') || '',
    },
    body: JSON.stringify({ organization }),
  })

  if (!res.ok) {
    const text = await res.text()
    return NextResponse.json({ error: text || 'Failed to pull ticket' }, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json(data)
}
