"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'

export type OrganizationId = string

export interface Organization {
  id: OrganizationId
  name: string
  displayName: string
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
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch organizations from API on mount
  useEffect(() => {
    async function fetchOrganizations() {
      try {
        const response = await fetch('/api/organizations')
        if (response.ok) {
          let orgIds: string[] = await response.json()
          // Restrict agentic-flowstate org to alex
          if (user?.user_id !== 'alex') {
            orgIds = orgIds.filter(id => id !== 'agentic-flowstate')
          }
          const orgs: Organization[] = orgIds.map(id => ({
            id,
            name: id,
            displayName: toDisplayName(id)
          }))
          setOrganizations(orgs)

          // Load selected org from localStorage
          const stored = localStorage.getItem(STORAGE_KEY)
          if (stored) {
            const org = orgs.find(o => o.id === stored)
            if (org) {
              setSelectedOrg(org)
            } else if (orgs.length > 0) {
              setSelectedOrg(orgs[0])
            }
          } else if (orgs.length > 0) {
            setSelectedOrg(orgs[0])
          }
        }
      } catch (error) {
        console.error('Failed to fetch organizations:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchOrganizations()
  }, [user?.user_id])

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
        loading
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
