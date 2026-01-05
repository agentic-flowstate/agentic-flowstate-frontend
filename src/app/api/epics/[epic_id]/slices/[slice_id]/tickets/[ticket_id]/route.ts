import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'

// GET /api/epics/[epic_id]/slices/[slice_id]/tickets/[ticket_id] - Get a single ticket
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ epic_id: string; slice_id: string; ticket_id: string }> }
) {
  try {
    const params = await context.params
    const { epic_id, slice_id, ticket_id } = params

    // Call MCP CLI
    const result = await new Promise<string>((resolve, reject) => {
      const pythonPath = '/opt/homebrew/bin/python3.13'
      const mcpPath = '/Users/jarvisgpt/projects/agentic-flowstate-mcp'

      const child = spawn(pythonPath, [
        '-m', 'mcp_server.cli', 'get_ticket',
        '--epic_id', epic_id,
        '--slice_id', slice_id,
        '--ticket_id', ticket_id
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
          if (stderr.includes('not found')) {
            reject(new Error('404'))
          } else {
            reject(new Error(`Process exited with code ${code}: ${stderr}`))
          }
        } else {
          resolve(stdout)
        }
      })

      child.on('error', (err) => {
        reject(err)
      })
    })

    const ticket = JSON.parse(result)
    return NextResponse.json(ticket)
  } catch (error: any) {
    if (error.message === '404') {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }
    console.error('Error getting ticket:', error)
    return NextResponse.json(
      { error: 'Failed to get ticket' },
      { status: 500 }
    )
  }
}

// DELETE /api/epics/[epic_id]/slices/[slice_id]/tickets/[ticket_id] - Delete a ticket
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ epic_id: string; slice_id: string; ticket_id: string }> }
) {
  try {
    const params = await context.params
    const { epic_id, slice_id, ticket_id } = params

    // Call MCP CLI
    await new Promise<string>((resolve, reject) => {
      const pythonPath = '/opt/homebrew/bin/python3.13'
      const mcpPath = '/Users/jarvisgpt/projects/agentic-flowstate-mcp'

      const child = spawn(pythonPath, [
        '-m', 'mcp_server.cli', 'delete_ticket',
        '--epic_id', epic_id,
        '--slice_id', slice_id,
        '--ticket_id', ticket_id
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
          reject(new Error(`Process exited with code ${code}: ${stderr}`))
        } else {
          resolve(stdout)
        }
      })

      child.on('error', (err) => {
        reject(err)
      })
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting ticket:', error)
    return NextResponse.json(
      { error: 'Failed to delete ticket' },
      { status: 500 }
    )
  }
}