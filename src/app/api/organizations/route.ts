import { NextResponse } from 'next/server'

const RUST_API_URL = 'http://127.0.0.1:8001'

// GET /api/organizations - List all unique organizations
export async function GET() {
  try {
    // Get all epics (without org filter) and extract unique organizations
    const response = await fetch(`${RUST_API_URL}/api/epics`)

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`)
    }

    const epics = await response.json()

    // Extract unique organizations from epics
    const orgs = new Set<string>()
    for (const epic of epics) {
      if (epic.organization) {
        orgs.add(epic.organization)
      }
    }

    // Sort alphabetically
    const sortedOrgs = Array.from(orgs).sort()

    return NextResponse.json(sortedOrgs)
  } catch (error) {
    console.error('Error listing organizations:', error)
    return NextResponse.json(
      { error: 'Failed to list organizations' },
      { status: 500 }
    )
  }
}
