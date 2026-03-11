'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { ChevronDown, Check } from 'lucide-react'

export function TenantSwitcher() {
  const { tenants } = useAuth()
  const { selectedTenant, setSelectedTenant } = useTenant()
  const router = useRouter()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 max-w-[160px]">
          <span className="truncate text-xs">{selectedTenant?.tenant_name || 'Selecionar'}</span>
          <ChevronDown size={12} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs">Trocar tenant</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tenants.map(t => (
          <DropdownMenuItem
            key={t.tenant_id}
            onClick={() => {
              setSelectedTenant(t)
              router.push('/dashboard')
            }}
            className="flex items-center justify-between"
          >
            <span className="truncate text-sm">{t.tenant_name}</span>
            {selectedTenant?.tenant_id === t.tenant_id && (
              <Check size={14} className="text-primary shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
