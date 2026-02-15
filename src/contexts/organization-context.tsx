"use client"

import React, { createContext, useContext, useState, useMemo, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'

export type OrganizationId = string

export interface Organization {
  id: OrganizationId
  name: string
  displayName: string
  role: string
}

// Display name mappings for known organizations
const DISPLAY_NAMES: Record<string, string> = {
  'telemetryops': 'TelemetryOps',
  'ballotradar': 'BallotRadar',
  'agentic-flowstate': 'Agentic Flowstate',
  'devops': 'DevOps',
  'election-education-group': 'Election Education Group',
}

function toDisplayName(id: string): string {
  if (DISPLAY_NAMES[id]) return DISPLAY_NAMES[id]
  // Convert kebab-case to Title Case
  return id.split('-').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
}

interface OrganizationContextValue {
  organizations: Organization[]
  selectedOrg: Organization | null
  selectOrg: (org: Organization) => void
  loading: boolean
}

const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined)

const STORAGE_KEY = 'selected-organization'

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)

  // Derive organizations from user.organizations (excludes __life, which is a virtual org)
  const organizations = useMemo<Organization[]>(() => {
    if (!user?.organizations) return []
    return user.organizations
      .filter(o => o.organization !== '__life')
      .map(o => ({
        id: o.organization,
        name: o.organization,
        displayName: toDisplayName(o.organization),
        role: o.role,
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName))
  }, [user?.organizations])

  // Select org from localStorage or default to first
  useEffect(() => {
    if (organizations.length === 0) return

    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const org = organizations.find(o => o.id === stored)
      if (org) {
        setSelectedOrg(org)
        return
      }
    }
    setSelectedOrg(organizations[0])
  }, [organizations])

  const selectOrg = (org: Organization) => {
    setSelectedOrg(org)
    localStorage.setItem(STORAGE_KEY, org.id)
  }

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        selectedOrg,
        selectOrg,
        loading: false
      }}
    >
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider')
  }
  return context
}
