'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Tenant, AuthResponse } from '@/lib/types'
import { api } from '@/lib/api'

interface AuthContextType {
  user: User | null
  tenants: Tenant[]
  token: string | null
  loading: boolean
  login: (data: AuthResponse) => void
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('trm_token')
    if (stored && stored !== 'undefined' && stored !== 'null') {
      setToken(stored)
      refreshUser().finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = (data: AuthResponse) => {
    localStorage.removeItem('trm_tenant_id')
    if (data.token) {
      localStorage.setItem('trm_token', data.token)
      setToken(data.token)
    }
    setUser(data.user)
    setTenants(data.tenants ?? [])
    // Refresh to get tenant_parents / tenant_is_parent from /auth/me
    refreshUser().catch(() => {})
  }

  const logout = () => {
    localStorage.removeItem('trm_token')
    localStorage.removeItem('trm_tenant_id')
    localStorage.removeItem('trm_parent_rel_id')
    setToken(null)
    setUser(null)
    setTenants([])
  }

  const refreshUser = async () => {
    try {
      const data = await api.get<{ user: User; tenants: Tenant[] }>('/auth/me')
      setUser(data.user)
      setTenants(data.tenants ?? [])
    } catch {
      logout()
    }
  }

  return (
    <AuthContext.Provider value={{ user, tenants, token, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
