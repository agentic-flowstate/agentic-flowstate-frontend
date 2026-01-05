"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'

export type OrganizationId = 'telemetryops' | 'ballotradar'

export interface Organization {
  id: OrganizationId
  name: string
  displayName: string
}

const ORGANIZATIONS: Organization[] = [
  {
    id: 'telemetryops',
    name: 'telemetryops',
    displayName: 'TelemetryOps'
  },
  {
    id: 'ballotradar',
    name: 'ballotradar',
    displayName: 'BallotRadar'
  }
]

interface OrganizationContextValue {
  organizations: Organization[]
  selectedOrg: Organization | null
  selectOrg: (org: Organization) => void
}

const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined)

const STORAGE_KEY = 'selected-organization'

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const org = ORGANIZATIONS.find(o => o.id === stored)
      if (org) {
        setSelectedOrg(org)
      }
    } else {
      // Default to first org if nothing stored
      setSelectedOrg(ORGANIZATIONS[0])
    }
  }, [])

  const selectOrg = (org: Organization) => {
    setSelectedOrg(org)
    localStorage.setItem(STORAGE_KEY, org.id)
  }

  return (
    <OrganizationContext.Provider
      value={{
        organizations: ORGANIZATIONS,
        selectedOrg,
        selectOrg
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