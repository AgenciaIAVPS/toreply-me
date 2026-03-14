'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { TopMenu } from '@/components/layout/TopMenu'
import { Loader2 } from 'lucide-react'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, tenants, loading } = useAuth()
  const { selectedTenant, tenantResolved } = useTenant()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.push('/login')
      return
    }
    if (!tenantResolved) return
    if (tenants.length === 0 && pathname !== '/onboarding') {
      router.push('/onboarding')
      return
    }
    if (!selectedTenant && tenants.length > 1 && pathname !== '/select-tenant') {
      router.push('/select-tenant')
    }
  }, [user, loading, tenantResolved, selectedTenant, tenants, pathname, router])

  if (loading || !tenantResolved) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-background">
      <TopMenu />
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
