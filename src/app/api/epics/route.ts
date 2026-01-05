import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // @ts-ignore - MCP runtime injected
    if (!global.mcpClient) {
      throw new Error('MCP client not available on server')
    }

    // @ts-ignore
    const epics = await global.mcpClient.callTool('mcp__agentic-mcp__list_epics', {})
    return NextResponse.json(epics)
  } catch (error) {
    console.error('Error fetching epics:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch epics' },
      { status: 500 }
    )
  }
}
