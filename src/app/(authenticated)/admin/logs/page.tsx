"use client"

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, isAdmin } from '@/contexts/auth-context'
import { fetchLogs, type FetchLogsParams } from '@/lib/api/admin'
import type { SystemLog } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RefreshCw, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const LEVELS = ['all', 'error', 'warn', 'info']
const COMPONENTS = ['all', 'agent', 'email', 'api', 'auth', 'db', 'frontend']
const TIME_RANGES = [
  { label: 'Last hour', value: '3600' },
  { label: 'Last 6 hours', value: '21600' },
  { label: 'Last 24 hours', value: '86400' },
  { label: 'Last 7 days', value: '604800' },
  { label: 'All time', value: '0' },
]

function levelColor(level: string) {
  switch (level) {
    case 'error': return 'bg-red-500/15 text-red-400 border-red-500/30'
    case 'warn': return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
    case 'info': return 'bg-blue-500/15 text-blue-400 border-blue-500/30'
    default: return 'bg-muted text-muted-foreground'
  }
}

function componentColor(component: string) {
  switch (component) {
    case 'agent': return 'bg-purple-500/15 text-purple-400 border-purple-500/30'
    case 'email': return 'bg-green-500/15 text-green-400 border-green-500/30'
    case 'auth': return 'bg-orange-500/15 text-orange-400 border-orange-500/30'
    case 'api': return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
    case 'db': return 'bg-pink-500/15 text-pink-400 border-pink-500/30'
    case 'frontend': return 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
    default: return 'bg-muted text-muted-foreground'
  }
}

export default function AdminLogsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [logs, setLogs] = useState<SystemLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const [level, setLevel] = useState('all')
  const [component, setComponent] = useState('all')
  const [timeRange, setTimeRange] = useState('86400')
  const [search, setSearch] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (user && !isAdmin(user)) {
      router.replace('/workspace')
    }
  }, [user, router])

  const loadLogs = useCallback(async () => {
    try {
      const params: FetchLogsParams = { limit: 200 }
      if (level !== 'all') params.level = level
      if (component !== 'all') params.component = component
      if (search.trim()) params.search = search.trim()
      const tr = Number(timeRange)
      if (tr > 0) params.since = Math.floor(Date.now() / 1000) - tr

      const data = await fetchLogs(params)
      setLogs(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load logs')
    } finally {
      setLoading(false)
    }
  }, [level, component, search, timeRange])

  useEffect(() => {
    setLoading(true)
    loadLogs()
  }, [loadLogs])

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(loadLogs, 10000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [autoRefresh, loadLogs])

  if (!user || !isAdmin(user)) return null

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Filter bar */}
      <div className="shrink-0 border-b border-border bg-background/50 backdrop-blur-sm px-4 py-3">
        <div className="flex items-end gap-3 flex-wrap">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground block">Severity</label>
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              value={level}
              onChange={e => setLevel(e.target.value)}
            >
              {LEVELS.map(l => (
                <option key={l} value={l}>{l === 'all' ? 'All levels' : l}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground block">Component</label>
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              value={component}
              onChange={e => setComponent(e.target.value)}
            >
              {COMPONENTS.map(c => (
                <option key={c} value={c}>{c === 'all' ? 'All' : c}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground block">Time range</label>
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              value={timeRange}
              onChange={e => setTimeRange(e.target.value)}
            >
              {TIME_RANGES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1 flex-1 min-w-[180px]">
            <label className="text-xs text-muted-foreground block">Search</label>
            <Input
              className="h-8 text-xs"
              placeholder="Search messages..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={loadLogs}>
              <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setAutoRefresh(prev => !prev)}
            >
              {autoRefresh ? 'Auto: ON' : 'Auto: OFF'}
            </Button>
          </div>
        </div>
      </div>

      {/* Log table */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="p-4 text-sm text-red-400">{error}</div>
        )}

        {!error && logs.length === 0 && !loading && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No logs found for the selected filters.
          </div>
        )}

        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-background border-b border-border">
            <tr className="text-left text-muted-foreground">
              <th className="px-4 py-2 w-8"></th>
              <th className="px-4 py-2 w-[160px]">Timestamp</th>
              <th className="px-4 py-2 w-[70px]">Level</th>
              <th className="px-4 py-2 w-[90px]">Component</th>
              <th className="px-4 py-2">Message</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => {
              const isExpanded = expandedId === log.id
              const hasDetail = !!(log.detail || log.user_id || log.session_id)
              return (
                <tr
                  key={log.id}
                  className={cn(
                    "border-b border-border/50 hover:bg-accent/30 cursor-pointer transition-colors",
                    isExpanded && "bg-accent/20"
                  )}
                  onClick={() => hasDetail && setExpandedId(isExpanded ? null : log.id)}
                >
                  <td className="px-4 py-2 text-muted-foreground">
                    {hasDetail ? (
                      isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
                    ) : null}
                  </td>
                  <td className="px-4 py-2 font-mono text-muted-foreground whitespace-nowrap">
                    {log.created_at_iso}
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", levelColor(log.level))}>
                      {log.level}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", componentColor(log.component))}>
                      {log.component}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">
                    <div className="truncate max-w-[600px]">{log.message}</div>
                    {isExpanded && (
                      <div className="mt-2 space-y-1 text-muted-foreground" onClick={e => e.stopPropagation()}>
                        {log.detail && (
                          <pre className="whitespace-pre-wrap break-all bg-muted/50 rounded p-2 text-[11px] max-h-[200px] overflow-y-auto">
                            {log.detail}
                          </pre>
                        )}
                        {log.user_id && (
                          <div><span className="text-muted-foreground/70">user:</span> {log.user_id}</div>
                        )}
                        {log.session_id && (
                          <div><span className="text-muted-foreground/70">session:</span> <span className="font-mono">{log.session_id}</span></div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Status bar */}
      <div className="shrink-0 border-t border-border px-4 py-1.5 text-[10px] text-muted-foreground flex items-center justify-between bg-background/50">
        <span>{logs.length} log{logs.length !== 1 ? 's' : ''}</span>
        {autoRefresh && <span className="animate-pulse">Auto-refreshing every 10s</span>}
      </div>
    </div>
  )
}
