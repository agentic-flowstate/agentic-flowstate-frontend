"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Loader2, ListChecks, Briefcase, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PlanItem {
  item_id: string
  title: string
  scheduled_time: string | null
  checked: boolean
  is_recurring: boolean
}

interface DailyPlan {
  date: string
  items: PlanItem[]
}

export interface WorkloadItem {
  id: string
  organization: string
  ticket_id: string
  ticket_title: string
  epic_id: string
  slice_id: string
  checked: boolean
  added_at: number
}

const PROJECTS = [
  { org: 'agentic-flowstate', label: 'Agentic Flowstate' },
  { org: 'election-education', label: 'Election Education' },
  { org: 'ballotradar', label: 'BallotRadar' },
  { org: 'telemetryops', label: 'TelemetryOps' },
] as const

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function getTodayDate(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
  return m === 0 ? `${hour}${ampm}` : `${hour}:${String(m).padStart(2, '0')}${ampm}`
}

interface DailyPlanSidebarProps {
  onTicketClick?: (item: WorkloadItem) => void
}

export function DailyPlanSidebar({ onTicketClick }: DailyPlanSidebarProps) {
  const [selectedDate, setSelectedDate] = useState(getTodayDate)
  const [plan, setPlan] = useState<DailyPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [togglingItems, setTogglingItems] = useState<Set<string>>(new Set())
  const [workload, setWorkload] = useState<WorkloadItem[]>([])
  const [pullingOrg, setPullingOrg] = useState<string | null>(null)

  const isToday = selectedDate === getTodayDate()

  const fetchPlan = useCallback(async (date: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/life/daily-plan?date=${date}`)
      if (res.ok) {
        const data: DailyPlan = await res.json()
        setPlan(data)
      }
    } catch (e) {
      console.error('Failed to fetch daily plan:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchWorkload = useCallback(async () => {
    try {
      const res = await fetch('/api/life/project-workload')
      if (res.ok) {
        const data: WorkloadItem[] = await res.json()
        setWorkload(data)
      }
    } catch (e) {
      console.error('Failed to fetch workload:', e)
    }
  }, [])

  useEffect(() => {
    fetchPlan(selectedDate)
  }, [selectedDate, fetchPlan])

  useEffect(() => {
    fetchWorkload()
  }, [fetchWorkload])

  const goBack = () => setSelectedDate(prev => shiftDate(prev, -1))
  const goForward = () => setSelectedDate(prev => shiftDate(prev, 1))
  const goToday = () => setSelectedDate(getTodayDate())

  const toggleItem = async (item: PlanItem) => {
    setTogglingItems(prev => new Set(prev).add(item.item_id))

    setPlan(prev => {
      if (!prev) return prev
      return {
        ...prev,
        items: prev.items.map(i =>
          i.item_id === item.item_id ? { ...i, checked: !i.checked } : i
        )
      }
    })

    try {
      const res = await fetch('/api/life/daily-plan/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: item.item_id, date: selectedDate }),
      })
      if (!res.ok) {
        fetchPlan(selectedDate)
      }
    } catch {
      fetchPlan(selectedDate)
    } finally {
      setTogglingItems(prev => {
        const next = new Set(prev)
        next.delete(item.item_id)
        return next
      })
    }
  }

  const pullTicket = async (org: string) => {
    setPullingOrg(org)
    try {
      const res = await fetch('/api/life/project-workload/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization: org }),
      })
      if (res.ok) {
        const item: WorkloadItem = await res.json()
        setWorkload(prev => [item, ...prev])
      }
    } catch (e) {
      console.error('Failed to pull ticket:', e)
    } finally {
      setPullingOrg(null)
    }
  }

  const toggleWorkloadItem = async (item: WorkloadItem) => {
    setTogglingItems(prev => new Set(prev).add(item.id))
    setWorkload(prev => prev.map(w =>
      w.id === item.id ? { ...w, checked: !w.checked } : w
    ))

    try {
      const res = await fetch('/api/life/project-workload/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      })
      if (!res.ok) {
        fetchWorkload()
      }
    } catch {
      fetchWorkload()
    } finally {
      setTogglingItems(prev => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    }
  }

  // Split into scheduled (has time) and tasks (no time)
  const { scheduledItems, taskItems } = useMemo(() => {
    if (!plan?.items) return { scheduledItems: [], taskItems: [] }
    const scheduled: PlanItem[] = []
    const tasks: PlanItem[] = []
    for (const item of plan.items) {
      if (item.scheduled_time) {
        scheduled.push(item)
      } else {
        tasks.push(item)
      }
    }
    return { scheduledItems: scheduled, taskItems: tasks }
  }, [plan])

  const totalItems = plan?.items?.length || 0
  const totalChecked = plan?.items?.filter(i => i.checked).length || 0

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Date header */}
      <div className="p-3 border-b">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goBack}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <button
            onClick={isToday ? undefined : goToday}
            className={cn(
              "flex items-center gap-1.5 text-sm font-semibold",
              !isToday && "hover:text-primary cursor-pointer"
            )}
            title={isToday ? undefined : "Jump to today"}
          >
            <Calendar className="h-3.5 w-3.5 text-primary" />
            {formatDate(selectedDate)}
          </button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goForward}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {!isToday && (
          <button
            onClick={goToday}
            className="w-full text-center text-[10px] text-primary hover:underline mt-1"
          >
            Back to today
          </button>
        )}
        {totalItems > 0 && (
          <div className="flex items-center justify-end mt-2">
            <span className="text-[10px] text-muted-foreground">
              {totalChecked}/{totalItems}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* Timeline — items with scheduled times */}
          {scheduledItems.length > 0 && (
            <div className="p-2 space-y-0.5">
              {scheduledItems.map((item) => (
                <label
                  key={item.item_id}
                  className={cn(
                    "flex items-start gap-2 px-2 py-1.5 rounded text-xs cursor-pointer hover:bg-accent/50 transition-colors",
                    item.checked && "text-muted-foreground"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => toggleItem(item)}
                    disabled={togglingItems.has(item.item_id)}
                    className="mt-0.5 rounded border-muted-foreground/30"
                  />
                  <div className="flex-1 min-w-0">
                    <span className={cn(item.checked && "line-through opacity-60")}>
                      {item.title}
                    </span>
                  </div>
                  <span className={cn(
                    "text-[10px] tabular-nums whitespace-nowrap mt-0.5",
                    item.checked ? "text-muted-foreground/40" : "text-muted-foreground/70"
                  )}>
                    {formatTime(item.scheduled_time!)}
                  </span>
                </label>
              ))}
            </div>
          )}

          {/* Tasks (anytime) */}
          {taskItems.length > 0 && (
            <div className={cn("p-2 pt-1", scheduledItems.length > 0 && "border-t mt-1")}>
              <div className="flex items-center gap-1.5 px-1 mb-1">
                <ListChecks className="h-2.5 w-2.5 text-muted-foreground/60" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                  Tasks
                </span>
                <div className="flex-1 h-px bg-border/50 ml-1" />
              </div>
              <div className="space-y-0.5 ml-1">
                {taskItems.map((item) => (
                  <label
                    key={item.item_id}
                    className={cn(
                      "flex items-start gap-2 px-2 py-1 rounded text-xs cursor-pointer hover:bg-accent/50 transition-colors",
                      item.checked && "text-muted-foreground"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleItem(item)}
                      disabled={togglingItems.has(item.item_id)}
                      className="mt-0.5 rounded border-muted-foreground/30"
                    />
                    <span className={cn(item.checked && "line-through opacity-60")}>
                      {item.title}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          <div className={cn("p-2 pt-1", (scheduledItems.length > 0 || taskItems.length > 0) && "border-t mt-1")}>
            <div className="flex items-center gap-1.5 px-1 mb-1">
              <Briefcase className="h-2.5 w-2.5 text-muted-foreground/60" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                Projects
              </span>
              <div className="flex-1 h-px bg-border/50 ml-1" />
            </div>
            <div className="space-y-2 ml-1">
              {PROJECTS.map(({ org, label }) => {
                const items = workload.filter(w => w.organization === org)
                return (
                  <div key={org}>
                    <div className="flex items-center gap-1.5 px-1 mb-0.5">
                      <span className="text-[10px] font-medium text-muted-foreground/80">
                        {label}
                      </span>
                      <button
                        onClick={() => pullTicket(org)}
                        disabled={pullingOrg !== null}
                        className="ml-auto p-0.5 rounded hover:bg-accent/50 text-muted-foreground/50 hover:text-muted-foreground transition-colors disabled:opacity-30"
                        title="Pull next ticket"
                      >
                        {pullingOrg === org ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Plus className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                    {items.length > 0 && (
                      <div className="space-y-0.5">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className={cn(
                              "flex items-start gap-2 px-2 py-1 rounded text-xs hover:bg-accent/50 transition-colors",
                              item.checked && "text-muted-foreground"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={item.checked}
                              onChange={() => toggleWorkloadItem(item)}
                              disabled={togglingItems.has(item.id)}
                              className="mt-0.5 rounded border-muted-foreground/30 cursor-pointer"
                            />
                            <button
                              onClick={() => onTicketClick?.(item)}
                              className={cn(
                                "flex-1 min-w-0 text-left cursor-pointer hover:underline",
                                item.checked && "line-through opacity-60"
                              )}
                            >
                              {item.ticket_title}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
