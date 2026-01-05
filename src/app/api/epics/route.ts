import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'

// GET /api/epics - List all epics
export async function GET(request: NextRequest) {
  try {
    // Extract organization context from headers
    const organization = request.headers.get('X-Organization') || 'telemetryops'
    console.log(`[API] Fetching epics for organization: ${organization}`)

    // Call MCP CLI (org context will be used in future)
    const result = await new Promise<string>((resolve, reject) => {
      const pythonPath = '/opt/homebrew/bin/python3.13'
      const mcpPath = '/Users/jarvisgpt/projects/agentic-flowstate-mcp'

      const child = spawn(pythonPath, ['-m', 'mcp_server.cli', 'list_epics'], {
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

    const epics = JSON.parse(result)
    return NextResponse.json({ epics })
  } catch (error) {
    console.error('Error listing epics:', error)
    return NextResponse.json(
      { error: 'Failed to list epics' },
      { status: 500 }
    )
  }
}

// POST /api/epics - Create new epic
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Call MCP CLI with JSON arguments
    const result = await new Promise<string>((resolve, reject) => {
      const pythonPath = '/opt/homebrew/bin/python3.13'
      const mcpPath = '/Users/jarvisgpt/projects/agentic-flowstate-mcp'

      const args = ['-m', 'mcp_server.cli', 'create_epic', '--json', JSON.stringify(body)]

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

    const epic = JSON.parse(result)
    return NextResponse.json({ epic }, { status: 201 })
  } catch (error) {
    console.error('Error creating epic:', error)
    return NextResponse.json(
      { error: 'Failed to create epic' },
      { status: 500 }
    )
  }
}
