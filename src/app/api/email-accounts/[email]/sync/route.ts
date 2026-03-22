import { NextRequest, NextResponse } from 'next/server'
import { API_BASE } from '@/lib/api/config'

export async function POST(request: NextRequest, context: { params: Promise<{ email: string }> }) {
  const { email } = await context.params
  const response = await fetch(`${API_BASE}/api/email-accounts/${encodeURIComponent(email)}/sync`, {
    method: 'POST',
    headers: { 'Cookie': request.headers.get('cookie') || '' },
  })
  const data = await response.json().catch(() => null)
  return NextResponse.json(data, { status: response.status })
}
