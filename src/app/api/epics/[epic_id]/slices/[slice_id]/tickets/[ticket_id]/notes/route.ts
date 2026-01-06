import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'

// PATCH /api/epics/[epic_id]/slices/[slice_id]/tickets/[ticket_id]/notes - Update ticket notes
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ epic_id: string; slice_id: string; ticket_id: string }> }
) {
  try {
    const params = await context.params
    const { epic_id, slice_id, ticket_id } = params
    const body = await request.json()
    const { notes } = body

    if (notes === undefined) {
      return NextResponse.json(
        { error: 'notes field is required' },
        { status: 400 }
      )
    }

    // Call MCP CLI - use JSON mode to avoid shell escaping issues
    const result = await new Promise<string>((resolve, reject) => {
      const pythonPath = '/opt/homebrew/bin/python3.13'
      const mcpPath = '/Users/jarvisgpt/projects/agentic-flowstate-mcp'

      // Pass all arguments as JSON to avoid shell escaping issues
      const args = {
        epic_id,
        slice_id,
        ticket_id,
        notes: notes || ''
      }

      const child = spawn(pythonPath, [
        '-m', 'mcp_server.cli', 'update_ticket_notes',
        '--json', JSON.stringify(args)
      ], {
        cwd: mcpPath,
        env: { ...process.env, PYTHONPATH: 'src' }
      })

      let stdout = ''
      let stderr = ''

      child.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      child.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      child.on('close', (code) => {
        if (code !== 0) {
          console.error(`CLI error - code: ${code}, stderr: ${stderr}, stdout: ${stdout}`)
          reject(new Error(`Process exited with code ${code}: ${stderr}`))
        } else {
          resolve(stdout)
        }
      })

      child.on('error', (err) => {
        reject(err)
      })
    })

    const response = JSON.parse(result)
    return NextResponse.json(response.ticket)
  } catch (error) {
    console.error('Error updating ticket notes:', error)
    return NextResponse.json(
      { error: `Failed to update ticket notes: ${error instanceof Error ? error.message : 'unknown error'}` },
      { status: 500 }
    )
  }
}