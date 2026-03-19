'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Zap } from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuth()
  const { selectedTenant, selectedParent, isSubTenant, parentResolved } = useTenant()
  const showCredits = selectedTenant?.tenant_user_role !== 'normal'

  const [userCount, setUserCount] = useState<number | null>(null)
  const [credits, setCredits] = useState<number | null>(null)

  // Fetch real user count
  useEffect(() => {
    if (!selectedTenant) return
    api.get<{ users: unknown[] }>(`/users-list?tenant_id=${selectedTenant.tenant_id}`)
      .then(r => setUserCount(Array.isArray(r.users) ? r.users.length : 0))
      .catch(() => setUserCount(null))
  }, [selectedTenant])

  // Fetch credits (fresh from API, respects parent context)
  useEffect(() => {
    if (!showCredits || !selectedTenant || !parentResolved) return
    const url = isSubTenant && selectedParent
      ? `/credits/balance?rel_id=${selectedParent.rel_id}`
      : `/credits/balance?tenant_id=${selectedTenant.tenant_id}`
    api.get<{ balance: number }>(url)
      .then(r => setCredits(typeof r.balance === 'number' ? r.balance : null))
      .catch(() => setCredits(null))
  }, [selectedTenant, selectedParent, isSubTenant, showCredits, parentResolved])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Olá, {user?.user_name?.split(' ')[0]}!</h1>
        <p className="text-muted-foreground text-sm">
          {selectedTenant ? `Tenant: ${selectedTenant.tenant_name}` : 'Bem-vindo ao toreply.me'}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userCount === null ? '—' : userCount}</div>
            <p className="text-xs text-muted-foreground">Usuários ativos</p>
          </CardContent>
        </Card>

        {showCredits && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Créditos</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {credits === null
                  ? '—'
                  : `R$ ${credits.toFixed(2).replace('.', ',')}`}
              </div>
              <p className="text-xs text-muted-foreground">
                {isSubTenant && selectedParent
                  ? `Saldo com ${selectedParent.rel_parent_tenant_name}`
                  : 'Saldo disponível'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
