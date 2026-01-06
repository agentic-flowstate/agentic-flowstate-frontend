"use client"

import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createEpic } from '@/lib/api/tickets'
import { Epic } from '@/lib/types'

interface EpicCreationDialogProps {
  onEpicCreated: (epic: Epic) => void
}

export function EpicCreationDialog({ onEpicCreated }: EpicCreationDialogProps) {
  const [open, setOpen] = useState(false)
  const [epicId, setEpicId] = useState('')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [assignees, setAssignees] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!epicId.trim() || !title.trim()) {
      setError('Epic ID and Title are required')
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      // Parse assignees from comma-separated string
      const assigneesList = assignees.trim()
        ? assignees.split(',').map(a => a.trim()).filter(a => a)
        : undefined

      const newEpic = await createEpic({
        epic_id: epicId.trim(),
        title: title.trim(),
        notes: notes.trim() || undefined,
        assignees: assigneesList,
      })

      onEpicCreated(newEpic)

      // Reset form
      setEpicId('')
      setTitle('')
      setNotes('')
      setAssignees('')
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create epic')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 ml-auto"
          title="Create new epic"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Epic</DialogTitle>
            <DialogDescription>
              Create a new epic to organize your work into slices and tickets.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="epic-id">Epic ID *</Label>
              <Input
                id="epic-id"
                value={epicId}
                onChange={(e) => setEpicId(e.target.value)}
                placeholder="e.g., telemetryops, frontend-v2"
                className="font-mono"
                disabled={isCreating}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., TelemetryOps Platform"
                disabled={isCreating}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional details about this epic..."
                rows={3}
                disabled={isCreating}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="assignees">Assignees (optional)</Label>
              <Input
                id="assignees"
                value={assignees}
                onChange={(e) => setAssignees(e.target.value)}
                placeholder="e.g., Jake Greene, Alex Developer (comma-separated)"
                disabled={isCreating}
              />
            </div>
            {error && (
              <div className="text-sm text-red-500">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create Epic'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}