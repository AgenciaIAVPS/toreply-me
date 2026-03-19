'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronDown, Check } from 'lucide-react'

export function TenantSwitcher() {
  const { tenants } = useAuth()
  const { selectedTenant, setSelectedTenant } = useTenant()
  const router = useRouter()
  const [search, setSearch] = useState('')

  const showSearch = tenants.length > 5
  const filtered = showSearch
    ? tenants.filter(t => t.tenant_name.toLowerCase().includes(search.toLowerCase()))
    : tenants

  return (
    <DropdownMenu onOpenChange={open => { if (!open) setSearch('') }}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 max-w-[160px]">
          <span className="truncate text-xs">{selectedTenant?.tenant_name || 'Selecionar'}</span>
          <ChevronDown size={12} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs">Trocar tenant</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {showSearch && (
          <div className="px-2 pb-1">
            <Input
              placeholder="Pesquisar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-7 text-xs"
              onClick={e => e.stopPropagation()}
              onKeyDown={e => e.stopPropagation()}
            />
          </div>
        )}
        {filtered.map(t => (
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
        {filtered.length === 0 && (
          <div className="px-2 py-2 text-xs text-muted-foreground text-center">Nenhum resultado</div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
