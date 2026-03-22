'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LayoutGrid, Columns2, Maximize2, Sparkles } from 'lucide-react'
import { LayoutMode } from './types'

const LAYOUT_OPTIONS: Array<{ mode: LayoutMode; label: string; icon: React.ReactNode }> = [
  { mode: 'auto', label: 'Auto', icon: <Sparkles className="h-4 w-4" /> },
  { mode: 'grid', label: 'Grid', icon: <LayoutGrid className="h-4 w-4" /> },
  { mode: 'sidebar', label: 'Sidebar', icon: <Columns2 className="h-4 w-4" /> },
  { mode: 'spotlight', label: 'Spotlight', icon: <Maximize2 className="h-4 w-4" /> },
]

interface LayoutModeSelectorProps {
  value: LayoutMode
  onChange: (mode: LayoutMode) => void
}

export function LayoutModeSelector({ value, onChange }: LayoutModeSelectorProps) {
  const current = LAYOUT_OPTIONS.find((o) => o.mode === value) ?? LAYOUT_OPTIONS[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          {current.icon}
          <span className="text-xs">{current.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LAYOUT_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.mode}
            onClick={() => onChange(option.mode)}
            className={value === option.mode ? 'bg-accent' : ''}
          >
            <span className="mr-2">{option.icon}</span>
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
