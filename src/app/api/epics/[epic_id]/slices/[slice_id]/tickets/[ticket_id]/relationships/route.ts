import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'

// POST /api/epics/[epic_id]/slices/[slice_id]/tickets/[ticket_id]/relationships - Add relationship
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ epic_id: string; slice_id: string; ticket_id: string }> }
) {
  try {
    const params = await context.params
    const { epic_id, slice_id, ticket_id } = params
    const body = await request.json()

    if (!body.relationship_type || !body.target_ticket_id) {
      return NextResponse.json(
        { error: 'relationship_type and target_ticket_id are required' },
        { status: 400 }
      )
    }

    // Call MCP CLI
    const result = await new Promise<string>((resolve, reject) => {
      const pythonPath = '/opt/homebrew/bin/python3.13'
      const mcpPath = '/Users/jarvisgpt/projects/agentic-flowstate-mcp'

      const child = spawn(pythonPath, [
        '-m', 'mcp_server.cli', 'add_ticket_relationship',
        '--epic_id', epic_id,
        '--slice_id', slice_id,
        '--ticket_id', ticket_id,
        '--relationship_type', body.relationship_type,
        '--target_ticket_id', body.target_ticket_id
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

    const ticket = JSON.parse(result)
    return NextResponse.json(ticket)
  } catch (error) {
    console.error('Error adding relationship:', error)
    return NextResponse.json(
      { error: 'Failed to add relationship' },
      { status: 500 }
    )
  }
}

// DELETE /api/epics/[epic_id]/slices/[slice_id]/tickets/[ticket_id]/relationships - Remove relationship
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ epic_id: string; slice_id: string; ticket_id: string }> }
) {
  try {
    const params = await context.params
    const { epic_id, slice_id, ticket_id } = params
    const body = await request.json()

    if (!body.relationship_type || !body.target_ticket_id) {
      return NextResponse.json(
        { error: 'relationship_type and target_ticket_id are required' },
        { status: 400 }
      )
    }

    // Call MCP CLI
    const result = await new Promise<string>((resolve, reject) => {
      const pythonPath = '/opt/homebrew/bin/python3.13'
      const mcpPath = '/Users/jarvisgpt/projects/agentic-flowstate-mcp'

      const child = spawn(pythonPath, [
        '-m', 'mcp_server.cli', 'remove_ticket_relationship',
        '--epic_id', epic_id,
        '--slice_id', slice_id,
        '--ticket_id', ticket_id,
        '--relationship_type', body.relationship_type,
        '--target_ticket_id', body.target_ticket_id
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

    const ticket = JSON.parse(result)
    return NextResponse.json(ticket)
  } catch (error) {
    console.error('Error removing relationship:', error)
    return NextResponse.json(
      { error: 'Failed to remove relationship' },
      { status: 500 }
    )
  }
}