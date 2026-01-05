import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'

// GET /api/epics/[epic_id]/slices/[slice_id]/tickets - List tickets for a slice
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ epic_id: string; slice_id: string }> }
) {
  try {
    const params = await context.params
    const { epic_id, slice_id } = params

    // Call MCP CLI
    const result = await new Promise<string>((resolve, reject) => {
      const pythonPath = '/opt/homebrew/bin/python3.13'
      const mcpPath = '/Users/jarvisgpt/projects/agentic-flowstate-mcp'

      const child = spawn(pythonPath, [
        '-m', 'mcp_server.cli', 'list_tickets',
        '--epic_id', epic_id,
        '--slice_id', slice_id
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

    const tickets = JSON.parse(result)
    return NextResponse.json(tickets)
  } catch (error) {
    console.error('Error listing tickets:', error)
    return NextResponse.json(
      { error: 'Failed to list tickets' },
      { status: 500 }
    )
  }
}

// POST /api/epics/[epic_id]/slices/[slice_id]/tickets - Create a new ticket
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ epic_id: string; slice_id: string }> }
) {
  try {
    const params = await context.params
    const { epic_id, slice_id } = params
    const body = await request.json()

    // Call MCP CLI
    const result = await new Promise<string>((resolve, reject) => {
      const pythonPath = '/opt/homebrew/bin/python3.13'
      const mcpPath = '/Users/jarvisgpt/projects/agentic-flowstate-mcp'

      const args = [
        '-m', 'mcp_server.cli', 'create_ticket',
        '--epic_id', epic_id,
        '--slice_id', slice_id,
        '--title', body.title,
        '--intent', body.intent
      ]

      if (body.notes) {
        args.push('--notes', body.notes)
      }
      if (body.type) {
        args.push('--type', body.type)
      }

      const child = spawn(pythonPath, args, {
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

    const ticket = JSON.parse(result)
    return NextResponse.json(ticket)
  } catch (error) {
    console.error('Error creating ticket:', error)
    return NextResponse.json(
      { error: 'Failed to create ticket' },
      { status: 500 }
    )
  }
}