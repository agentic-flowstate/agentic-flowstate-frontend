import { NextRequest, NextResponse } from 'next/server'

const RUST_API_URL = 'http://127.0.0.1:8001'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ document_id: string }> }
) {
  try {
    const { document_id } = await context.params
    const inline = request.nextUrl.searchParams.get('inline')
    const qs = inline === 'true' ? '?inline=true' : ''
    const response = await fetch(
      `${RUST_API_URL}/api/library/documents/${encodeURIComponent(document_id)}/download${qs}`,
      {
        headers: {
          'Cookie': request.headers.get('cookie') || '',
        }
      }
    )

    if (!response.ok) {
      return new NextResponse('Document not found', { status: response.status })
    }

    return new NextResponse(response.body, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
        'Content-Disposition': response.headers.get('Content-Disposition') || 'attachment',
      },
    })
  } catch (error) {
    console.error('Error downloading document:', error)
    return new NextResponse('Failed to download document', { status: 500 })
  }
}
