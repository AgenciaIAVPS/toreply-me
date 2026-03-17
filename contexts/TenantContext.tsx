'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Tenant, TenantRelationship } from '@/lib/types'
import { useAuth } from './AuthContext'

interface TenantContextType {
  selectedTenant: Tenant | null
  tenantResolved: boolean
  setSelectedTenant: (tenant: Tenant) => void
  selectedParent: TenantRelationship | null
  parentResolved: boolean
  setSelectedParent: (rel: TenantRelationship) => void
  isSubTenant: boolean
}

const TenantContext = createContext<TenantContextType | null>(null)

export function TenantProvider({ children }: { children: ReactNode }) {
  const { tenants, loading } = useAuth()
  const [selectedTenant, setSelectedTenantState] = useState<Tenant | null>(null)
  const [tenantResolved, setTenantResolved] = useState(false)
  const [selectedParent, setSelectedParentState] = useState<TenantRelationship | null>(null)
  const [parentResolved, setParentResolved] = useState(false)

  // Resolve tenant from localStorage or auto-select if only one
  useEffect(() => {
    if (loading) return
    setSelectedTenantState(null)
    setSelectedParentState(null)
    setParentResolved(false)
    if (!tenants || tenants.length === 0) {
      setTenantResolved(true)
      setParentResolved(true)
      return
    }
    const stored = localStorage.getItem('trm_tenant_id')
    if (stored) {
      const found = tenants.find(t => t.tenant_id === Number(stored))
      if (found) setSelectedTenantState(found)
    } else if (tenants.length === 1) {
      setSelectedTenantState(tenants[0])
    }
    setTenantResolved(true)
  }, [tenants, loading])

  // Resolve parent when tenant changes
  useEffect(() => {
    if (!tenantResolved) return
    setSelectedParentState(null)
    setParentResolved(false)

    if (!selectedTenant || selectedTenant.tenant_parents.length === 0) {
      setParentResolved(true)
      return
    }

    // Auto-select if only one parent
    if (selectedTenant.tenant_parents.length === 1) {
      setSelectedParentState(selectedTenant.tenant_parents[0])
      setParentResolved(true)
      return
    }

    // Restore from localStorage when multiple parents exist
    const storedRelId = localStorage.getItem('trm_parent_rel_id')
    if (storedRelId) {
      const found = selectedTenant.tenant_parents.find(p => p.rel_id === storedRelId)
      if (found) setSelectedParentState(found)
    }
    setParentResolved(true)
  }, [selectedTenant, tenantResolved])

  const setSelectedTenant = (tenant: Tenant) => {
    localStorage.setItem('trm_tenant_id', String(tenant.tenant_id))
    localStorage.removeItem('trm_parent_rel_id')
    setSelectedTenantState(tenant)
  }

  const setSelectedParent = (rel: TenantRelationship) => {
    localStorage.setItem('trm_parent_rel_id', rel.rel_id)
    setSelectedParentState(rel)
  }

  const isSubTenant = !!(selectedTenant && selectedTenant.tenant_parents.length > 0)

  return (
    <TenantContext.Provider value={{
      selectedTenant,
      tenantResolved,
      setSelectedTenant,
      selectedParent,
      parentResolved,
      setSelectedParent,
      isSubTenant,
    }}>
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
