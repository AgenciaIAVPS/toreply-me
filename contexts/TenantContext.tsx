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
  setParentSelf: () => void
  parentIsSelf: boolean
  isSubTenant: boolean
}

const TenantContext = createContext<TenantContextType | null>(null)

export function TenantProvider({ children }: { children: ReactNode }) {
  const { tenants, loading } = useAuth()
  const [selectedTenant, setSelectedTenantState] = useState<Tenant | null>(null)
  const [tenantResolved, setTenantResolved] = useState(false)
  const [selectedParent, setSelectedParentState] = useState<TenantRelationship | null>(null)
  const [parentResolved, setParentResolved] = useState(false)
  const [parentIsSelf, setParentIsSelf] = useState(false)

  // Resolve tenant from localStorage or auto-select if only one
  useEffect(() => {
    if (loading) return
    setSelectedTenantState(null)
    setSelectedParentState(null)
    setParentResolved(false)
    setParentIsSelf(false)
    if (!tenants || tenants.length === 0) {
      setTenantResolved(true)
      setParentResolved(true)
      return
    }
    const stored = localStorage.getItem('trm_tenant_id')
    let resolved: Tenant | null = null
    if (stored) {
      const found = tenants.find(t => t.tenant_id === Number(stored))
      if (found) resolved = found
    } else if (tenants.length === 1) {
      resolved = tenants[0]
    }
    if (resolved) {
      setSelectedTenantState(resolved)
    } else {
      setParentResolved(true)
    }
    setTenantResolved(true)
  }, [tenants, loading])

  // Resolve parent when tenant changes
  useEffect(() => {
    if (!tenantResolved) return
    setSelectedParentState(null)
    setParentIsSelf(false)
    setParentResolved(false)

    if (!selectedTenant || !selectedTenant.tenant_parents?.length) {
      setParentResolved(true)
      return
    }

    // Check localStorage first
    const storedRelId = localStorage.getItem('trm_parent_rel_id')

    if (storedRelId === 'self') {
      // User explicitly chose to work as their own tenant (no parent context)
      setSelectedParentState(null)
      setParentIsSelf(true)
      setParentResolved(true)
      return
    }

    if (storedRelId) {
      const found = selectedTenant.tenant_parents.find(p => p.rel_id === storedRelId)
      if (found) {
        setSelectedParentState(found)
        setParentResolved(true)
        return
      }
    }

    // No stored choice → resolved but no parent selected → layout redirects to /select-parent
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
    setParentIsSelf(false)
  }

  const setParentSelf = () => {
    localStorage.setItem('trm_parent_rel_id', 'self')
    setSelectedParentState(null)
    setParentIsSelf(true)
  }

  const isSubTenant = !!(selectedTenant && (selectedTenant.tenant_parents?.length ?? 0) > 0)

  return (
    <TenantContext.Provider value={{
      selectedTenant,
      tenantResolved,
      setSelectedTenant,
      selectedParent,
      parentResolved,
      setSelectedParent,
      setParentSelf,
      parentIsSelf,
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
