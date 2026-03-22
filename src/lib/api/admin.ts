import { SystemLog } from '@/lib/types'

function getApiBaseUrl() {
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return `https://${window.location.hostname}:8443`
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'
}

export interface FetchLogsParams {
  level?: string
  component?: string
  search?: string
  since?: number
  limit?: number
}

export async function fetchLogs(params: FetchLogsParams = {}): Promise<SystemLog[]> {
  const url = new URL(`${getApiBaseUrl()}/api/admin/logs`)
  if (params.level) url.searchParams.set('level', params.level)
  if (params.component) url.searchParams.set('component', params.component)
  if (params.search) url.searchParams.set('search', params.search)
  if (params.since) url.searchParams.set('since', String(params.since))
  if (params.limit) url.searchParams.set('limit', String(params.limit))

  const res = await fetch(url.toString(), { credentials: 'include' })
  if (res.status === 403) throw new Error('Not authorized')
  if (!res.ok) throw new Error(`Failed to fetch logs: ${res.statusText}`)
  return await res.json()
}

export async function checkAdmin(): Promise<boolean> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/admin/check`, { credentials: 'include' })
    return res.ok
  } catch {
    return false
  }
}
