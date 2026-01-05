import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ epicId: string; sliceId: string }> }
) {
  try {
    // @ts-ignore - MCP runtime injected
    if (!global.mcpClient) {
      throw new Error('MCP client not available on server')
    }

    const { epicId, sliceId } = await params

    // @ts-ignore
    const tickets = await global.mcpClient.callTool('mcp__agentic-mcp__list_tickets', {
      epic_id: epicId,
      slice_id: sliceId
    })
    return NextResponse.json(tickets)
  } catch (error) {
    console.error('Error fetching tickets:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch tickets' },
      { status: 500 }
    )
  }
}
