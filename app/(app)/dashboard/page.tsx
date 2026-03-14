'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, Users, Zap } from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuth()
  const { selectedTenant } = useTenant()
  const isAdmin = selectedTenant?.tenant_user_role === 'admin'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Olá, {user?.user_name?.split(' ')[0]}!</h1>
        <p className="text-muted-foreground text-sm">
          {selectedTenant ? `Tenant: ${selectedTenant.tenant_name}` : 'Bem-vindo ao toreply.me'}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversas</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">Total de conversas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">Usuários ativos</p>
          </CardContent>
        </Card>
        {isAdmin && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Créditos</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {selectedTenant ? `R$ ${selectedTenant.tenant_credits?.toFixed(2) ?? '0,00'}` : '—'}
              </div>
              <p className="text-xs text-muted-foreground">Saldo disponível</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
