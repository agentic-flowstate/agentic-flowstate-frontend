import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'

// GET /api/epics/[epic_id]/slices - List slices for an epic
export async function GET(
  request: NextRequest,
  { params }: { params: { epic_id: string } }
) {
  try {
    const { epic_id } = params

    // Call MCP CLI
    const result = await new Promise<string>((resolve, reject) => {
      const pythonPath = '/opt/homebrew/bin/python3.13'
      const mcpPath = '/Users/jarvisgpt/projects/agentic-flowstate-mcp'

      const child = spawn(pythonPath, [
        '-m', 'mcp_server.cli', 'list_slices',
        '--epic_id', epic_id
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

    const slices = JSON.parse(result)
    return NextResponse.json(slices)
  } catch (error) {
    console.error('Error listing slices:', error)
    return NextResponse.json(
      { error: 'Failed to list slices' },
      { status: 500 }
    )
  }
}