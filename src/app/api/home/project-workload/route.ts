import { NextRequest, NextResponse } from 'next/server'
import { API_BASE } from '@/lib/api/config'

export async function GET(request: NextRequest) {
  const res = await fetch(`${API_BASE}/api/project-workload`, {
    headers: { Cookie: request.headers.get('cookie') || '' },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch workload' }, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  const { id } = await request.json() as { id: string }

  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  const res = await fetch(`${API_BASE}/api/project-workload/${id}`, {
    method: 'DELETE',
    headers: { Cookie: request.headers.get('cookie') || '' },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to remove item' }, { status: res.status })
  }

  return new NextResponse(null, { status: 204 })
}
