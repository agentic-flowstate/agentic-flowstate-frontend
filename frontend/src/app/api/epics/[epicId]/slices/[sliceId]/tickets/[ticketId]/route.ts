import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { epicId: string; sliceId: string; ticketId: string } }
) {
  try {
    // @ts-ignore - MCP runtime injected
    if (!global.mcpClient) {
      throw new Error('MCP client not available on server')
    }

    const { epicId, sliceId, ticketId } = params

    // @ts-ignore
    const ticket = await global.mcpClient.callTool('mcp__agentic-mcp__get_ticket', {
      epic_id: epicId,
      slice_id: sliceId,
      ticket_id: ticketId
    })
    return NextResponse.json(ticket)
  } catch (error) {
    console.error('Error fetching ticket:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch ticket' },
      { status: 404 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { epicId: string; sliceId: string; ticketId: string } }
) {
  try {
    // @ts-ignore - MCP runtime injected
    if (!global.mcpClient) {
      throw new Error('MCP client not available on server')
    }

    const { epicId, sliceId, ticketId } = params

    // @ts-ignore
    await global.mcpClient.callTool('mcp__agentic-mcp__delete_ticket', {
      epic_id: epicId,
      slice_id: sliceId,
      ticket_id: ticketId
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting ticket:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete ticket' },
      { status: 500 }
    )
  }
}
