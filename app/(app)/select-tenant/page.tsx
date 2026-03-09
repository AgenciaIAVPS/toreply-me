'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { Tenant } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2 } from 'lucide-react'

export default function SelectTenantPage() {
  const router = useRouter()
  const { tenants } = useAuth()
  const { setSelectedTenant } = useTenant()

  const handleSelect = (tenant: Tenant) => {
    setSelectedTenant(tenant)
    router.push('/dashboard')
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">Selecionar empresa</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Você está vinculado a mais de uma empresa. Selecione qual deseja acessar.
        </p>
      </div>
      <div className="space-y-3">
        {tenants.map(tenant => (
          <Card
            key={tenant.tenant_id}
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => handleSelect(tenant)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{tenant.tenant_name}</CardTitle>
                  <CardDescription className="text-xs">
                    {tenant.tenant_user_role === 'admin' ? 'Administrador' : 'Usuário'}
                    {tenant.tenant_is_master && ' · Master'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  )
}
