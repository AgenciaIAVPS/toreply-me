'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTenant } from '@/contexts/TenantContext'
import { TenantRelationship } from '@/lib/types'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2 } from 'lucide-react'
import Image from 'next/image'

export default function SelectParentPage() {
  const router = useRouter()
  const { selectedTenant, setSelectedParent, setParentSelf } = useTenant()
  const [cacheKey] = useState(() => Date.now())

  const parents = selectedTenant?.tenant_parents ?? []

  const handleSelect = (rel: TenantRelationship) => {
    setSelectedParent(rel)
    router.push('/dashboard')
  }

  const handleSelf = () => {
    setParentSelf()
    router.push('/dashboard')
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">Selecionar contexto</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Esta empresa está vinculada a um ou mais parceiros. Selecione o contexto de acesso.
        </p>
      </div>
      <div className="space-y-3">
        {/* Option: work as own tenant (independent) */}
        <Card
          className="cursor-pointer hover:border-primary transition-colors border-dashed"
          onClick={handleSelf}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                {selectedTenant?.tenant_logo_url ? (
                  <Image
                    src={`${selectedTenant.tenant_logo_url}?v=${cacheKey}`}
                    alt={selectedTenant.tenant_name}
                    width={40}
                    height={40}
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <CardTitle className="text-base">{selectedTenant?.tenant_name}</CardTitle>
                <CardDescription className="text-xs">Acesso independente (sem parceiro)</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Parent tenant options */}
        {parents.map(rel => (
          <Card
            key={rel.rel_id}
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => handleSelect(rel)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {rel.rel_parent_tenant_logo_url ? (
                    <Image
                      src={`${rel.rel_parent_tenant_logo_url}?v=${cacheKey}`}
                      alt={rel.rel_parent_tenant_name}
                      width={40}
                      height={40}
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <Building2 className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-base">{rel.rel_parent_tenant_name}</CardTitle>
                  {rel.rel_description && (
                    <CardDescription className="text-xs">{rel.rel_description}</CardDescription>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  )
}
