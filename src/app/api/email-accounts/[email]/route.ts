import { NextRequest, NextResponse } from 'next/server'
import { API_BASE } from '@/lib/api/config'

export async function DELETE(request: NextRequest, context: { params: Promise<{ email: string }> }) {
  const { email } = await context.params
  const response = await fetch(`${API_BASE}/api/email-accounts/${encodeURIComponent(email)}`, {
    method: 'DELETE',
    headers: { 'Cookie': request.headers.get('cookie') || '' },
  })

  if (response.status === 204) {
    return new Response(null, { status: 204 })
  }

  const data = await response.json().catch(() => null)
  return NextResponse.json(data, { status: response.status })
}
