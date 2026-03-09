'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Tenant } from '@/lib/types'
import { useAuth } from './AuthContext'

interface TenantContextType {
  selectedTenant: Tenant | null
  tenantResolved: boolean
  setSelectedTenant: (tenant: Tenant) => void
}

const TenantContext = createContext<TenantContextType | null>(null)

export function TenantProvider({ children }: { children: ReactNode }) {
  const { tenants } = useAuth()
  const [selectedTenant, setSelectedTenantState] = useState<Tenant | null>(null)
  const [tenantResolved, setTenantResolved] = useState(false)

  useEffect(() => {
    if (tenants.length === 0) return
    const stored = localStorage.getItem('trm_tenant_id')
    if (stored) {
      const found = tenants.find(t => t.tenant_id === Number(stored))
      if (found) setSelectedTenantState(found)
    } else if (tenants.length === 1) {
      setSelectedTenantState(tenants[0])
    }
    setTenantResolved(true)
  }, [tenants])

  const setSelectedTenant = (tenant: Tenant) => {
    localStorage.setItem('trm_tenant_id', String(tenant.tenant_id))
    setSelectedTenantState(tenant)
  }

  return (
    <TenantContext.Provider value={{ selectedTenant, tenantResolved, setSelectedTenant }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  const ctx = useContext(TenantContext)
  if (!ctx) throw new Error('useTenant must be used within TenantProvider')
  return ctx
}

export type { TenantContextType }
