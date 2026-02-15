"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

function getApiBaseUrl() {
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return `https://${window.location.hostname}:8443`
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'
}

export interface UserOrganization {
  organization: string
  role: string
}

export interface AuthUser {
  user_id: string
  name: string
  email?: string
  organizations: UserOrganization[]
}

/** Check if user has access to a specific organization */
export function hasOrgAccess(user: AuthUser | null, org: string): boolean {
  if (!user) return false
  return user.organizations.some(o => o.organization === org)
}

/** Check if user is an owner of a specific organization */
export function isOrgOwner(user: AuthUser | null, org: string): boolean {
  if (!user) return false
  return user.organizations.some(o => o.organization === org && o.role === 'owner')
}

/** Check if user has access to the life page (__life org) */
export function hasLifeAccess(user: AuthUser | null): boolean {
  return hasOrgAccess(user, '__life')
}

interface DevicePreferences {
  audioDeviceId: string | null
  videoDeviceId: string | null
  isMuted: boolean
  isVideoOff: boolean
}

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  login: (userId: string, password: string) => Promise<void>
  register: (userId: string, name: string, password: string) => Promise<void>
  logout: () => Promise<void>
  devicePreferences: DevicePreferences
  setDevicePreferences: (prefs: Partial<DevicePreferences>) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const DEVICE_STORAGE_KEY = 'device-preferences'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [devicePreferences, setDevicePreferencesState] = useState<DevicePreferences>({
    audioDeviceId: null,
    videoDeviceId: null,
    isMuted: false,
    isVideoOff: false,
  })

  // On mount: check session via /api/auth/me
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/auth/me`, { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setUser({ user_id: data.user_id, name: data.name, email: data.email, organizations: data.organizations || [] })
        }
      } catch {
        // Not authenticated or server unreachable
      } finally {
        setIsLoading(false)
      }
    }
    checkSession()

    // Hydrate device preferences from localStorage
    const storedDevices = localStorage.getItem(DEVICE_STORAGE_KEY)
    if (storedDevices) {
      try {
        setDevicePreferencesState(JSON.parse(storedDevices))
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, [])

  const fetchMe = useCallback(async (): Promise<AuthUser> => {
    const res = await fetch(`${getApiBaseUrl()}/api/auth/me`, { credentials: 'include' })
    const data = await res.json()
    return { user_id: data.user_id, name: data.name, email: data.email, organizations: data.organizations || [] }
  }, [])

  const login = useCallback(async (userId: string, password: string) => {
    const res = await fetch(`${getApiBaseUrl()}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ user_id: userId, password }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Login failed')
    }
    // Fetch full user with organizations from /me
    const user = await fetchMe()
    setUser(user)
  }, [fetchMe])

  const register = useCallback(async (userId: string, name: string, password: string) => {
    const res = await fetch(`${getApiBaseUrl()}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ user_id: userId, name, password }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Registration failed')
    }
    // Fetch full user with organizations from /me
    const user = await fetchMe()
    setUser(user)
  }, [fetchMe])

  const logout = useCallback(async () => {
    await fetch(`${getApiBaseUrl()}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {})
    setUser(null)
  }, [])

  const setDevicePreferences = useCallback((prefs: Partial<DevicePreferences>) => {
    setDevicePreferencesState(prev => {
      const updated = { ...prev, ...prefs }
      localStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  // Don't render children until session check completes
  if (isLoading) {
    return null
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, devicePreferences, setDevicePreferences }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
