import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { epicId: string } }
) {
  try {
    // @ts-ignore - MCP runtime injected
    if (!global.mcpClient) {
      throw new Error('MCP client not available on server')
    }

    const { epicId } = params

    // @ts-ignore
    const slices = await global.mcpClient.callTool('mcp__agentic-mcp__list_slices', {
      epic_id: epicId
    })
    return NextResponse.json(slices)
  } catch (error) {
    console.error('Error fetching slices:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch slices' },
      { status: 500 }
    )
  }
}
